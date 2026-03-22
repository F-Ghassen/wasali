# Flag Images Setup Guide

Flag images are used in the `WhereAreYouFrom` component to display country backgrounds. This guide covers how to set up and upload flag images to Supabase storage.

## Overview

- **Component**: `components/WhereAreYouFrom.tsx`
- **Service**: `lib/flagImages.ts` (handles URL generation)
- **Storage**: Supabase storage bucket `flags`
- **Image specs**: 320x240px PNG, ~3-5KB per image (optimized)

## Step 1: Create Supabase Storage Bucket

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Storage** → **Buckets**
3. Create a new bucket named `flags`
4. Set it to **Public** (images need to be publicly accessible)
5. Click **Create bucket**

## Step 2: Download Flag Images

Choose one of these high-quality sources:

### Option A: flagcdn.com (Recommended)
- URL pattern: `https://flagcdn.com/w320/{country-code}.png`
- Quality: High, optimized for web
- Size: 320x240px, 3-5KB per image
- Coverage: All countries

**Download script using curl:**

```bash
#!/bin/bash

# Flag image directory
mkdir -p ./flags

# Country codes (ISO 3166-1 alpha-2)
COUNTRIES=(tn fr de it es pl nl be se pt at cz dk fi gr hu ie lu ro sk si bg hr cy ee lv lt mt gb no ch is ua)

for code in "${COUNTRIES[@]}"; do
  curl -o "./flags/${code}.png" "https://flagcdn.com/w320/${code}.png"
  echo "Downloaded: ${code}.png"
done

echo "All flag images downloaded!"
```

Save this as `scripts/download-flags.sh`, then run:
```bash
chmod +x scripts/download-flags.sh
./scripts/download-flags.sh
```

### Option B: Manual Download
Visit `https://flagcdn.com/w320/{country-code}.png` for each country and download manually.

**Required country codes** (from `lib/flagImages.ts`):
```
Tunisia (tn), France (fr), Germany (de), Italy (it), Spain (es)
Poland (pl), Netherlands (nl), Belgium (be), Sweden (se), Portugal (pt)
Austria (at), Czech Republic (cz), Denmark (dk), Finland (fi), Greece (gr)
Hungary (hu), Ireland (ie), Luxembourg (lu), Romania (ro), Slovakia (sk)
Slovenia (si), Bulgaria (bg), Croatia (hr), Cyprus (cy), Estonia (ee)
Latvia (lv), Lithuania (lt), Malta (mt), United Kingdom (gb), Norway (no)
Switzerland (ch), Iceland (is), Ukraine (ua)
```

## Step 3: Upload to Supabase

### Option A: Using Supabase Dashboard
1. Go to **Storage** → **flags** bucket
2. Click **Upload** → **Upload a file**
3. Select all flag PNG files
4. Click **Upload**

### Option B: Using Node.js Script

Create `scripts/upload-flags.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for uploads
);

async function uploadFlags() {
  const flagsDir = './flags';
  const files = fs.readdirSync(flagsDir);

  console.log(`Found ${files.length} flag files. Starting upload...`);

  for (const file of files) {
    if (!file.endsWith('.png')) continue;

    const filePath = path.join(flagsDir, file);
    const fileBuffer = fs.readFileSync(filePath);

    try {
      const { data, error } = await supabase.storage
        .from('flags')
        .upload(file, fileBuffer, {
          upsert: true, // Replace if exists
          contentType: 'image/png',
        });

      if (error) {
        console.error(`Failed to upload ${file}:`, error.message);
      } else {
        console.log(`✓ Uploaded: ${file}`);
      }
    } catch (err) {
      console.error(`Error uploading ${file}:`, err);
    }
  }

  console.log('Upload complete!');
}

uploadFlags();
```

Run:
```bash
SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key npx ts-node scripts/upload-flags.ts
```

### Option C: Using Supabase CLI

```bash
# Set up Supabase CLI project
supabase projects list

# Upload files
supabase storage upload flags ./flags --recursive --project-id YOUR_PROJECT_ID
```

## Step 4: Verify Upload

1. Go to **Storage** → **flags** in Supabase Dashboard
2. You should see all flag PNG files listed
3. Click on a file to verify the public URL format:
   ```
   https://{project-id}.supabase.co/storage/v1/object/public/flags/{country-code}.png
   ```

## Step 5: Update Environment Variable (Optional)

If you're self-hosting flag images in Supabase, the URLs will be generated automatically:

```typescript
// In lib/flagImages.ts
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
```

This is already configured to use your Supabase URL automatically.

## Troubleshooting

### Images not loading?
1. Verify bucket is **Public** (not Private)
2. Check file names match country codes (e.g., `tn.png` for Tunisia)
3. Ensure image URLs are accessible publicly

### Slow loading?
- Verify images are optimized (< 10KB each)
- Consider using a CDN (Supabase automatically serves via edge)

### Missing country?
- Add the country to `COUNTRY_CODE_MAP` in `lib/flagImages.ts`
- Download and upload the corresponding flag image

## CDN Fallback

If images fail to load from Supabase, the component automatically falls back to `flagcdn.com`:

```typescript
// In lib/flagImages.ts
return `https://flagcdn.com/w320/${countryCode}.png`;
```

This ensures the app never breaks, even if storage is unavailable.

## Image Specifications

For best performance, flag images should meet these specs:

| Property | Value |
|----------|-------|
| Format | PNG |
| Width | 320px (responsive) |
| Height | 240px |
| File Size | 3-5KB |
| Color Space | sRGB |
| Quality | High quality with optimization |

### Optimization Tools

If you need to optimize images further:

```bash
# Using imagemin (Node.js)
npx imagemin flags/*.png --out-dir=flags-optimized

# Using pngquant (macOS/Linux)
pngquant --speed 1 flags/*.png --ext .png --force
```

## Related Files

- Component: `components/WhereAreYouFrom.tsx`
- Flag service: `lib/flagImages.ts`
- Country mapping: `lib/flagImages.ts` → `COUNTRY_CODE_MAP`
