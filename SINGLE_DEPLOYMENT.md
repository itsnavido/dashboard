# Single Vercel Project Deployment Guide

This guide explains how to deploy both frontend and backend in a single Vercel project.

## Overview

**Pros:**
- ✅ Single domain (no CORS issues)
- ✅ Single deployment
- ✅ Easier environment variable management
- ✅ Simpler setup
- ✅ Same origin for cookies/sessions

**Cons:**
- ⚠️ Longer build time (builds both frontend and backend)
- ⚠️ Single point of deployment (can't deploy frontend/backend separately)
- ⚠️ All environment variables in one place (less separation)

## Setup Instructions

### 1. Create Root-Level vercel.json

A `vercel.json` file has been created in the root directory that handles both frontend and backend.

### 2. Vercel Project Configuration

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. **Important**: Do NOT set a Root Directory (leave it empty)
5. Configure the project:
   - **Framework Preset**: Other
   - **Build Command**: 
     ```bash
     cd frontend && npm install && npm run build && cd ../backend && npm install
     ```
   - **Output Directory**: `frontend/dist`
   - **Install Command**: (leave empty, handled in build command)

### 3. Environment Variables

Add ALL environment variables in the Vercel Dashboard:

**Backend Variables:**
- `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON`
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_CALLBACK_URL` (e.g., `https://yourdomain.vercel.app/api/auth/discord/callback`)
- `DISCORD_WEBHOOK_URL`
- `SESSION_SECRET`
- `FRONTEND_URL` (optional - will auto-detect from request if not set. Set to `https://yourdomain.vercel.app` if you want to be explicit)
- `NODE_ENV` = `production`

**Frontend Variables:**
- `VITE_API_URL` = `/api` (optional - defaults to `/api` for same origin in production, or set to full URL if needed)

### 4. Frontend API URL (Already Configured)

The frontend is already configured to use relative paths (`/api`) in production when `VITE_API_URL` is not set. This works perfectly for single deployment since both frontend and backend are on the same domain.

**No changes needed** - the code automatically uses `/api` in production, which will work with your single deployment setup.

### 5. Deploy

Click "Deploy" and wait for the build to complete.

## How It Works

1. **API Routes** (`/api/*`):
   - Routed to `backend/index.js` (serverless function)
   - Handles all backend API requests

2. **Frontend Routes** (everything else):
   - Serves static files from `frontend/dist`
   - SPA routing handled by `index.html`

3. **Build Process**:
   - Builds frontend first (creates `dist` folder)
   - Sets up backend as serverless function
   - Both are deployed together

## Alternative: Simplified Build Command

You can also create a root `package.json` with build scripts:

```json
{
  "name": "payment-dashboard",
  "scripts": {
    "build": "cd frontend && npm install && npm run build && cd ../backend && npm install"
  }
}
```

Then in Vercel, set:
- **Build Command**: `npm run build`
- **Output Directory**: `frontend/dist`

## Updating Frontend to Use Same Origin

Since both are on the same domain, you can update the frontend to use relative paths:

**frontend/src/services/api.js:**
```javascript
// Use relative path when on same domain
const API_URL = import.meta.env.VITE_API_URL || (window.location.origin + '/api');
```

Or even simpler:
```javascript
const API_URL = '/api';  // Always use same origin
```

This eliminates CORS issues completely!

## Troubleshooting

### Build Fails
- Check build logs in Vercel
- Ensure both `frontend/` and `backend/` have valid `package.json`
- Verify all dependencies are listed

### API Routes Return 404
- Check that `vercel.json` routes are correct
- Verify backend is being built as serverless function
- Check Functions tab in Vercel dashboard

### Frontend Not Loading
- Verify `Output Directory` is set to `frontend/dist`
- Check that frontend build completed successfully
- Ensure static files are being served correctly

## Comparison: Single vs Separate Projects

| Feature | Single Project | Separate Projects |
|---------|---------------|-------------------|
| CORS Issues | None (same origin) | Need to configure |
| Deployment | One deployment | Two deployments |
| Environment Variables | All in one place | Separate per project |
| Build Time | Longer (both build) | Can build separately |
| Flexibility | Less (deploy together) | More (deploy independently) |
| Complexity | Simpler setup | More complex setup |

## Recommendation

**Use Single Project if:**
- You want simpler setup
- You don't need to deploy frontend/backend separately
- You want to avoid CORS issues
- You prefer single domain

**Use Separate Projects if:**
- You need independent deployments
- You want different scaling for frontend/backend
- You prefer separation of concerns
- You have different teams managing each

