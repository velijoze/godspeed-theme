/* Godspeed Compare - lightweight compare for up to 3 products (client-side) */
(function(){
  var STORAGE_KEY = 'godspeed_compare_list';
  var MAX = 3;

  function load(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); } catch(_) { return []; }
  }
  function save(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
  function normalize(p){
    return { handle: p.handle, url: p.url || ('/products/' + p.handle), title: p.title, image: p.image, price: p.price };
  }
  function fetchProduct(handle){
    return fetch('/products/' + handle + '.js').then(function(r){ if(!r.ok) throw new Error('nf'); return r.json(); });
  }
  function renderDrawer(){
    var list = load();
    var root = document.getElementById('gs-compare-drawer');
    if (!root) return;
    var html = list.map(function(p){
      return '<div class="gs-compare-item" data-handle="'+p.handle+'">\
        <img src="'+(p.image||'')+'" alt="'+(p.title||'')+'">\
        <div class="gs-compare-meta">\
          <div class="gs-compare-title">'+(p.title||p.handle)+'</div>\
          <div class="gs-compare-price">'+(p.price||'')+'</div>\
        </div>\
        <button class="gs-compare-remove" aria-label="Remove" data-handle="'+p.handle+'">×</button>\
      </div>';
    }).join('');
    var itemsEl = root.querySelector('.gs-compare-items');
    if (itemsEl) itemsEl.innerHTML = html || '<div class="gs-compare-empty">No products selected</div>';
    var btn = root.querySelector('.gs-compare-btn');
    if (btn) btn.disabled = list.length < 2;
  }
  function openModal(){
    var list = load();
    if (list.length < 2) return;
    var modal = document.getElementById('gs-compare-modal');
    if (!modal) return;
    var tbody = modal.querySelector('tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5">Loading…</td></tr>';
    modal.style.display = 'block';
    Promise.all(list.map(function(p){ return fetchProduct(p.handle); })).then(function(details){
      function row(label, values){
        return '<tr><th>'+label+'</th>'+values.map(function(v){ return '<td>'+(v||'-')+'</td>'; }).join('')+'</tr>';
      }
      var rows = [];
      rows.push(row('Title', details.map(function(d){ return d.title; })));
      rows.push(row('Price', list.map(function(p){ return p.price || ''; })));
      rows.push(row('Vendor', details.map(function(d){ return d.vendor||''; })));
      rows.push(row('Type', details.map(function(d){ return d.type||''; })));
      rows.push(row('Tags', details.map(function(d){ return (d.tags||[]).join(', '); })));
      rows.push(row('Options', details.map(function(d){ return (d.options||[]).length; })));
      rows.push(row('Weight', details.map(function(d){ var g=(d.variants&&d.variants[0]&&d.variants[0].grams)||0; return g? (g/1000)+' kg' : ''; })));
      if (tbody) tbody.innerHTML = rows.join('');
    }).catch(function(){ if (tbody) tbody.innerHTML = '<tr><td colspan="5">Failed to load comparison</td></tr>'; });
  }
  function closeModal(){ var modal = document.getElementById('gs-compare-modal'); if (modal) modal.style.display = 'none'; }
  function add(p){
    var list = load();
    var item = normalize(p);
    if (!item.handle) return;
    if (list.some(function(x){ return x.handle===item.handle; })) return renderDrawer();
    if (list.length >= MAX) list.shift();
    list.push(item); save(list); renderDrawer();
  }
  function remove(handle){ var list = load().filter(function(p){ return p.handle!==handle; }); save(list); renderDrawer(); }
  function bind(){
    var root = document.getElementById('gs-compare-drawer'); if (!root) return;
    root.addEventListener('click', function(e){
      var rm = e.target.closest('.gs-compare-remove'); if (rm) remove(rm.dataset.handle);
      if (e.target.closest('.gs-compare-btn')) openModal();
    });
    var modal = document.getElementById('gs-compare-modal');
    if (modal) modal.addEventListener('click', function(e){ if (e.target.classList.contains('gs-modal-close') || e.target.id==='gs-compare-modal') closeModal(); });
  }
  window.GSCompare = { addFromButton: function(btn){ var d=btn.dataset; add({ handle:d.handle,url:d.url,title:d.title,image:d.image,price:d.price }); }, add:add, remove:remove, open:openModal };
  document.addEventListener('DOMContentLoaded', function(){ bind(); renderDrawer(); });
})();

