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
        <h1>Welcome to ColdDigger</h1>
        <div className="hero-content">
          <h2>Streamline Your Job Search</h2>
          <p>
            Automate your cold emailing process and increase your chances of landing your dream job!
          </p>
          <button className="btn" onClick={handleButtonClick}>Start Application</button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;