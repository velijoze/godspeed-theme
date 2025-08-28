# Smart Collection Issue Analysis

**Date**: 2025-08-27  
**Issue**: Smart collection "Under 3000 CHF" only matching 3 out of 2000 products

## Root Cause Analysis

### Problem Identified
The smart collection condition **"Type contains bicycle"** doesn't match the actual product type naming convention used in the store.

### Actual Product Types Found
Based on analysis of `/categorization/type_mappings.csv`, the store uses these product type formats:

**E-Bikes:**
- `E-Bikes - E-bike City, Tour & Trekking`
- `E-Bikes - E-MTB Hardtail` 
- `E-Bikes - E-MTB Fully - 140-150`
- `E-Bikes - E-bike compatta & - pieghevole`

**Traditional Bikes:**
- `Bikes - Mountainbike - Fully`
- `Bikes - Road`
- `Bikes - Kids - 16"`
- `Bikes - Dirt Bikes`

**Accessories:**
- Various bicycle parts and accessories with different naming patterns

### Current Smart Collection Conditions
```
- Price: is less than CHF 3000
- Type: contains "bicycle" 
- Inventory stock: is greater than 0
```

### Issue Explanation
- **Condition mismatch**: Product types use "Bikes" and "E-Bikes" but condition searches for "bicycle"
- **Case sensitivity**: The word "bicycle" doesn't appear in any of the standard product types
- **Only 3 matches**: These 3 products likely have different/custom product types containing "bicycle"

## Recommended Solution

Change the smart collection condition from:
- ❌ `Type contains "bicycle"`

To one of these options:
- ✅ `Type contains "bike"` (matches both "Bikes" and "E-Bikes")
- ✅ `Type contains "Bikes" OR Type contains "E-Bikes"` (more specific)

## Expected Outcome
With the corrected condition, the collection should include hundreds of products instead of just 3, properly reflecting all bicycles and e-bikes under CHF 3000.

## Files Referenced
- `/categorization/type_mappings.csv` - Product type mappings
- `/categorization/shopify_final_import.csv` - Product categorization data