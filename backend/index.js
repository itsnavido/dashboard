// Load environment variables first
require('dotenv').config();

// Main Express server
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');

const authRoutes = require('./api/auth');
const paymentsRoutes = require('./api/payments');
const sellersRoutes = require('./api/sellers');
const usersRoutes = require('./api/users');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/sellers', sellersRoutes);
app.use('/api/users', usersRoutes);

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

// Health check - should work on Vercel
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

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

