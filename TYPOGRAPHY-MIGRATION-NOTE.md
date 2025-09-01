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

