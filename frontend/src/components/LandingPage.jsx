import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleButtonClick = () => {
    navigate('/login');
  };

  return (
    <div className="jumbotron">
      <div className="container landing-page">
        <img src="/logo.png" alt="ColdDigger" className="landing-logo" />
        <h1>Welcome to ColdDigger</h1>
        <div className="hero-content">
          <h2>Send cold emails that actually get read</h2>
          <p>Upload your resume, add a list of contacts and let AI write a personalised email for each one. Your resume goes out attached.</p>
          <button className="btn" onClick={handleButtonClick}>Get Started</button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;