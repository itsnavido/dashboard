# Payment Dashboard with Google Sheets Integration

A full-stack payment management dashboard that replicates Google Apps Script functionality with a modern React frontend and Node.js backend, integrated with Google Sheets for data storage.

## Features

- **Discord OAuth Authentication**: Secure login with Discord
- **Role-Based Access Control**: Admin and User roles with different permissions
- **Payment Management**: Full CRUD operations for payments
- **Google Sheets Integration**: All data stored in Google Sheets
- **Discord Webhook Notifications**: Automatic notifications on payment creation
- **Caching Layer**: Improved performance with in-memory caching
- **User Management**: Admin-only user management interface

## Architecture

- **Frontend**: React with Vite
- **Backend**: Node.js/Express with serverless functions for Vercel
- **Authentication**: Passport.js with Discord OAuth
- **Data Storage**: Google Sheets API
- **Caching**: node-cache for in-memory caching
- **Deployment**: Vercel

## Setup

### Prerequisites

- Node.js 18+
- Google Cloud Project with Sheets API enabled
- Discord Application for OAuth
- Google Sheets spreadsheet with the following sheets:
  - `Payment` - Payment records
  - `Seller Info` - Seller bank information
  - `Info` - User lookup information
  - `Users` - User management (will be created automatically)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `backend/.env.example`) with the following variables:
```
# Google Sheets Configuration
# Paste the entire JSON content from your service account key file here (preferred method)
GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
# Alternative for local development only: use file path instead
# GOOGLE_SHEETS_SERVICE_ACCOUNT_PATH=./service-account-key.json

GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_CALLBACK_URL=http://localhost:5000/api/auth/discord/callback
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url
SESSION_SECRET=your-random-session-secret-key-min-32-characters
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

**Important**: 
- For production/Vercel deployment, use `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` and paste the entire JSON content from your service account key file as a single line (or escape newlines properly).
- For local development, you can optionally use `GOOGLE_SHEETS_SERVICE_ACCOUNT_PATH` to point to a JSON file instead.
- **Never commit service account JSON files to Git** - they are automatically excluded via `.gitignore`.

5. Configure non-secret settings in `backend/config/config.js`:
   - Payment duration options
   - Realm options
   - Cache TTL settings
   - Default admin Discord IDs

6. Run the backend:
```bash
npm start
# or for development
npm run dev
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `frontend/.env.example`):
```
VITE_API_URL=http://localhost:5000
```

4. Run the frontend:
```bash
npm run dev
```

## Google Sheets Setup

1. Create a Google Cloud Project
2. Enable Google Sheets API
3. Create a Service Account
4. Download the JSON key file (this is your service account credentials)
5. **Recommended Method (for production)**: Open the JSON file, copy its entire contents, and paste it into `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` in your `.env` file as a single line (or escape newlines properly)
6. **Alternative Method (local development only)**: Place the JSON file in the `backend/` directory and set `GOOGLE_SHEETS_SERVICE_ACCOUNT_PATH` in your `.env` file to point to it (e.g., `./service-account-key.json`)
7. Share your Google Sheet with the service account email (found in the JSON file as `client_email`)

**Security Note**: Service account JSON files are automatically excluded from Git via `.gitignore`. Never commit these files to your repository.

## Discord OAuth Setup

1. Go to https://discord.com/developers/applications
2. Create a new application
3. Go to OAuth2 section
4. Add redirect URI: `http://localhost:5000/api/auth/discord/callback` (for local) or your production URL
5. Copy Client ID and Client Secret to `.env`

## Deployment to Vercel

### Prerequisites

1. Push your code to a GitHub repository
2. Make sure all service account JSON files are removed from the repository (they should be in `.gitignore`)
3. Have your environment variables ready

### Backend Deployment

1. **Via Vercel Dashboard (Recommended)**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Set the **Root Directory** to `backend`
   - Configure the project:
     - **Framework Preset**: Other
     - **Build Command**: (leave empty or `npm install`)
     - **Output Directory**: (leave empty)
     - **Install Command**: `npm install`

