# Deployment Guide - AI Jonbin Movie Maker

This guide covers deploying the AI Jonbin Movie Maker to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel Pro Plan**: Required for Fluid Compute (800s function timeout)
3. **GitHub Repository**: Code must be in a GitHub repo

## Deployment Steps

### 1. Prepare Your Repository

Ensure all changes are committed and pushed to GitHub:

```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Project"
3. Select your GitHub repository
4. Vercel will auto-detect Next.js configuration

### 3. Configure Project Settings

**Framework Preset**: Next.js (auto-detected)

**Build Settings** (use defaults):
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

**Root Directory**: Leave as `/` (root)

### 4. No Environment Variables Required

This application **does not require any environment variables** to be set in Vercel. All API keys are managed client-side via the web UI and LocalStorage.

### 5. Deploy

1. Click "Deploy"
2. Wait for the build to complete (usually 2-3 minutes)
3. Once deployed, you'll receive a production URL (e.g., `your-app.vercel.app`)

### 6. Enable Fluid Compute (Critical!)

After initial deployment, enable Fluid Compute for long-running video generation:

1. Go to your project in Vercel Dashboard
2. Click **Settings** → **Functions**
3. Find **Fluid Compute** section
4. Toggle it **ON**
5. Save changes

**Without Fluid Compute, video generation will timeout after 10 seconds!**

### 7. Verify Deployment

1. Visit your production URL
2. Click "APIキー設定" and enter your API keys:
   - OpenAI API Key
   - Google AI API Key
   - (Optional) ElevenLabs API Key
3. Test with a short article URL or text
4. Verify scenario generation works
5. Approve scenario and check full video generation

## Configuration Files

### vercel.json

The `vercel.json` file configures function timeouts and memory:

```json
{
  "functions": {
    "app/api/video/generate/route.ts": {
      "maxDuration": 800,
      "memory": 3008
    },
    "app/api/video/status/[jobId]/route.ts": {
      "maxDuration": 800
    }
  }
}
```

### next.config.ts

Configured for:
- Server Actions body size: 10mb (for file uploads)
- Node.js runtime (required for FFmpeg)

## Troubleshooting

### Build Failures

**Issue**: `Module not found` errors
- **Solution**: Run `npm install` locally and ensure `package-lock.json` is committed

**Issue**: TypeScript errors during build
- **Solution**: Run `npm run build` locally to catch errors before deploying

### Runtime Issues

**Issue**: Video generation times out
- **Cause**: Fluid Compute not enabled
- **Solution**: Enable Fluid Compute in Project Settings → Functions

**Issue**: 500 error on `/api/video/generate`
- **Check**: Browser console for detailed error
- **Common causes**:
  - Invalid API keys
  - Uploaded file too large
  - Unsupported file format

**Issue**: SSE connection drops
- **Check**: Vercel logs for errors
- **Solution**: Ensure Fluid Compute is enabled

**Issue**: FFmpeg errors
- **Check**: `@ffmpeg-installer/ffmpeg` is in `package.json`
- **Solution**: Reinstall: `npm install @ffmpeg-installer/ffmpeg`

### Performance Issues

**Issue**: Slow image generation
- **Cause**: Google Gemini API rate limits
- **Solution**: Use fewer scenes or add delays between requests

**Issue**: Large video files
- **Cause**: High-resolution reference images or long audio
- **Solution**: Compress reference images before uploading

## Monitoring

### Vercel Analytics

Enable Vercel Analytics to monitor:
- Page views
- API route performance
- Error rates

### Logs

View real-time logs:
1. Go to your project in Vercel Dashboard
2. Click **Deployments** → Select deployment
3. Click **View Function Logs**

Filter by API route:
- `/api/video/generate` - Video generation starts
- `/api/video/status/[jobId]` - SSE progress streams
- `/api/video/download/[jobId]` - Video downloads

## Cost Considerations

### Vercel Pro Plan ($20/month)

Includes:
- Fluid Compute (up to 800s execution time)
- 1000 GB-hours compute time
- 1 TB bandwidth
- Unlimited domains

### API Costs (User-provided)

Users provide their own API keys and bear costs:
- **OpenAI GPT-4**: ~$0.01-0.05 per scenario
- **Google Gemini**: ~$0.10-0.50 per video (5 images)
- **ElevenLabs**: ~$0.30 per 1000 characters (optional)
- **VoiceVox**: Free (alternative to ElevenLabs)

**Estimated cost per video**: $0.20-0.60 depending on configuration

## Scaling

### Current Limits

- **Concurrent requests**: Limited by Vercel plan
- **Storage**: `/tmp` directory, 512MB limit
- **Execution time**: 800s with Fluid Compute

### If You Need More Scale

Consider:
- **AWS Lambda**: For longer execution times
- **AWS MediaConvert**: For more complex video processing
- **S3**: For persistent video storage
- **CloudFront**: For CDN delivery

## Security

### Client-Side API Keys

- API keys stored in browser LocalStorage
- Never sent to Vercel's servers permanently
- Transmitted only in request bodies (HTTPS encrypted)

### Recommendations

- Use API keys with minimal permissions
- Set spending limits on OpenAI/Google accounts
- Rotate keys periodically
- Don't share your production URL publicly (admin-only tool)

## Updates and Maintenance

### Deploying Updates

```bash
# Make changes locally
git add .
git commit -m "Update: description"
git push origin main
```

Vercel will automatically deploy on push to `main`.

### Rolling Back

If a deployment has issues:
1. Go to **Deployments** in Vercel Dashboard
2. Find the last working deployment
3. Click **⋯** → **Promote to Production**

## Support

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **GitHub Issues**: Report bugs in your repository

---

🚀 **Ready to Deploy!**

Follow the steps above to get your AI Jonbin Movie Maker live on Vercel.
