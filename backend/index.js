// Load environment variables first
require('dotenv').config();

// Main Express server
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { verifyJWT } = require('./middleware/auth');

const authRoutes = require('./api/auth');
const paymentsRoutes = require('./api/payments');
const sellersRoutes = require('./api/sellers');
const usersRoutes = require('./api/users');
const analyticsRoutes = require('./api/analytics');

const app = express();

// Middleware
// For single deployment, allow same origin. For separate deployments, use FRONTEND_URL
const corsOrigin = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? true : 'http://localhost:3000');
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser for reading JWT tokens from cookies
app.use(cookieParser());

// Initialize Passport (needed for Discord OAuth, but we don't use Passport sessions)
const passport = require('passport');
app.use(passport.initialize());

// Apply JWT verification middleware globally
// This will attach req.user if a valid JWT token is present
// Protected routes will use requireAuth to check if req.user exists
app.use(verifyJWT);

// Health check - define early for easy access
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Root endpoint - API information
app.get('/', (req, res) => {
  res.json({ 
    message: 'Payment Dashboard API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      payments: '/api/payments',
      sellers: '/api/sellers',
      users: '/api/users'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/sellers', sellersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path,
    method: req.method,
    message: 'This is the backend API. Use /api/* endpoints.'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

// For local development
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel serverless functions
// Vercel expects the app to be exported directly for @vercel/node
module.exports = app;

