Title: Typography Migration Handoff

Overview
- Migrated theme from legacy Google Fonts fields to Shopify `font_picker` settings.
- Removed hardcoded fonts and legacy conditionals; fonts now load via `font_face` and apply through CSS variables `--font-body`, `--font-heading`, `--font-nav`.

Key Changes
- Schema: Replaced “Fonts” with “Typography” (three pickers: heading, body, navigation) with defaults to `helvetica_n4`.
- Loading: `snippets/engo-header-fonts.liquid` emits `font_face` for selected fonts.
- Variables: `layout/theme.liquid` defines CSS variables; all UI uses them.
- Cleanup: Removed orphan Liquid tags and legacy `@font-face` for SofiaPro.
- Visual: Fixed “Our Stores” image grid alignment (equal height tiles via object-fit: cover).

Files to Check
- config/settings_schema.json:435 — Typography group with three `font_picker` settings.
- snippets/engo-header-fonts.liquid — font_face usage for selected fonts.
- layout/theme.liquid — CSS variables for fonts in head.
- assets/dev.css.liquid — global overrides + store grid alignment.

Known Shopify Sync Issues Encountered (and fixes)
- Invalid or missing defaults for `font_picker` → Resolved by using valid handles (`helvetica_n4`).
- Orphan `{% endif %}` remnants in CSS → Removed all in `assets/engo-customizes.css.liquid`.
- Store-side settings incompatible with new schema (stored family names like `Karla`, `Arial`) → Update `config/settings_data.json` so any `heading_font`/`body_font`/`navigation_font` values are valid handles (e.g., `helvetica_n4`, `inter_n4`, `karla_n4`).

Latest Sync Log Excerpt
- 07:58:21 PM:
  - Received theme files from GitHub
  - Files fetched
  - Error: config/settings_schema.json, Validation failed: New schema is incompatible with the current setting value. 'Karla' is not a valid font handle. New schema is incompatible with the current setting value. 'Arial' is not a valid font handle
  - 0 succeeded, 0 warnings, 1 failed
  - Theme updated!

Action Items
- Ensure the GitHub‑connected theme is reset to the latest commit (Shopify Themes → Reset to latest commit).
- If the above error persists, normalize `config/settings_data.json` by replacing any `heading_font`, `body_font`, `navigation_font` values that are plain names (e.g., `Karla`, `Arial`) with valid handles (e.g., `karla_n4`, `arial_n4`, or `helvetica_n4`).
- Open Customize and verify the “Typography” group appears; hard refresh or duplicate the theme if needed to refresh schema.

Notes
- If you want specific defaults (e.g., Inter), provide the exact handles (e.g., `inter_n4`) and update both `settings_schema.json` defaults and `settings_data.json` values to match.

Validation Checklist
- Schema renders: Open Customize → Settings → Typography shows three pickers.
- Handles valid: `config/settings_data.json` uses valid `*_font` handles, not plain names.
- Fonts load: `snippets/engo-header-fonts.liquid` outputs `@font-face` rules.
- Variables apply: Body, headings, and nav show distinct fonts when changed.
- No legacy links: No `<link href="https://fonts.googleapis.com...">` remains anywhere.
- Performance: `font_display: 'swap'` present for all `font_face` calls.

Font Handle Reference
- Use Shopify’s `font_picker` handles (not raw names). Example handles used here: `helvetica_n4`, `assistant_n4`, `inter_n4`.
- To change defaults: update at both locations below, then reset theme to latest commit.
  - config/settings_schema.json:441
  - config/settings_data.json:62

Audit & Refactor Guide
- Replace any hardcoded `font-family` with CSS variables:
  - assets/dev.css.liquid:2
  - assets/dev.css.liquid:3
  - assets/dev.css.liquid:5
  - layout/theme.liquid:48
  - layout/theme.liquid:52
  - layout/theme.liquid:53
- Ensure `:root` exposes families from the pickers:
  - layout/theme.liquid:43
  - layout/theme.liquid:44
  - layout/theme.liquid:45
- Font-face emission via picker:
  - snippets/engo-header-fonts.liquid:5
  - snippets/engo-header-fonts.liquid:8
  - snippets/engo-header-fonts.liquid:11

Add New Fonts
- Prefer using Customize → Typography to select the new font; this guarantees a valid handle.
- If you must set defaults in code, choose a valid handle for the family/weight you want and update:
  - config/settings_schema.json:441 (heading), 447 (body), 453 (nav)
  - config/settings_data.json:62 (heading), 63 (body), 64 (nav)
- Do not add manual `@font-face` or external `<link>` tags; rely on `font_picker` + `font_face`.

Troubleshooting
- Schema incompatible with stored values (e.g., “Arial” not a handle):
  - Fix `config/settings_data.json` keys `heading_font`, `body_font`, `navigation_font` to valid handles.
  - Then in Shopify Admin → Themes, use “Reset to latest commit” and reload Customize.
- Fonts not changing on storefront:
  - Hard refresh (Ctrl/Cmd+Shift+R) due to cached CSS.
  - Verify variables exist in head: layout/theme.liquid:42
  - Ensure no later CSS overrides re-introduce hardcoded `font-family`.
- Missing `@font-face` rules:
  - Confirm snippet is included in head: layout/theme.liquid:37
  - Confirm each picker exists in schema: config/settings_schema.json:435

Performance Notes
- `font_display: 'swap'` is enabled for all picker fonts to avoid FOIT.
- Preconnect hints included for font/CDN origins:
  - layout/theme.liquid:29
  - layout/theme.liquid:30
- Keep overrides concise; avoid duplicating system font stacks outside of `:root` variables.

Rollback Plan
- To temporarily revert to a single system stack without removing schema:
  - In Customize, set Heading/Body/Navigation pickers to `helvetica_n4` (or desired system-ish fallback) and publish.
  - Alternatively, set `--font-*` variables to `inherit` in `layout/theme.liquid` for a quick emergency fallback.

Open Items / Next Steps
- Confirm all templates/sections/snippets avoid legacy font links.
- Decide final default fonts (family and weights) and update handles in schema + data.
- After publish, spot-check PDP, PLP, cart, and checkout typography.

Key File References
- config/settings_schema.json:435
- config/settings_data.json:62
- snippets/engo-header-fonts.liquid:5
- layout/theme.liquid:37
- layout/theme.liquid:42
- assets/dev.css.liquid:1
