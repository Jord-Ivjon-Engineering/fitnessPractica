# DigitalOcean Spaces Setup Guide

This guide explains how to configure DigitalOcean Spaces (CDN) for storing videos and images.

## Overview

The application now supports uploading processed videos and images to DigitalOcean Spaces instead of storing them locally. This provides:
- **CDN delivery** - Faster global access to files
- **Scalable storage** - No disk space limits on your server
- **Cost-effective** - Pay only for storage used

## Folder Structure in Spaces

Your DigitalOcean Spaces bucket should have this structure:

```
your-bucket-name/
├── uploads/
│   ├── edited/          ← Final processed videos (edited_*.mp4)
│   └── images/          ← Program images (program_*.jpg/png)
```

**Note**: The `temp/` folder stays local on the server (temporary processing files are deleted after use).

## Step 1: Create DigitalOcean Space

1. Go to [DigitalOcean Spaces](https://cloud.digitalocean.com/spaces)
2. Click **"Create a Space"**
3. Configure:
   - **Name**: Choose a unique name (e.g., `fitness-practica-media`)
   - **Region**: Choose closest to your users (e.g., `fra1` for Frankfurt)
   - **CDN**: Enable CDN for faster delivery (recommended)
   - **File Listing**: Disable (for security)
4. Click **"Create a Space"**

## Step 2: Create Access Keys

1. Go to [API Tokens](https://cloud.digitalocean.com/account/api/tokens)
2. Click **"Generate New Token"** → **"Spaces Keys"**
3. Give it a name (e.g., `fitness-practica-spaces`)
4. Click **"Generate Key"**
5. **Save both keys immediately** (you won't see them again):
   - **Access Key ID**
   - **Secret Access Key**

## Step 3: Configure Environment Variables

Add these to your `server/.env` file:

```env
# DigitalOcean Spaces Configuration
SPACES_ENDPOINT=https://fra1.digitaloceanspaces.com
SPACES_REGION=fra1
SPACES_BUCKET_NAME=your-bucket-name
SPACES_ACCESS_KEY_ID=your-access-key-id
SPACES_SECRET_ACCESS_KEY=your-secret-access-key

# Optional: CDN URL (if you enabled CDN)
# Format: https://your-space.region.cdn.digitaloceanspaces.com
SPACES_CDN_URL=https://your-space.fra1.cdn.digitaloceanspaces.com
```

### Finding Your Endpoint

Your endpoint depends on your region:
- **NYC3**: `https://nyc3.digitaloceanspaces.com`
- **AMS3**: `https://ams3.digitaloceanspaces.com`
- **SGP1**: `https://sgp1.digitaloceanspaces.com`
- **SFO3**: `https://sfo3.digitaloceanspaces.com`
- **FRA1**: `https://fra1.digitaloceanspaces.com`

### Finding Your CDN URL

If you enabled CDN, your CDN URL format is:
```
https://your-space-name.region.cdn.digitaloceanspaces.com
```

Example: If your space is named `fitness-practica-media` in `fra1`:
```
https://fitness-practica-media.fra1.cdn.digitaloceanspaces.com
```

## Step 4: Create Folders in Spaces

You can create folders using the DigitalOcean web interface or they'll be created automatically when files are uploaded.

**Using Web Interface:**
1. Go to your Space in DigitalOcean dashboard
2. Click **"Upload"** → **"Create Folder"**
3. Create: `uploads/edited/` and `uploads/images/`

**Or they'll be created automatically** when the first file is uploaded.

## Step 5: Install Dependencies

The AWS SDK is already added to `package.json`. Install it:

```bash
cd server
npm install
```

## Step 6: Test the Integration

1. **Restart your server**:
   ```bash
   pm2 restart all
   ```

2. **Upload a test image** through your admin panel
3. **Process a test video** through your video editor
4. Check your Spaces bucket - files should appear there
5. Check the response URLs - they should be Spaces CDN URLs

## How It Works

### Video Processing Flow

1. User uploads video → Stored locally temporarily
2. Video is processed → Output saved locally to `uploads/edited/`
3. **If Spaces is configured**:
   - Video is uploaded to Spaces (`uploads/edited/video.mp4`)
   - Local file is deleted
   - CDN URL is returned to client
4. **If Spaces is NOT configured**:
   - Video stays local
   - Local path URL is returned

### Image Upload Flow

1. User uploads image → Stored locally temporarily
2. **If Spaces is configured**:
   - Image is uploaded to Spaces (`uploads/images/image.jpg`)
   - Local file is deleted
   - CDN URL is returned to client
3. **If Spaces is NOT configured**:
   - Image stays local
   - Local path URL is returned

## Fallback Behavior

If Spaces is not configured or upload fails:
- Files are stored locally (backward compatible)
- Local file paths are returned
- Application continues to work normally

## Troubleshooting

### Files not uploading to Spaces

1. **Check environment variables**:
   ```bash
   cd server
   cat .env | grep SPACES
   ```

2. **Check server logs**:
   ```bash
   pm2 logs fitness-practica-api
   ```

3. **Verify credentials**:
   - Ensure `SPACES_ACCESS_KEY_ID` and `SPACES_SECRET_ACCESS_KEY` are correct
   - Ensure `SPACES_BUCKET_NAME` matches your Space name exactly

### Permission Errors

- Ensure your Spaces access keys have read/write permissions
- Check that the bucket name is correct (case-sensitive)

### CDN URL Not Working

- Verify `SPACES_CDN_URL` is correct
- Ensure CDN is enabled on your Space
- CDN may take a few minutes to propagate

## Cost Considerations

DigitalOcean Spaces pricing (as of 2024):
- **Storage**: $5/month per 250 GB
- **Bandwidth**: First 1 TB/month free, then $0.01/GB
- **Operations**: $0.01 per 1,000 PUT requests, $0.01 per 10,000 GET requests

For a typical fitness app:
- Storage: ~$5-10/month (depending on video library size)
- Bandwidth: Usually within free tier for small-medium apps

## Migration from Local Storage

If you have existing local files you want to migrate:

1. **Keep local files** - They'll continue to work via local paths
2. **New uploads** - Will automatically go to Spaces
3. **Gradual migration** - You can manually upload old files to Spaces if needed

## Security Notes

- Files uploaded to Spaces are set to `public-read` (publicly accessible)
- If you need private files, modify `server/src/services/spaces.ts` to remove `ACL: 'public-read'`
- Consider using signed URLs for private content

## Next Steps

1. ✅ Create DigitalOcean Space
2. ✅ Generate access keys
3. ✅ Add environment variables to `server/.env`
4. ✅ Install dependencies: `npm install`
5. ✅ Restart server: `pm2 restart all`
6. ✅ Test uploads

Your application is now ready to use DigitalOcean Spaces for CDN delivery! 🚀

