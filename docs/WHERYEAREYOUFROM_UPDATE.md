# WhereAreYouFrom Component Update — Flag Background Images

## Summary

The `WhereAreYouFrom` component has been redesigned to display country flag images as card backgrounds with overlaid text, replacing the previous emoji-in-container design.

**Updated:** 2026-03-22

## Changes

### Component Files
- **`components/WhereAreYouFrom.tsx`** — Complete redesign
  - Imports: Added `ImageBackground` from React Native, `getFlagImageUrl` from flag service
  - Desktop cards: 140px height, flag image backgrounds, text overlay at bottom-right
  - Mobile cards: 140px height 2-column grid, same overlay pattern
  - Semi-transparent dark overlay (35-40% opacity) for text contrast
  - White text on overlays for visibility
  - Route count badge now has white background with opacity

### New Files
- **`lib/flagImages.ts`** — Flag image URL service
  - `getFlagImageUrl(country)` function generates Supabase storage URLs
  - Fallback to flagcdn.com CDN if Supabase unavailable
  - Country code mapping for 30+ countries
  - Ready for custom image uploads

- **`docs/FLAG_IMAGES_SETUP.md`** — Complete setup guide
  - Step-by-step instructions for uploading flag images to Supabase storage
  - Multiple download options (flagcdn.com, manual, CDN)
  - Node.js upload scripts and CLI instructions
  - Image specifications and optimization tips
  - Troubleshooting guide

### Updated Documentation
- **`docs/architecture.md`**
  - Updated WhereAreYouFrom component description
  - Added flag images to Storage Buckets diagram
  - Links to FLAG_IMAGES_SETUP.md

## Visual Changes

### Before
- White cards with emoji flag in small rounded container
- Text beside the flag
- Basic styling

### After
- **Desktop**: 140px height, full flag background with overlaid text bottom-right
- **Mobile**: 140px height 2-column grid with overlaid text
- Semi-transparent dark overlay ensures text readability on all flag colors
- White text for high contrast
- White/translucent route count badges
- ArrowRight hint icon in white on mobile

## Implementation Details

### Card Layout
```typescript
<ImageBackground source={{ uri: getFlagImageUrl(country.country) }}>
  <View style={styles.cardOverlay} />  {/* Semi-transparent dark layer */}
  <View style={styles.cardContent}>     {/* Text overlay */}
    <Text style={styles.countryName}>{country.country}</Text>
    <View style={styles.routeBadge}>
      <Text style={styles.routeCountText}>{country.routeCount}</Text>
    </View>
  </View>
</ImageBackground>
```

### Overlay Opacity
- Desktop: `rgba(0, 0, 0, 0.35)` — slightly lighter for better image visibility
- Mobile: `rgba(0, 0, 0, 0.4)` — slightly darker due to smaller text area

### Image Source
```typescript
const url = `${supabaseUrl}/storage/v1/object/public/flags/{country-code}.png`;
// Falls back to: https://flagcdn.com/w320/{country-code}.png
```

## Setup Required

### Before component works:
1. Create `flags` bucket in Supabase storage (Public)
2. Download flag images from flagcdn.com or your preferred source
3. Upload to Supabase storage bucket

**See [`FLAG_IMAGES_SETUP.md`](./FLAG_IMAGES_SETUP.md) for detailed instructions**

### Quick Setup (5 min)
```bash
# 1. Download flags
mkdir -p ./flags
for country in tn fr de it es pl nl be se pt; do
  curl -o "./flags/${country}.png" "https://flagcdn.com/w320/${country}.png"
done

# 2. Upload via Supabase Dashboard
# Go to Storage > flags > Upload > Select all PNGs

# 3. Verify
# Check that URLs like this work:
# https://{project}.supabase.co/storage/v1/object/public/flags/tn.png
```

## Testing

### Visual Testing
1. Run `npx expo start --web`
2. Navigate to Home tab
3. **Mobile (< 768px)**: Verify 2-column grid with overlaid text, ArrowRight icon visible
4. **Desktop (≥ 768px)**: Verify row layout with proper text positioning
5. **Loading**: Skeleton placeholders should appear briefly
6. **Empty state**: Should show lock icon and message if no routes

### Tap Testing
- Tap any country card → should navigate to results screen
- Tap "See All" → should navigate to results screen (no filters)

### Image Loading
- Verify flag images load without errors
- Check browser dev tools Network tab → flag images < 10KB each
- No CORS errors in console

## Files Modified

| File | Changes |
|------|---------|
| `components/WhereAreYouFrom.tsx` | Complete redesign with ImageBackground, overlay styles |
| `lib/flagImages.ts` | **NEW** — Flag URL generation service |
| `docs/architecture.md` | Updated component description, added flags bucket |
| `docs/FLAG_IMAGES_SETUP.md` | **NEW** — Complete setup guide |

## Performance

- **Image size**: 320x240px PNG, 3-5KB per image (optimized from flagcdn.com)
- **Loading**: Skeleton placeholders during fetch
- **Caching**: Browser and CDN caching via Supabase storage
- **Fallback**: Automatic fallback to flagcdn.com if storage unavailable

## Future Enhancements

- [ ] Add entrance animations (fade-in + scale)
- [ ] Add haptic feedback on card tap (native)
- [ ] Implement image preloading for faster display
- [ ] Add support for custom overlays or color filters
- [ ] Analytics tracking for tap/view events

## Related Docs

- [FLAG_IMAGES_SETUP.md](./FLAG_IMAGES_SETUP.md) — Image setup guide
- [architecture.md](./architecture.md) — Full system architecture
- [user-flows.md](./user-flows.md) — User interaction flows
