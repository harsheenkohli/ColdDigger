import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <div style={{
        fontSize: 'clamp(7rem, 22vw, 16rem)',
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: '-0.05em',
        background: 'linear-gradient(135deg, #93c5fd 0%, #c4b5fd 40%, #f9a8d4 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: '1rem',
        userSelect: 'none',
      }}>
        404
      </div>
      <h2 style={{
        fontSize: '1.4rem',
        fontWeight: 700,
        color: '#1d1d1f',
        letterSpacing: '-0.02em',
        marginBottom: '0.5rem',
      }}>
        Nothing here
      </h2>
      <p style={{
        color: '#6e6e73',
        fontSize: '0.95rem',
        marginBottom: '2rem',
        maxWidth: '320px',
        lineHeight: 1.6,
      }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/" className="btn" style={{ padding: '0.75rem 2rem' }}>
        Go home
      </Link>
    </div>
  );
};

export default NotFound;
