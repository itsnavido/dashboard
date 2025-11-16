import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authService } from '../services/auth';

const Login = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

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

  const handleLogin = () => {
    window.location.href = authService.getDiscordAuthUrl();
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Payment Dashboard</h1>
        <p style={{ marginBottom: '30px', color: '#666' }}>
          Please login with your Discord account to continue
        </p>
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
        <button className="login-button" onClick={handleLogin}>
          Login with Discord
        </button>
      </div>
    </div>
  );
};

export default Login;

