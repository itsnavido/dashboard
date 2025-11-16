// Authentication API routes
const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const userService = require('../services/userService');
const config = require('../config/config');
const { generateToken } = require('../utils/jwt');
const { verifyJWT } = require('../middleware/auth');

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

// Note: We're not using Passport sessions anymore, but passport-discord still needs these
// They won't be called since we're not using passport.session()
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

// Helper function to set JWT cookie
function setJWTCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction, // Only send over HTTPS in production
    sameSite: 'lax', // Single domain deployment
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });
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
    session: false // Don't use Passport sessions
  }, (err, user, info) => {
    if (err) {
      console.error('[Auth] Authentication error:', err);
      return res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
    if (!user) {
      console.log('[Auth] Authentication failed:', info?.message || 'Unknown error');
      return res.redirect(`${frontendUrl}/login?error=auth_failed&message=${encodeURIComponent(info?.message || 'Authentication failed')}`);
    }
    
    // Generate JWT token instead of using Passport sessions
    try {
      const token = generateToken(user);
      console.log('[Auth] Successful login for user:', user.id);
      
      // Set JWT as HTTP-only cookie
      setJWTCookie(res, token);
      
      // Redirect to frontend
      res.redirect(frontendUrl);
    } catch (error) {
      console.error('[Auth] Error generating JWT token:', error);
      return res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
  })(req, res, next);
});

// Logout
router.post('/logout', (req, res) => {
  // Clear JWT cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.json({ message: 'Logged out successfully' });
});

    // Username/Password login
    router.post('/login', async (req, res) => {
      try {
        const { username, password } = req.body;
        
        if (!username || !password) {
          return res.status(400).json({ error: 'Username and password are required' });
        }
        
        console.log('[Auth] Attempting username/password login for username:', username);
        
        // Get user by username
        const user = await userService.getUserByUsername(username);
        
        if (!user) {
          console.log('[Auth] User not found for username:', username);
          return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        console.log('[Auth] User found:', user.discordId, 'Has password:', !!user.password, 'Password length:', user.password ? user.password.length : 0);
        console.log('[Auth] User details:', {
          discordId: user.discordId,
          username: user.username,
          role: user.role,
          hasPassword: !!user.password,
          passwordPrefix: user.password ? user.password.substring(0, 10) + '...' : 'none'
        });
        
        // Check if user has a password set
        if (!user.password || user.password === '') {
          console.log('[Auth] User has no password set');
          return res.status(401).json({ error: 'Password login not available for this user. Please use Discord login or set a password first.' });
        }
        
        // Verify password
        console.log('[Auth] Verifying password...');
        const isValidPassword = await userService.verifyPassword(password, user.password);
        
        console.log('[Auth] Password verification result:', isValidPassword);
        
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Generate JWT token
        const token = generateToken({
          id: user.discordId,
          username: user.username || user.discordId,
          role: user.role
        });
        
        console.log('[Auth] Successful username/password login for user:', user.discordId);
        
        // Set JWT as HTTP-only cookie
        setJWTCookie(res, token);
        
        res.json({
          message: 'Login successful',
          user: {
            id: user.discordId,
            username: user.username || user.discordId,
            role: user.role
          }
        });
      } catch (error) {
        console.error('[Auth] Error during username/password login:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get current user
    // Apply JWT verification middleware first
    router.get('/me', verifyJWT, (req, res) => {
      if (req.user) {
        res.json(req.user);
      } else {
        res.status(401).json({ error: 'Not authenticated' });
      }
    });

    module.exports = router;

