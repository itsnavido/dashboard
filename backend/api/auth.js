// Authentication API routes
const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const userService = require('../services/userService');
const config = require('../config/config');

const router = express.Router();

// Validate Discord OAuth environment variables
if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
  console.warn('Warning: DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET not set. Discord OAuth will not work.');
}

// Helper function to get callback URL from request (full URL)
function getCallbackUrlFromRequest(req) {
  if (process.env.DISCORD_CALLBACK_URL) {
    return process.env.DISCORD_CALLBACK_URL;
  }
  // Auto-detect from request (for single deployment on same domain)
  const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5000';
  return `${protocol}://${host}/api/auth/discord/callback`;
}

// Configure Passport Discord strategy (only if credentials are available)
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  // Initialize with a placeholder - will be overridden per request
  passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL || 'http://localhost:5000/api/auth/discord/callback',
    scope: ['identify']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const discordId = profile.id;
      console.log(`[Auth] Attempting login for Discord ID: ${discordId}`);
      
      // Check if user exists
      let user = await userService.getUserByDiscordId(discordId);
      
      if (!user) {
        console.log(`[Auth] User ${discordId} not found in database`);
        
        // Check if this is a default admin
        if (config.defaultAdmins.includes(discordId)) {
          console.log(`[Auth] User ${discordId} is in defaultAdmins, creating as Admin`);
          // Create as admin
          user = await userService.createUser(discordId, 'Admin');
        } else {
          // Check if Users sheet is empty (first-time setup)
          const allUsers = await userService.getAllUsers();
          if (allUsers.length === 0) {
            console.log(`[Auth] No users in database. Creating first user as Admin: ${discordId}`);
            // First user becomes admin
            user = await userService.createUser(discordId, 'Admin');
          } else {
            console.log(`[Auth] User ${discordId} not authorized. Not in defaultAdmins and Users sheet is not empty.`);
            // Deny access if user doesn't exist
            return done(null, false, { message: 'User not authorized. Please contact an administrator to add your Discord ID.' });
          }
        }
      } else {
        console.log(`[Auth] User ${discordId} found with role: ${user.role}`);
      }
      
      return done(null, {
        id: discordId,
        username: profile.username,
        discriminator: profile.discriminator,
        avatar: profile.avatar,
        role: user.role
      });
    } catch (error) {
      console.error('[Auth] Error during authentication:', error);
      return done(error, null);
    }
  }));
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Helper function to get frontend URL (auto-detect from request if not set)
function getFrontendUrl(req) {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  // Auto-detect from request (for single deployment on same domain)
  const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${protocol}://${host}`;
}

// Discord OAuth login
router.get('/discord', (req, res, next) => {
  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
    const frontendUrl = getFrontendUrl(req);
    // Redirect to frontend with error instead of JSON response
    return res.redirect(`${frontendUrl}/login?error=oauth_not_configured`);
  }
  
  // Get the correct callback URL for this request (full URL)
  const callbackUrl = getCallbackUrlFromRequest(req);
  
  // Override the strategy's callbackURL for this request
  const discordStrategy = passport._strategies.discord;
  if (discordStrategy && discordStrategy._oauth2) {
    // Update the OAuth2 redirect URI
    discordStrategy._oauth2._redirectURI = callbackUrl;
  }
  
  passport.authenticate('discord')(req, res, next);
});

// Discord OAuth callback
router.get('/discord/callback', (req, res, next) => {
  const frontendUrl = getFrontendUrl(req);
  
  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
    return res.redirect(`${frontendUrl}/login?error=oauth_not_configured`);
  }
  passport.authenticate('discord', { 
    failureRedirect: `${frontendUrl}/login?error=auth_failed`,
    session: true
  }, (err, user, info) => {
    if (err) {
      console.error('[Auth] Authentication error:', err);
      return res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
    if (!user) {
      console.log('[Auth] Authentication failed:', info?.message || 'Unknown error');
      return res.redirect(`${frontendUrl}/login?error=auth_failed&message=${encodeURIComponent(info?.message || 'Authentication failed')}`);
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error('[Auth] Login error:', err);
        return res.redirect(`${frontendUrl}/login?error=auth_failed`);
      }
      console.log('[Auth] Successful login for user:', user.id);
      console.log('[Auth] Session after login:', {
        hasSession: !!req.session,
        hasPassport: !!req.session?.passport,
        passportUser: req.session?.passport?.user ? 'present' : 'missing'
      });
      
      // For cookie-session, we need to ensure the session is saved
      // The session is automatically saved at the end of the request,
      // but we can explicitly mark it as modified to ensure it's saved
      if (req.session) {
        req.session = req.session || {};
      }
      
      res.redirect(frontendUrl);
    });
  })(req, res, next);
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
router.get('/me', (req, res) => {
  // Debug logging
  console.log('[Auth] /me check:', {
    hasSession: !!req.session,
    sessionKeys: req.session ? Object.keys(req.session) : [],
    hasPassport: !!req.session?.passport,
    passportKeys: req.session?.passport ? Object.keys(req.session.passport) : [],
    hasUser: !!req.user,
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    cookies: req.headers.cookie ? 'present' : 'missing'
  });
  
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

module.exports = router;

