# Setup Instructions for Rebuilt Dashboard

## Quick Start

### 1. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Configure Environment Variables

**Backend (.env):**
```env
# Database (if using MongoDB)
MONGODB_URI=your-mongodb-connection-string
# OR (if using PostgreSQL)
DATABASE_URL=your-postgresql-connection-string

# Discord OAuth
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_CALLBACK_URL=http://localhost:5000/api/auth/discord/callback
DISCORD_WEBHOOK_URL=your-discord-webhook-url

# JWT
JWT_SECRET=your-secret-key-min-32-characters
SESSION_SECRET=your-session-secret-min-32-characters

# Frontend URL
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
PORT=5000
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:5000
```

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Features

### Admin Features
- **Dashboard**: Overview with statistics cards
- **Payments**: Full payment management with status toggle
- **Analytics**: Charts and statistics
- **Users**: User management
- **Sellers**: Seller information management

### User Features
- **My Payments**: Personal payment dashboard
- View only their own payments
- Payment status indicators
- Summary statistics

## Navigation

### Admin Navigation
- Dashboard → `/admin/dashboard`
- Payments → `/admin/payments`
- Analytics → `/admin/analytics`
- Users → `/admin/users`
- Sellers → `/admin/sellers`

### User Navigation
- My Payments → `/dashboard`

## Payment Status Management

Admins can:
- Click on payment status badge to toggle paid/unpaid
- Filter payments by status
- See status indicators throughout the app

## Analytics

Access analytics at `/admin/analytics`:
- Overview statistics
- Per-user payment totals (bar chart)
- Realm breakdown (pie chart)
- Timeline (line chart)
- Status distribution (pie chart)

## Troubleshooting

### Tailwind CSS not working
- Make sure `tailwind.config.js` exists
- Check `postcss.config.js` exists
- Verify `index.css` has Tailwind directives

### Components not found
- Check path aliases in `vite.config.js`
- Verify `@/` alias points to `src/`

### API errors
- Check backend is running
- Verify CORS settings
- Check environment variables

### Authentication issues
- Verify JWT_SECRET is set
- Check Discord OAuth credentials
- Clear browser cookies and try again

## Mobile Responsiveness

The dashboard is fully responsive:
- Sidebar collapses on mobile
- Tables scroll horizontally
- Touch-friendly buttons
- Responsive cards and layouts

## Next Steps

1. Test all features
2. Customize colors in `tailwind.config.js`
3. Add more analytics if needed
4. Refactor PaymentForm/PaymentEdit to use React Hook Form (optional)
5. Add more filtering options (optional)

