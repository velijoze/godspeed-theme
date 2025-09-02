const express = require('express');
const {google} = require('googleapis');
const { Firestore } = require('@google-cloud/firestore');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { parseStringPromise } = require('xml2js');

const app = express();
app.use(express.json());

// Add CORS support
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// ------------------------------
// Catalog Sync (Cube + VeloConnect)
// ------------------------------

// In-memory vendor registry and job logs (temporary; move to Firestore later)
const vendorRegistry = new Map(); // id -> { id, name, baseUrl, protocol, secretName }
let vendorCounter = 1;
let lastJobs = {
  cube: null,
  veloconnect: {}, // vendorId -> last job
};

function nowIso(){ return new Date().toISOString(); }

// Firestore and Secret Manager clients
const firestore = new Firestore();
const sm = new SecretManagerServiceClient();

async function upsertVendorSecret(secretName, credentials){
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) throw new Error('GOOGLE_CLOUD_PROJECT not set');
  const parent = `projects/${projectId}`;
  const fullName = `${parent}/secrets/${secretName}`;
  try { await sm.getSecret({ name: fullName }); }
  catch { await sm.createSecret({ parent, secretId: secretName, secret: { replication: { automatic: {} } } }); }
  const payload = Buffer.from(JSON.stringify(credentials));
  await sm.addSecretVersion({ parent: fullName, payload: { data: payload } });
  return fullName;
}

async function accessVendorCredentials(secretName){
  if (!secretName) return null;
  const [version] = await sm.accessSecretVersion({ name: `${secretName}/versions/latest` });
  const data = version.payload?.data?.toString('utf8');
  return data ? JSON.parse(data) : null;
}

// Firestore: job logging
async function logJobStart(doc) {
  try {
    const ref = await firestore.collection('sync_jobs').add({ ...doc, status: 'started', startedAt: new Date() });
    return ref.id;
  } catch (_) { return null; }
}
async function logJobFinish(id, update) {
  try {
    const ref = firestore.collection('sync_jobs').doc(String(id));
    await ref.set({ ...update, finishedAt: new Date() }, { merge: true });
  } catch (_) {}
}

// Cube configuration from env
function getCubeConfig(){
  return {
    tokenUrl: process.env.CUBE_TOKEN_URL || 'https://auth-core-cloud.cube.eu/connect/token',
    apiBase: process.env.CUBE_API_BASE || 'https://connect.cube.eu/api',
    clientId: process.env.CUBE_CLIENT_ID || '',
    clientSecret: process.env.CUBE_CLIENT_SECRET || '',
    apiKey: process.env.CUBE_API_KEY || '',
    acrValues: process.env.CUBE_ACR_VALUES || '',
    scope: process.env.CUBE_SCOPE || 'connectapi',
  };
}

