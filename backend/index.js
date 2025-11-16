// Load environment variables first
require('dotenv').config();

// Main Express server
const express = require('express');
const cookieSession = require('cookie-session');
const passport = require('passport');
const cors = require('cors');

const authRoutes = require('./api/auth');
const paymentsRoutes = require('./api/payments');
const sellersRoutes = require('./api/sellers');
const usersRoutes = require('./api/users');

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

// Session configuration
// Use cookie-session for serverless environments (Vercel)
// This stores session data directly in encrypted cookies, which works across serverless invocations
const isProduction = process.env.NODE_ENV === 'production';
// For same-origin (single deployment, no FRONTEND_URL), use 'lax'
// For cross-origin (separate deployments, FRONTEND_URL set), use 'none'
// 'none' requires secure: true, which is fine since Vercel uses HTTPS
const isCrossOrigin = !!process.env.FRONTEND_URL;
const sessionConfig = {
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'your-secret-key-change-in-production'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  httpOnly: true,
  secure: isProduction, // Always true in production (Vercel uses HTTPS)
  sameSite: isProduction ? (isCrossOrigin ? 'none' : 'lax') : 'lax' // 'none' for cross-origin, 'lax' for same-origin
};

app.use(cookieSession(sessionConfig));

// Add compatibility layer for Passport (cookie-session doesn't have regenerate/save methods)
app.use((req, res, next) => {
  if (req.session && !req.session.regenerate) {
    req.session.regenerate = (callback) => {
      // For cookie-session, regeneration just means creating a new session
      // The session is already stored in the cookie, so we just call the callback
      if (callback) callback();
    };
    req.session.save = (callback) => {
      // For cookie-session, save is automatic, but we call the callback for compatibility
      if (callback) callback();
    };
    req.session.destroy = (callback) => {
      req.session = null;
      if (callback) callback();
    };
  }
  next();
});

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware to ensure Passport session data is properly saved with cookie-session
// cookie-session saves automatically, but we need to ensure Passport's data structure is maintained
app.use((req, res, next) => {
  // Ensure passport property exists on session for Passport to write to
  if (req.session && !req.session.passport) {
    req.session.passport = {};
  }
  
  // Store original end function to ensure session is saved
  const originalEnd = res.end;
  res.end = function(...args) {
    // If session has passport data, ensure it's saved by setting a direct property
    // This triggers cookie-session's change detection (it only watches direct properties)
    if (req.session && req.session.passport && Object.keys(req.session.passport).length > 0) {
      // Set a timestamp to trigger cookie-session to save the session
      req.session._lastModified = Date.now();
    }
    originalEnd.apply(res, args);
  };
  
  next();
});

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

