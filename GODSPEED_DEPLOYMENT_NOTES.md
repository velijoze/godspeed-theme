# Godspeed Theme — Deployment & Handover Notes

This document captures the changes delivered, required environment configuration, and how to extend or operate the system going forward.

## Overview

- Backend (Cloud Run):
  - Cube Connect sync with preview/apply and Shopify‑aware diffs
  - VeloConnect registry (Firestore + Secret Manager), health checks, preview/apply
  - Job logging in Firestore and `/api/jobs` listing endpoint
- Admin (Theme, customizer‑driven):
  - Cube Sync Manager with Preview → Approve → Apply
  - VeloConnect Manager (save credentials + base URL, test, sync)
  - Jobs tab for recent runs
- Storefront polish: unified fonts/colors and spacing with theme variables
- Platform: Node 20+ and removal of client‑side Admin token usage

## One‑Time Setup

1) Cloud Run environment variables

- CUBE_TOKEN_URL=https://auth-core-cloud.cube.eu/connect/token
- CUBE_API_BASE=https://connect.cube.eu/api
- CUBE_CLIENT_ID, CUBE_CLIENT_SECRET, CUBE_API_KEY
- CUBE_ACR_VALUES=tenant:<YOUR_TENANT_GUID>
- CUBE_SCOPE=connectapi
- Optional (enables Shopify preview diffs in Cube preview):
  - SHOPIFY_SHOP=<myshop.myshopify.com>
  - SHOPIFY_ADMIN_TOKEN=<Admin API token with read_products, read_inventory>

2) IAM

- Firestore: Cloud Datastore User
- Secret Manager: Secret Manager Admin (or Secret Version Adder + Accessor if secrets pre‑created)

3) Theme setting for backend base URL

- Theme Editor → Godspeed Backend → API Base URL (no trailing slash)
- The theme injects `window.GS_API_BASE` automatically and all Admin/storefront calls use it

## Endpoints

- Cube
  - POST /api/cube/sync { mode: 'preview'|'apply', fields: [], filters: {}, options: {} }
  - GET /api/cube/status
- VeloConnect
  - GET/POST/DELETE /api/veloconnect/vendors
  - GET /api/veloconnect/health?vendorId=...
  - POST /api/veloconnect/sync
- Jobs
  - GET /api/jobs?type=cube|veloconnect&vendorId=&limit=25

## Data Model

- Firestore
  - veloconnect_vendors: { name, baseUrl, protocol, secretName, createdAt }
  - sync_jobs: { type, vendorId?, name?, mode, payload, status, counts?, result?, durationMs?, ok, startedAt, finishedAt }
- Secret Manager
  - One secret per vendor: `veloconnect-vendor-<vendorId>`; JSON credentials

## What Changed (Files)

- Backend
  - cloud-run-bookings/server.js — new Cube/VeloConnect endpoints, Shopify diffs, jobs
  - cloud-run-bookings/package.json — Node 20+, new deps
- Admin + Storefront
  - sections/cube-sync-manager.liquid — Preview → Apply via backend
  - sections/veloconnect-dynamic.liquid — vendor save/test/sync → backend, base URL editable
  - sections/admin-dashboard.liquid — Jobs tab + metrics + preview wired
  - sections/workshop-booking.liquid — uses theme API base setting
  - snippets/test-ride-modal.liquid — uses theme API base setting
  - assets/admin-actions-handler.js — uses window.GS_API_BASE
  - assets/admin-metrics-tracker.js — uses window.GS_API_BASE
  - assets/integration-monitor.js — uses window.GS_API_BASE
  - layout/theme.liquid — injects window.GS_API_BASE and font variables
  - assets/dev.css.liquid — typography/spacing polish (product/collection/cart)
  - sections/ai-chat-assistant.liquid — body font + theme colors (no hardcoded fonts)
- Theme settings
  - config/settings_schema.json — added Godspeed Backend → `gs_api_base_url`

## How to Operate

- Configure vendors in Admin → VeloConnect Dynamic; Save (credentials go to Secret Manager), Test, then Sync
- Run Cube preview/apply in Admin → Cube Sync Manager (Preview shows counts + diffs when Shopify env set)
- Review recent jobs under Admin → Jobs

## Extending

- Vendor adapters: implement vendor‑specific request/response mapping in `/api/veloconnect/sync` as you receive specs; leave Admin unchanged
- Preview detail: enhance diffs by adding more Shopify fields (title/body/specs/images) when needed
- Theme variables: if you want 100% customizer control over muted/border neutrals, add two color settings and swap remaining hexes

## Verification Checklist

- Cloud Run `/health` responds ok
- `/api/cube/status` shows `authOk: true` after env vars set
- Cube preview/apply works; Jobs tab lists the run
- Vendor save/test/sync works; credentials appear in Secret Manager
- Storefront booking/Test Ride forms submit to your configured API base

## Notes

- CORS: Backend allows frontend/Admin calls
- Security: No Admin tokens in theme; all sensitive operations are backend-only

---

Last updated: {{ 'now' | date: '%Y-%m-%d' }}