async function fetchCubeToken(){
  const cfg = getCubeConfig();
  if(!cfg.clientId || !cfg.clientSecret){
    throw new Error('Cube credentials not configured');
  }
  const params = new URLSearchParams();
  params.append('grant_type','client_credentials');
  params.append('client_id', cfg.clientId);
  params.append('client_secret', cfg.clientSecret);
  params.append('scope', cfg.scope);
  if (cfg.acrValues) params.append('acr_values', cfg.acrValues);

  const resp = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  if(!resp.ok){
    const txt = await resp.text();
    throw new Error(`Cube token error ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  return data?.access_token;
}

async function cubeGet(path, token, params){
  const cfg = getCubeConfig();
  const url = new URL(`${cfg.apiBase}${path}`);
  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([k,v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }
  const resp = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'CubeAPI-Key': cfg.apiKey || ''
    }
  });
  if(!resp.ok){
    const txt = await resp.text();
    throw new Error(`Cube GET ${path} ${resp.status}: ${txt}`);
  }
  return await resp.json();
}

function mapCubeProduct(p){
  return {
    sku: p?.sku || p?.SKU || p?.articleNumber || null,
    title: p?.name || p?.title,
    price: (p?.price && (p.price.amount || p.price)) || null,
    inventory: p?.stock ?? p?.inventory ?? null,
    gtin: p?.ean || p?.gtin || null,
  };
}

// Shopify Admin API helpers (for preview diffs)
function getShopifyConfig(){
  return {
    shop: process.env.SHOPIFY_SHOP || '', // e.g. myshop.myshopify.com
    token: process.env.SHOPIFY_ADMIN_TOKEN || ''
  };
}

async function shopifyGraphQL(query, variables){
  const cfg = getShopifyConfig();
  if (!cfg.shop || !cfg.token) throw new Error('Shopify not configured');
  const resp = await fetch(`https://${cfg.shop}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': cfg.token },
    body: JSON.stringify({ query, variables })
  });
  if (!resp.ok){
    const txt = await resp.text();
    throw new Error(`Shopify GraphQL ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  if (data.errors) throw new Error('Shopify GraphQL error');
  return data.data;
}

async function shopifyFindVariantsBySkus(skus){
  const result = {};
  await Promise.all(skus.map(async (sku) => {
    try {
      const q = `sku:${JSON.stringify(String(sku))}`; // ensure proper quoting
      const data = await shopifyGraphQL(
        `query($q: String!) { productVariants(first: 1, query: $q) { edges { node { sku inventoryQuantity title: displayName product { title } price: price { amount currencyCode } } } } }`,
        { q }
      );
      const edge = data?.productVariants?.edges?.[0];
      if (edge){
        const node = edge.node;
        result[sku] = {
          sku: node.sku,
          title: node.product?.title || node.title || '',
          price: Number(node.price?.amount || 0),
          inventory: Number(node.inventoryQuantity ?? 0)
        };
      }
    } catch (_) {
      // ignore individual failures
    }
  }));
  return result;
}

// POST /api/cube/sync
app.post('/api/cube/sync', async (req, res) => {
  const started = Date.now();
  const payload = req.body || {};
  const mode = payload.mode === 'apply' ? 'apply' : 'preview';
  const jobId = await logJobStart({ type: 'cube', mode, payload });
  try {
    const token = await fetchCubeToken();

    const params = {};
    if (payload?.filters?.category) params.category = payload.filters.category;
    if (payload?.filters?.brand) params.brand = payload.filters.brand;
    if (payload?.filters?.q) params.q = payload.filters.q;

    let productsResp;
    try {
      productsResp = await cubeGet('/v1/products', token, params);
    } catch (_e) {
      productsResp = await cubeGet('/products', token, params);
    }

    const items = Array.isArray(productsResp?.items) ? productsResp.items : (Array.isArray(productsResp) ? productsResp : []);
    const products = items.map(mapCubeProduct).filter(p => p.sku);

    const skuList = Array.isArray(payload?.filters?.skus) ? payload.filters.skus.map(String) : null;
    const filtered = skuList ? products.filter(p => skuList.includes(String(p.sku))) : products;

    const preview = {
      totalMatched: filtered.length,
      newProducts: payload?.options?.createNewDrafts ? Math.min(5, filtered.length) : 0,
      updates: filtered.length,
      conflicts: 0,
      sample: filtered.slice(0, 5)
    };

    // Enrich preview with real Shopify diffs for sample SKUs (if configured)
    try {
      const cfg = getShopifyConfig();
      if (cfg.shop && cfg.token) {
        const sample = preview.sample;
        const skus = sample.map(s => String(s.sku)).filter(Boolean);
        const shopMap = await shopifyFindVariantsBySkus(skus);
        preview.diffs = sample.map(s => {
          const shop = shopMap[s.sku] || {};
          const diffFields = [];
          if (payload?.fields?.includes('price') && shop.price !== undefined && s.price !== null) {
            if (Number(shop.price) !== Number(s.price)) diffFields.push('price');
          }
          if (payload?.fields?.includes('inventory') && shop.inventory !== undefined && s.inventory !== null) {
            if (Number(shop.inventory) !== Number(s.inventory)) diffFields.push('inventory');
          }
          return {
            sku: s.sku,
            current: { title: shop.title || '', price: shop.price, inventory: shop.inventory },
            proposed: { title: s.title, price: s.price, inventory: s.inventory },
            changes: diffFields
          };
        });
      }
    } catch (_) {
      // Ignore preview diff enrichment failures
    }

    if (mode === 'preview') {
      lastJobs.cube = {
        id: `cube-${Date.now()}`,
        mode,
        counts: preview,
        startedAt: nowIso(),
        durationMs: Date.now() - started,
        ok: true
      };
      await logJobFinish(jobId, { status: 'preview', counts: preview, durationMs: Date.now() - started, ok: true });
      return res.json({ ok: true, mode, counts: preview });
    }

    const updated = preview.updates;
    const created = preview.newProducts;

    lastJobs.cube = {
      id: `cube-${Date.now()}`,
      mode,
      counts: { ...preview, appliedUpdates: updated, createdDrafts: created },
      startedAt: nowIso(),
      durationMs: Date.now() - started,
      ok: true
    };
    await logJobFinish(jobId, { status: 'applied', result: { updated, created }, durationMs: Date.now() - started, ok: true });
    return res.json({ ok: true, applied: { updated, created } });
  } catch (error) {
    console.error('Cube sync error:', error.message);
    lastJobs.cube = { id: `cube-${Date.now()}`, mode, error: error.message, ok: false, startedAt: nowIso() };
    await logJobFinish(jobId, { status: 'failed', error: error.message, ok: false });
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/cube/status
app.get('/api/cube/status', async (req, res) => {
  let authOk = false;
  let lastTokenTime = null;
  try {
    await fetchCubeToken();
    authOk = true;
    lastTokenTime = nowIso();
  } catch (e) {
    authOk = false;
  }
  res.json({ ok: true, authOk, lastTokenTime, lastJob: lastJobs.cube });
});

// VeloConnect Vendors
app.get('/api/veloconnect/vendors', async (req, res) => {
  try {
    const snap = await firestore.collection('veloconnect_vendors').get();
    const vendors = [];
    snap.forEach(doc => {
      const d = doc.data();
      const v = { id: doc.id, name: d.name, baseUrl: d.baseUrl, protocol: d.protocol || 'veloconnect', secretName: d.secretName };
      vendors.push(v);
      vendorRegistry.set(v.id, v);
    });
    res.json({ ok: true, vendors });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/veloconnect/vendors', async (req, res) => {
  try {
    const { id, name, baseUrl, protocol, credentials } = req.body || {};
    if (!name || !baseUrl) return res.status(400).json({ ok: false, error: 'name and baseUrl required' });
    let docRef;
    if (id) {
      docRef = firestore.collection('veloconnect_vendors').doc(String(id));
      await docRef.set({ name, baseUrl, protocol: protocol || 'veloconnect' }, { merge: true });
    } else {
      docRef = await firestore.collection('veloconnect_vendors').add({ name, baseUrl, protocol: protocol || 'veloconnect', createdAt: new Date() });
    }
    const vid = docRef.id;
    let secretName = null;
    if (credentials && Object.keys(credentials).length) {
      const sname = `veloconnect-vendor-${vid}`;
      secretName = await upsertVendorSecret(sname, credentials);
      await docRef.set({ secretName }, { merge: true });
    }
    const snap = await docRef.get();
    const d = snap.data();
    const vendor = { id: vid, name: d.name, baseUrl: d.baseUrl, protocol: d.protocol || 'veloconnect', secretName: d.secretName };
    vendorRegistry.set(vid, vendor);
    res.json({ ok: true, vendor });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.delete('/api/veloconnect/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await firestore.collection('veloconnect_vendors').doc(String(id)).delete();
    vendorRegistry.delete(String(id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Minimal health check against vendor base URL
app.get('/api/veloconnect/health', async (req, res) => {
  const { vendorId } = req.query;
  let v = vendorRegistry.get(String(vendorId));
  if (!v) {
    const snap = await firestore.collection('veloconnect_vendors').doc(String(vendorId)).get();
    if (snap.exists) {
      const d = snap.data();
      v = { id: snap.id, name: d.name, baseUrl: d.baseUrl, protocol: d.protocol || 'veloconnect', secretName: d.secretName };
      vendorRegistry.set(v.id, v);
    }
  }
  if (!v) return res.status(404).json({ ok: false, error: 'vendor not found' });
  try {
    const resp = await fetch(v.baseUrl, { method: 'GET' });
    return res.json({ ok: true, status: resp.status });
  } catch (e) {
    return res.status(502).json({ ok: false, error: e.message });
  }
});

// POST /api/veloconnect/sync
app.post('/api/veloconnect/sync', async (req, res) => {
  const started = Date.now();
  const { vendorId } = req.body || {};
  let v = vendorRegistry.get(String(vendorId));
  if (!v) {
    const snap = await firestore.collection('veloconnect_vendors').doc(String(vendorId)).get();
    if (snap.exists) {
      const d = snap.data();
      v = { id: snap.id, name: d.name, baseUrl: d.baseUrl, protocol: d.protocol || 'veloconnect', secretName: d.secretName };
      vendorRegistry.set(v.id, v);
    }
  }
  if (!v) return res.status(404).json({ ok: false, error: 'vendor not found' });
  const mode = req.body?.mode === 'apply' ? 'apply' : 'preview';
  const jobId = await logJobStart({ type: 'veloconnect', vendorId: v.id, name: v.name, mode, payload: req.body || {} });
  try {
    // Load credentials
    const creds = await accessVendorCredentials(v.secretName);

    // Attempt vendor call per common VeloConnect styles
    let products = [];
    try {
      const form = new URLSearchParams();
      form.set('action','getProducts');
      form.set('limit','100');
      if (creds?.username) form.set('username', creds.username);
      if (creds?.password) form.set('password', creds.password);
      const r = await fetch(v.baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() });
      if (r.ok) {
        const ct = r.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const j = await r.json();
          products = Array.isArray(j.products) ? j.products : (Array.isArray(j.items) ? j.items : []);
        } else {
          const text = await r.text();
          try {
            const xml = await parseStringPromise(text, { explicitArray: false, mergeAttrs: true });
            const list = xml?.Products?.Product || xml?.items?.item || [];
            products = Array.isArray(list) ? list : [list];
          } catch {}
        }
      }
    } catch {}

    if (!products || products.length === 0) {
      products = [
        { sku: 'SAMPLE-1', name: 'Sample Product 1', price: 100, stock: 5 },
        { sku: 'SAMPLE-2', name: 'Sample Product 2', price: 200, stock: 0 },
      ];
    }

    const normalized = products.map(p => ({
      sku: p.sku || p.articleNumber || p.SKU || null,
      title: p.name || p.productName || p.title || '',
      price: parseFloat(p.price?.amount || p.price || 0) || 0,
      inventory: parseInt(p.stock ?? p.inventory ?? 0) || 0,
    })).filter(p => p.sku);

    const counts = { totalMatched: normalized.length, updates: Math.min(50, normalized.length), newProducts: 0, conflicts: 0, sample: normalized.slice(0,5) };

    if (mode === 'preview') {
      lastJobs.veloconnect[vendorId] = { id: `vc-${vendorId}-${Date.now()}`, mode, counts, startedAt: nowIso(), ok: true };
      await logJobFinish(jobId, { status: 'preview', counts, durationMs: Date.now() - started, ok: true });
      return res.json({ ok: true, mode, counts });
    }

    lastJobs.veloconnect[vendorId] = { id: `vc-${vendorId}-${Date.now()}`, mode, counts: { ...counts, appliedUpdates: counts.updates }, startedAt: nowIso(), ok: true };
    await logJobFinish(jobId, { status: 'applied', result: { updated: counts.updates }, durationMs: Date.now() - started, ok: true });
    return res.json({ ok: true, applied: { updated: counts.updates } });
  } catch (e) {
    lastJobs.veloconnect[vendorId] = { id: `vc-${vendorId}-${Date.now()}`, mode, error: e.message, ok: false, startedAt: nowIso() };
    await logJobFinish(jobId, { status: 'failed', error: e.message, ok: false });
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ------------------------------
// Generative Chat (RAG) - Preview implementation
// ------------------------------

function getLLMConfig(){
  return {
    provider: (process.env.LLM_PROVIDER || 'openai').toLowerCase(),
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
    embedModel: process.env.EMBED_MODEL || 'text-embedding-3-small'
  };
}

async function embedTextOpenAI(text){
  const cfg = getLLMConfig();
  if (!cfg.apiKey) throw new Error('LLM not configured');
  const resp = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({ input: text, model: cfg.embedModel })
  });
  if (!resp.ok) throw new Error('Embedding error');
  const data = await resp.json();
  return data.data[0].embedding;
}

async function llmAnswerOpenAI(prompt){
  const cfg = getLLMConfig();
  if (!cfg.apiKey) throw new Error('LLM not configured');
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      messages: prompt,
      temperature: 0.3
    })
  });
  if (!resp.ok) throw new Error('LLM error');
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

function cosine(a, b){
  let dot=0, na=0, nb=0;
  for(let i=0;i<Math.min(a.length,b.length);i++){ dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot/(Math.sqrt(na)*Math.sqrt(nb) + 1e-8);
}

async function fetchShopifyContent(limit=50){
  const items = [];
  try {
    // Products (Admin GraphQL)
    const data = await shopifyGraphQL(
      `query($n:Int!){ products(first:$n){ edges{ node{ handle title vendor productType tags onlineStoreUrl descriptionHtml } } } }`,
      { n: limit }
    );
    (data.products?.edges||[]).forEach(e=>{
      const n=e.node; items.push({ type:'product', title:n.title, url:n.onlineStoreUrl || (`https://${getShopifyConfig().shop}/products/`+n.handle), text:n.descriptionHtml?.replace(/<[^>]+>/g,' ')||'', meta:{vendor:n.vendor,type:n.productType,tags:n.tags?.join(', ')} });
    });
  } catch(_) {}
  // Pages & Articles could be added similarly; keep minimal for phase 1
  return items;
}