2. **Add Environment Variables** in Vercel Dashboard:
   - `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` - Paste the **entire JSON content** from your service account key file. In Vercel's editor, you can paste it as-is (multi-line is supported).
   - `GOOGLE_SHEETS_SPREADSHEET_ID` - Your Google Sheet ID
   - `DISCORD_CLIENT_ID` - Your Discord application client ID
   - `DISCORD_CLIENT_SECRET` - Your Discord application client secret
   - `DISCORD_CALLBACK_URL` - Your production callback URL (e.g., `https://your-backend.vercel.app/api/auth/discord/callback`)
   - `DISCORD_WEBHOOK_URL` - Your Discord webhook URL
   - `SESSION_SECRET` - A random secret string (min 32 characters)
   - `FRONTEND_URL` - Your frontend URL (will be set after frontend deployment)
   - `NODE_ENV` - `production`

3. **Deploy**: Click "Deploy"

4. **Note**: After deployment, update `DISCORD_CALLBACK_URL` and `FRONTEND_URL` with your actual production URLs.

### Frontend Deployment

1. **Via Vercel Dashboard**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"
   - Import the same GitHub repository
   - Set the **Root Directory** to `frontend`
   - Configure the project:
     - **Framework Preset**: Vite
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install`

2. **Add Environment Variables**:
   - `VITE_API_URL` - Your backend API URL (e.g., `https://your-backend.vercel.app`)

3. **Deploy**: Click "Deploy"

4. **Update Backend Environment Variables**:
   - Go back to your backend project in Vercel
   - Update `FRONTEND_URL` with your frontend URL (e.g., `https://your-frontend.vercel.app`)
   - Redeploy the backend if needed

### Alternative: Vercel CLI

If you prefer using the CLI:

**Backend**:
```bash
cd backend
npm i -g vercel
vercel
# Follow the prompts and add environment variables when asked
```

**Frontend**:
```bash
cd frontend
vercel
# Follow the prompts and add environment variables when asked
```

### Post-Deployment Checklist

- [ ] Update Discord OAuth redirect URI in Discord Developer Portal to include your production callback URL
- [ ] Verify all environment variables are set correctly in Vercel
- [ ] Test authentication flow
- [ ] Test payment CRUD operations
- [ ] Verify Discord webhook notifications are working

## User Management

- **Admin**: Can perform all operations including user management
- **User**: Can perform all operations except user management

To add the first admin user, add their Discord ID to `defaultAdmins` array in `backend/config/config.js`.

## API Endpoints

- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `GET /api/payments` - List all payments
- `POST /api/payments` - Create payment
- `GET /api/payments/:id` - Get payment by ID
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment
- `GET /api/sellers/:discordId` - Get seller info
- `POST /api/sellers` - Create/update seller info
- `GET /api/users` - List all users (Admin only)
- `POST /api/users` - Create user (Admin only)
- `PUT /api/users/:discordId` - Update user role (Admin only)
- `DELETE /api/users/:discordId` - Delete user (Admin only)

## GitHub Setup

Before pushing to GitHub:

1. **Remove any service account JSON files** from your local repository:
   ```bash
   # Check for any JSON files that might be service account keys
   find . -name "*-service-account*.json" -o -name "*credentials*.json" -o -name "celestial-*.json"
   
   # If found, remove them (they should already be in .gitignore)
   git rm --cached backend/*.json  # Only if you accidentally committed them
   ```

2. **Verify .gitignore** includes service account files (already configured)

3. **Create .env.example files** (templates are provided):
   - `backend/.env.example` - Copy and fill in your values
   - `frontend/.env.example` - Copy and fill in your values

4. **Commit and push**:
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

5. **Connect to Vercel** via GitHub integration for automatic deployments

## VPS Deployment

For deploying on your own VPS with a custom domain, see [VPS_DEPLOYMENT.md](./VPS_DEPLOYMENT.md) for detailed instructions.

Quick overview:
- Install Node.js, Nginx, PM2
- Clone repository to `/var/www/dashboard`
- Configure environment variables
- Build frontend and start backend with PM2
- Configure Nginx as reverse proxy
- Setup SSL with Let's Encrypt
- Configure domain DNS records

## License

MIT

