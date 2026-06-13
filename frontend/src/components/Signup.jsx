import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Signup = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }
    const result = await register(formData);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="container">
      <h2>Create an account</h2>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          required
        />
            <small style={{ color: '#888', marginTop: '-0.5rem' }}>At least 8 characters</small>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>
      <p>
        <Link to="/login">Already have an account? Login</Link>
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

export default Signup;