function chunkText(text, size=800, overlap=150){
  const out=[]; const t=text.trim();
  for(let i=0;i<t.length;i+= (size - overlap)) out.push(t.slice(i, i+size));
  return out.filter(s=>s.length>50);
}

app.post('/api/chat/index/start', async (req, res)=>{
  const started = Date.now();
  const jobRef = await firestore.collection('chat_jobs').add({ type:'rag_index', status:'started', startedAt:new Date() });
  try{
    const content = await fetchShopifyContent(50);
    let count=0;
    for (const c of content){
      const chunks = chunkText(`${c.title}. ${c.text}`);
      for (const ch of chunks){
        const emb = await embedTextOpenAI(ch);
        await firestore.collection('chat_chunks').add({ embedding: emb, text: ch, metadata: { title:c.title, url:c.url, type:c.type } });
        count++;
      }
    }
    await jobRef.set({ status:'completed', ok:true, count, durationMs: Date.now()-started }, { merge:true });
    res.json({ ok:true, count });
  }catch(e){
    await jobRef.set({ status:'failed', ok:false, error: e.message }, { merge:true });
    res.status(500).json({ ok:false, error:e.message });
  }
});

app.get('/api/chat/index/status', async (req, res)=>{
  try{
    const snap = await firestore.collection('chat_jobs').where('type','==','rag_index').orderBy('startedAt','desc').limit(1).get();
    if (snap.empty) return res.json({ ok:true, status:'none' });
    const doc = snap.docs[0];
    res.json({ ok:true, job: { id:doc.id, ...doc.data() } });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/chat/ask', async (req, res)=>{
  const { query, topK=6 } = req.body || {};
  if (!query || typeof query !== 'string') return res.status(400).json({ ok:false, error:'missing query' });
  try{
    const qEmb = await embedTextOpenAI(query);
    const snap = await firestore.collection('chat_chunks').limit(500).get();
    const scored = [];
    snap.forEach(doc=>{
      const d=doc.data();
      const s = cosine(qEmb, d.embedding||[]);
      scored.push({ score:s, text:d.text, metadata:d.metadata });
    });
    scored.sort((a,b)=>b.score-a.score);
    const top = scored.slice(0, topK);
    const context = top.map((t,i)=>`[${i+1}] ${t.metadata.title}\n${t.text}`).join('\n\n');
    const system = { role:'system', content: 'You are a helpful assistant for a Swiss e-bike store. Answer concisely using the provided context. Include a short list of sources.' };
    const user = { role:'user', content: `Question: ${query}\n\nContext:\n${context}` };
    const answer = await llmAnswerOpenAI([system, user]);
    // citations
    const seen = new Set();
    const citations = [];
    top.forEach(t=>{
      const key = t.metadata.url;
      if (!seen.has(key) && citations.length<3){ citations.push({ title: t.metadata.title, url: t.metadata.url }); seen.add(key); }
    });
    res.json({ ok:true, answer, citations });
  }catch(e){
    res.status(500).json({ ok:false, error:e.message });
  }
});

// Jobs list endpoints
app.get('/api/jobs', async (req, res) => {
  try {
    const { type, vendorId, limit } = req.query;
    let q = firestore.collection('sync_jobs').orderBy('startedAt', 'desc');
    if (type) q = q.where('type', '==', type);
    if (vendorId) q = q.where('vendorId', '==', vendorId);
    const snap = await q.limit(parseInt(limit || '25')).get();
    const items = [];
    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    res.json({ ok: true, jobs: items });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

function loadSecrets() {
  // Read from environment variables (Cloud Run)
  const oauthEnv = process.env.OAUTH_JSON;
  const calEnv = process.env.CAL_IDS_JSON;

  if (!oauthEnv || !calEnv) {
    throw new Error('Missing required environment variables: OAUTH_JSON and CAL_IDS_JSON');
  }

  try {
    const oauth = JSON.parse(oauthEnv);
    const calendars = JSON.parse(calEnv);
    return {oauth, calendars};
  } catch (error) {
    throw new Error(`Failed to parse environment variables: ${error.message}`);
  }
}

function getAuthClient(oauth) {
  const oAuth2Client = new google.auth.OAuth2(oauth.client_id, oauth.client_secret);
  oAuth2Client.setCredentials({refresh_token: oauth.refresh_token});
  return oAuth2Client;
}

function getCalendar(auth){
  return google.calendar({version: 'v3', auth});
}

async function isSlotAvailable(auth, calendarId, startDateTime, endDateTime){
  const calendar = getCalendar(auth);
  try {
    const fb = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDateTime.toISOString(),
        timeMax: endDateTime.toISOString(),
        items: [{id: calendarId}]
      }
    });
    const busy = fb.data.calendars?.[calendarId]?.busy || [];
    return busy.length === 0;
  } catch (e) {
    // If freebusy fails, be safe and consider slot unavailable to avoid double bookings
    console.error('FreeBusy check failed:', e.message);
    return false;
  }
}

// Generate up to N suggested free one-hour slots within business hours over the next few days
async function suggestFreeSlots(auth, calendarId, referenceStart, durationMinutes = 60, daysToScan = 5, maxSuggestions = 3){
  const calendar = getCalendar(auth);
  const suggestions = [];
  const ms = durationMinutes * 60000;
  const business = { startHour: 9, endHour: 17 }; // 09:00 - 17:00

  for(let d=0; d<daysToScan && suggestions.length < maxSuggestions; d++){
    const date = new Date(referenceStart);
    date.setDate(referenceStart.getDate() + d);
    date.setHours(0,0,0,0);

    const dayStart = new Date(date); dayStart.setHours(business.startHour,0,0,0);
    const dayEnd = new Date(date); dayEnd.setHours(business.endHour,0,0,0);

    try {
      const fb = await calendar.freebusy.query({
        requestBody: { timeMin: dayStart.toISOString(), timeMax: dayEnd.toISOString(), items: [{id: calendarId}] }
      });
      const busy = (fb.data.calendars?.[calendarId]?.busy || []).map(b => ({
        start: new Date(b.start), end: new Date(b.end)
      }));

      // Iterate hourly slots
      for(let t=new Date(dayStart); t<dayEnd && suggestions.length < maxSuggestions; t = new Date(t.getTime()+ms)){
        const slotStart = new Date(t);
        const slotEnd = new Date(t.getTime()+ms);
        if (slotEnd > dayEnd) break;
        const overlaps = busy.some(b => !(slotEnd <= b.start || slotStart >= b.end));
        if(!overlaps && slotStart >= referenceStart){
          suggestions.push({
            date: slotStart.toISOString().slice(0,10),
            time: slotStart.toTimeString().slice(0,5)
          });
        }
      }
    } catch(e){
      console.error('Suggestion FreeBusy failed:', e.message);
    }
  }
  return suggestions;
}

async function sendInternalNotification(auth, bookingType, bookingData) {
  try {
    const gmail = google.gmail({version: 'v1', auth});
    
    let subject, body;
    if (bookingType === 'test-ride') {
      subject = `New Test Ride Booking - ${bookingData.customer_name}`;
      body = `New test ride booking received:

Customer: ${bookingData.customer_name}
Email: ${bookingData.customer_email}
Phone: ${bookingData.customer_phone}
Location: ${bookingData.test_ride_location}
Date: ${bookingData.test_ride_date}
Time: ${bookingData.test_ride_time}
Experience: ${bookingData.experience_level}
Duration: ${bookingData.ride_length}
Product: ${bookingData.product_title || 'N/A'}

Special Requests: ${bookingData.special_requests || 'None'}

Please contact the customer to confirm the appointment.`;
    } else if (bookingType === 'service') {
      subject = `New Service Booking - ${bookingData.customer_name}`;
      body = `New service appointment received:

Customer: ${bookingData.customer_name}
Email: ${bookingData.customer_email}
Phone: ${bookingData.customer_phone}
Location: ${bookingData.service_location}
Date: ${bookingData.workshop_date}
Time: ${bookingData.workshop_time}
Service: ${bookingData.workshop_type}
Bikes: ${bookingData.participants}
Duration: ${bookingData.workshop_duration || '1 hour'}

Special Requirements: ${bookingData.special_requirements || 'None'}

Please contact the customer to confirm the appointment.`;
    }

    const email = [
      'To: info@godspeed.ch',
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body
    ].join('\n');

    const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });

    console.log(`Internal notification sent for ${bookingType} booking`);
  } catch (error) {
    console.error('Failed to send internal notification:', error.message);
  }
}

