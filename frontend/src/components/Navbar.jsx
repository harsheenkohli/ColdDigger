import { useState, useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    const result = await logout();
    if (!result.success) {
      console.error(result.error);
    }
  };

  const activeStyle = ({ isActive }) => ({
    color: isActive ? '#66fcf1' : undefined,
  });

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <img src="/logo.png" alt="ColdDigger" className="navbar-logo" />
        <span>ColdDigger</span>
      </NavLink>
      <ul>
        <li><NavLink to="/" style={activeStyle} end>Home</NavLink></li>
        <li><NavLink to="/about" style={activeStyle}>About</NavLink></li>
        <li><NavLink to="/contact" style={activeStyle}>Contact</NavLink></li>
        {user ? (
          <>
            <li><NavLink to="/dashboard" style={activeStyle}>Dashboard</NavLink></li>
            <li style={{ position: "relative", display: "flex", alignItems: "center" }} ref={dropdownRef}>
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #93c5fd 0%, #c4b5fd 40%, #f9a8d4 100%)',
                  border: 'none', color: 'white', fontWeight: 600, fontSize: '0.95rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                {getInitials(user.name)}
              </button>
              {dropdownOpen && (
                <div style={{
                  position: 'absolute', top: '120%', right: '0',
                  background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)',
                  borderRadius: '12px', padding: '0.5rem', minWidth: '160px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.05)',
                  border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '0.25rem',
                  zIndex: 1000
                }}>
                  <NavLink to="/profile" onClick={() => setDropdownOpen(false)} style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', color: '#1d1d1f', fontSize: '0.85rem', textDecoration: 'none', display: 'block', transition: 'background 0.1s' }} className="dropdown-item">Edit Profile</NavLink>
                  <button onClick={() => { setDropdownOpen(false); handleLogout(); }} style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', color: '#ff3b30', fontSize: '0.85rem', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%', fontFamily: 'inherit', fontWeight: 600, transition: 'background 0.1s' }} className="dropdown-item">Logout</button>
                </div>
              )}
            </li>
          </>
        ) : (
          <>
            <li><NavLink to="/login" style={activeStyle}>Log in</NavLink></li>
            <li><NavLink to="/signup" style={activeStyle}>Sign up</NavLink></li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
