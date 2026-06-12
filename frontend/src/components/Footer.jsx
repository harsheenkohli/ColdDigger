const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>ColdDigger</h3>
          <p>Personalised cold emails, sent in seconds.</p>
        </div>
        <div className="footer-section">
          <h3>Links</h3>
          <div className="footer-links">
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} ColdDigger. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