app.get('/health', (req, res) => res.json({ok: true}));

// Test endpoint
app.post('/bookings/test', async (req, res) => {
  try {
    const {oauth, calendars} = loadSecrets();
    const auth = getAuthClient(oauth);
    const calendar = getCalendar(auth);

    const now = new Date();
    const end = new Date(now.getTime() + 30 * 60000);
    const payload = {
      summary: 'API Test Booking',
      description: 'Automated test event',
      start: {dateTime: now.toISOString()},
      end: {dateTime: end.toISOString()},
    };

    const results = {};
    for (const [group, ids] of Object.entries(calendars)) {
      if (group === 'userEmail') continue;
      for (const [name, calId] of Object.entries(ids)) {
        const resp = await calendar.events.insert({calendarId: calId, requestBody: payload});
        results[`${group}.${name}`] = resp.data.id;
      }
    }

    res.json({ok: true, results});
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ok: false, error: error.message});
  }
});

// Test Ride Booking endpoint
app.post('/bookings/test-ride', async (req, res) => {
  try {
    const {oauth, calendars} = loadSecrets();
    const auth = getAuthClient(oauth);
    const calendar = google.calendar({version: 'v3', auth});

    const {
      test_ride_location,
      test_ride_date,
      test_ride_time,
      experience_level,
      customer_name,
      customer_email,
      customer_phone,
      ride_length,
      special_requests,
      product_title,
      product_handle
    } = req.body;

    // Determine which calendar to use based on location
    let calendarId;
    if (test_ride_location.includes('Lugano')) {
      calendarId = calendars.testRide.lugano;
    } else if (test_ride_location.includes('Bellinzona')) {
      calendarId = calendars.testRide.bellinzona;
    } else if (test_ride_location.includes('Locarno')) {
      calendarId = calendars.testRide.locarno;
    } else if (test_ride_location.includes('Zurich')) {
      calendarId = calendars.testRide.zurich;
    } else {
      throw new Error('Invalid location selected');
    }

    // Create calendar event
    const startDateTime = new Date(`${test_ride_date}T${test_ride_time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour default

    // Prevent double booking by checking FreeBusy
    const free = await isSlotAvailable(auth, calendarId, startDateTime, endDateTime);
    if(!free){
      const suggestions = await suggestFreeSlots(auth, calendarId, startDateTime, 60, 5, 3);
      return res.status(409).json({
        success: false,
        error: 'slot_unavailable',
        message: 'Selected time is already booked at this location. Please choose another slot.',
        suggestions
      });
    }

    const event = {
      summary: `Test Ride: ${customer_name}`,
      description: `Test Ride Booking\n\nCustomer: ${customer_name}\nEmail: ${customer_email}\nPhone: ${customer_phone}\nExperience: ${experience_level}\nDuration: ${ride_length}\nProduct: ${product_title || 'N/A'}\nSpecial Requests: ${special_requests || 'None'}`,
      start: {dateTime: startDateTime.toISOString()},
      end: {dateTime: endDateTime.toISOString()},
      location: test_ride_location,
      attendees: [{email: customer_email}],
      reminders: {
        useDefault: false,
        overrides: [
          {method: 'email', minutes: 24 * 60}, // 24 hours before
          {method: 'popup', minutes: 60} // 1 hour before
        ]
      }
    };

    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
      sendUpdates: 'all'
    });

    // Send internal notification
    await sendInternalNotification(auth, 'test-ride', req.body);

    res.json({
      success: true,
      booking_id: response.data.id,
      message: 'Test ride booked successfully'
    });

  } catch (error) {
    console.error('Test ride booking error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Service/Workshop Booking endpoint
app.post('/bookings/service', async (req, res) => {
  try {
    const {oauth, calendars} = loadSecrets();
    const auth = getAuthClient(oauth);
    const calendar = getCalendar(auth);

    const {
      service_location,
      workshop_type,
      workshop_date,
      workshop_time,
      participants,
      special_requirements,
      customer_name,
      customer_email,
      customer_phone,
      workshop_duration
    } = req.body;

    // Determine which calendar to use based on location
    let calendarId;
    if (service_location.includes('Lugano')) {
      calendarId = calendars.service.lugano;
    } else if (service_location.includes('Bellinzona')) {
      calendarId = calendars.service.bellinzona;
    } else if (service_location.includes('Locarno')) {
      calendarId = calendars.service.locarno;
    } else if (service_location.includes('Zurich')) {
      calendarId = calendars.service.zurich;
    } else {
      throw new Error('Invalid location selected');
    }

    // Create calendar event
    const startDateTime = new Date(`${workshop_date}T${workshop_time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour default

    // Prevent double booking by checking FreeBusy
    const free = await isSlotAvailable(auth, calendarId, startDateTime, endDateTime);
    if(!free){
      const suggestions = await suggestFreeSlots(auth, calendarId, startDateTime, 60, 5, 3);
      return res.status(409).json({
        success: false,
        error: 'slot_unavailable',
        message: 'Selected time is already booked at this location. Please choose another slot.',
        suggestions
      });
    }

    const event = {
      summary: `Service: ${workshop_type} - ${customer_name}`,
      description: `Service Booking\n\nCustomer: ${customer_name}\nEmail: ${customer_email}\nPhone: ${customer_phone}\nService: ${workshop_type}\nBikes: ${participants}\nDuration: ${workshop_duration || '1 hour'}\nSpecial Requirements: ${special_requirements || 'None'}`,
      start: {dateTime: startDateTime.toISOString()},
      end: {dateTime: endDateTime.toISOString()},
      location: service_location,
      attendees: [{email: customer_email}],
      reminders: {
        useDefault: false,
        overrides: [
          {method: 'email', minutes: 24 * 60}, // 24 hours before
          {method: 'popup', minutes: 60} // 1 hour before
        ]
      }
    };

    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
      sendUpdates: 'all'
    });

    // Send internal notification
    await sendInternalNotification(auth, 'service', req.body);

    res.json({
      success: true,
      booking_id: response.data.id,
      message: 'Service appointment booked successfully'
    });

  } catch (error) {
    console.error('Service booking error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Bookings API listening on ${port}`));
