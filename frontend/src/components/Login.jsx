import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(formData.email, formData.password);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Log in</h2>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            style={{ width: '100%', paddingRight: '3rem' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6e6e73',
              fontSize: '0.8rem',
              padding: '0',
              fontWeight: 500,
              borderRadius: 0,
            }}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>
      <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#6e6e73' }}>
        <Link to="/signup">New here? Create an account</Link>
      </p>
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#ffc107', borderRadius: '8px', border: '1px solid #e0a800', textAlign: 'left' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#000', lineHeight: '1.6' }}>
          <strong>Test Credentials</strong><br />
          Email: colddigger14@gmail.com<br />
          Password: WeWillWin
        </p>
      </div>
    </div>
  );
};

export default Login;
