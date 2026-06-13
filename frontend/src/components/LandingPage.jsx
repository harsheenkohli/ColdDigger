import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const handleButtonClick = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  if (loading) return null;

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '4rem 2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle background decorative gradient blob */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '800px',
        height: '800px',
        background: 'radial-gradient(circle, rgba(196,181,253,0.15) 0%, rgba(249,168,212,0.05) 50%, rgba(255,255,255,0) 70%)',
        zIndex: -1,
        pointerEvents: 'none'
      }}></div>

      <div style={{ maxWidth: '800px', zIndex: 1 }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <img 
            src="/logo.png" 
            alt="ColdDigger" 
            style={{ width: '88px', height: '88px', objectFit: 'contain', marginBottom: '2rem', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.08))' }} 
          />
          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
            marginBottom: '1.5rem',
            color: '#1d1d1f'
          }}>
            Send cold emails that <br />
            <span style={{
              background: 'linear-gradient(135deg, #93c5fd 0%, #c4b5fd 40%, #f9a8d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>actually get read.</span>
          </h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{
            fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
            color: '#6e6e73',
            lineHeight: 1.6,
            maxWidth: '540px',
            margin: '0 auto 2.5rem auto',
            fontWeight: 400
          }}>
            Upload your resume and contact list. Let AI write a highly-personalised pitch for every single person.
          </p>
          
          <button 
            onClick={handleButtonClick}
            className="btn"
            style={{
              padding: '1rem 2.5rem',
              fontSize: '1.05rem',
              borderRadius: '30px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}
          >
            {user ? 'Go to Dashboard' : 'Get Started'}
          </button>
          
          {!user && (
            <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#a1a1a6', fontWeight: 500 }}>
              Free to use • No credit card required
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;