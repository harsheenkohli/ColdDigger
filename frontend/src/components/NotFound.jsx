import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <h2>404</h2>
      <p style={{ color: '#888', margin: '1rem 0 2rem' }}>This page does not exist.</p>
      <Link to="/" className="btn" style={{ padding: '0.6rem 1.5rem' }}>Go home</Link>
    </div>
  );
};

export default NotFound;
