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

// Configure Passport Discord strategy (only if credentials are available)
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL || '/api/auth/discord/callback',
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

// Discord OAuth login
router.get('/discord', (req, res, next) => {
  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    // Redirect to frontend with error instead of JSON response
    return res.redirect(`${frontendUrl}/login?error=oauth_not_configured`);
  }
  passport.authenticate('discord')(req, res, next);
});

// Discord OAuth callback
router.get('/discord/callback', (req, res, next) => {
  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_not_configured`);
  }
  passport.authenticate('discord', { 
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`,
    session: true
  }, (err, user, info) => {
    if (err) {
      console.error('[Auth] Authentication error:', err);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`);
    }
    if (!user) {
      console.log('[Auth] Authentication failed:', info?.message || 'Unknown error');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed&message=${encodeURIComponent(info?.message || 'Authentication failed')}`);
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error('[Auth] Login error:', err);
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`);
      }
      console.log('[Auth] Successful login for user:', user.id);
      res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
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
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

module.exports = router;

