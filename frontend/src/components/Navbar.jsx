import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();

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
            <li><a href="#" onClick={handleLogout}>Logout</a></li>
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
