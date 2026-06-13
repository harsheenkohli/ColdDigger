import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const res = await api.post("/api/request-password-reset/", { email });
      setStatus(res.data.message);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const res = await api.post("/api/reset-password/", { email, otp, new_password: newPassword });
      setStatus(res.data.message);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '520px', marginTop: '2rem' }}>
      <h2>Reset Password</h2>
      {status && <p className="success-message">{status}</p>}
      {error && <p className="error-message">{error}</p>}
      
      {step === 1 && (
        <form onSubmit={handleRequestOTP}>
          <p style={{ color: '#6e6e73', fontSize: '0.9rem', marginBottom: '0.5rem', textAlign: 'center' }}>
            Enter your email and we will send you a 6-digit OTP to reset your password.
          </p>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="btn submit-btn" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleResetPassword}>
          <p style={{ color: '#6e6e73', fontSize: '0.9rem', marginBottom: '0.5rem', textAlign: 'center' }}>
            Enter the 6-digit OTP sent to <strong>{email}</strong>
          </p>
          <input type="text" placeholder="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={6} style={{ letterSpacing: '0.2rem', textAlign: 'center', fontSize: '1.2rem', fontWeight: 600 }} />
          <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          <small style={{ color: '#888', marginTop: '-0.5rem' }}>At least 8 characters</small>
          <button className="btn submit-btn" type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}

      <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: '#6e6e73' }}>
        <Link to="/login" style={{ textDecoration: 'none' }}>Back to Login</Link>
      </p>
    </div>
  );
};

export default ForgotPassword;