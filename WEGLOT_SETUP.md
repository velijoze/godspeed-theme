# Weglot Setup Instructions

## Theme Preparation Complete ✅

The theme has been cleaned up and prepared for Weglot integration:

- ✅ Removed old Weglot code remnants  
- ✅ Removed debug widgets
- ✅ Cleaned up custom language switcher
- ✅ Added Weglot placeholder containers
- ✅ Added integration comments in theme.liquid

## Next Steps for You:

### 1. Install Weglot App
1. Go to Shopify App Store
2. Search for "Weglot" 
3. Install the official Weglot app
4. Subscribe to Business plan ($25/month for 3 languages)

### 2. Configure Weglot
1. **Original language**: English
2. **Target languages**: German, Italian, French  
3. **Translation method**: Automatic (with manual editing option)
4. **URL structure**: Subdirectory (recommended)

### 3. Weglot Will Automatically:
- ✅ Inject translation scripts into your theme
- ✅ Replace language switcher placeholder with their widget
- ✅ Translate all product content from Lightspeed
- ✅ Handle new inventory syncs automatically
- ✅ Create SEO-friendly language URLs (/de, /it, /fr)

### 4. After Installation:
- Test language switching on all pages
- Review auto-translations and edit if needed
- Verify new products from Lightspeed get translated
- Check that workshop forms work in all languages

## What Weglot Covers:
- ✅ Product titles, descriptions, variants
- ✅ Collection pages and descriptions  
- ✅ Blog posts and articles
- ✅ Checkout process and cart
- ✅ Contact forms and user input
- ✅ Meta descriptions for SEO
- ✅ Navigation menus (if using Shopify menus)

## Files Modified:
- `snippets/change-language.liquid` - Prepared for Weglot widget
- `layout/theme.liquid` - Added integration comments  
- Removed: `weglot_switcher.liquid`, `weglot_hreftags.liquid`, debug files

Your theme is ready for Weglot! 🚀