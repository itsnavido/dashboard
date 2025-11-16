import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authService } from '../services/auth';
import api from '../services/api';

const Login = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [loginMethod, setLoginMethod] = useState('discord'); // 'discord' or 'password'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const messageParam = searchParams.get('message');
    
    if (errorParam === 'oauth_not_configured') {
      setError('Discord OAuth is not configured. Please check your backend environment variables.');
    } else if (errorParam === 'auth_failed') {
      const errorMessage = messageParam 
        ? decodeURIComponent(messageParam)
        : 'Authentication failed. Please try again or contact an administrator.';
      setError(errorMessage);
    }
  }, [searchParams]);

  const handleDiscordLogin = () => {
    window.location.href = authService.getDiscordAuthUrl();
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { username, password });
      if (response.data.user) {
        // Redirect to dashboard
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Payment Dashboard</h1>
        
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            className={`btn-small ${loginMethod === 'discord' ? 'active' : ''}`}
            onClick={() => {
              setLoginMethod('discord');
              setError('');
            }}
            style={{ flex: 1 }}
          >
            Discord
          </button>
          <button
            className={`btn-small ${loginMethod === 'password' ? 'active' : ''}`}
            onClick={() => {
              setLoginMethod('password');
              setError('');
            }}
            style={{ flex: 1 }}
          >
            Username/Password
          </button>
        </div>

        {error && (
          <div style={{ 
            marginBottom: '20px', 
            padding: '10px', 
            backgroundColor: '#fee', 
            color: '#c33', 
            borderRadius: '5px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {loginMethod === 'discord' ? (
          <>
            <p style={{ marginBottom: '30px', color: '#666' }}>
              Please login with your Discord account to continue
            </p>
            <button className="login-button" onClick={handleDiscordLogin}>
              Login with Discord
            </button>
          </>
        ) : (
          <form onSubmit={handlePasswordLogin} style={{ width: '100%' }}>
            <label htmlFor="username" style={{ display: 'block', marginBottom: '10px', textAlign: 'left' }}>
              Username:
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '15px',
                borderRadius: '5px',
                border: '1px solid #ddd',
                fontSize: '14px'
              }}
            />
            <label htmlFor="password" style={{ display: 'block', marginBottom: '10px', textAlign: 'left' }}>
              Password:
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '20px',
                borderRadius: '5px',
                border: '1px solid #ddd',
                fontSize: '14px'
              }}
            />
            <button 
              type="submit" 
              className="login-button" 
              disabled={isSubmitting}
              style={{ width: '100%' }}
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
            <p style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
              Note: Username/Password login is only available for users who have set credentials in the Users tab.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;

