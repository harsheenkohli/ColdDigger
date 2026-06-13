import { useState } from "react";
import { useState, useEffect } from "react";
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
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const res = await api.post("/api/request-password-reset/", { email });
      setStatus(res.data.message);
      setStep(2);
      setTimer(30);
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

  const handleResendOTP = async () => {
    setResendLoading(true);
    setError("");
    setStatus("");
    try {
      await api.post("/api/request-password-reset/", { email });
      setStatus("A fresh OTP has been sent to your email.");
      setTimer(30);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend OTP.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '4rem auto', width: '100%', padding: '0 1rem' }}>
      <div className="upload-section" style={{ background: '#ffffff', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 4px 32px rgba(0, 0, 0, 0.04)', border: '1px solid rgba(0,0,0,0.04)' }}>
        <h2 style={{ textAlign: 'center', margin: '0 0 1.5rem', fontSize: '1.8rem', color: '#1d1d1f', fontWeight: 700, letterSpacing: '-0.02em' }}>Reset Password</h2>
        
        {status && <p className="success-message" style={{ marginBottom: '1.5rem' }}>{status}</p>}
        {error && (
          <div className="error-message" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <span>{error}</span>
            {error.includes("No account found") && (
              <Link to="/signup" className="btn submit-btn" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', width: 'auto', textDecoration: 'none', marginTop: '0.5rem' }}>
              <Link to="/signup" className="btn" style={{ background: '#1d1d1f', color: '#ffffff', padding: '0.6rem 1.25rem', fontSize: '0.85rem', width: 'auto', textDecoration: 'none', marginTop: '0.5rem' }}>
                Create an account
              </Link>
            )}
          </div>
        )}
        
        {step === 1 && (
          <form onSubmit={handleRequestOTP} style={{ maxWidth: '100%' }}>
            <p style={{ color: '#6e6e73', fontSize: '0.95rem', marginBottom: '1.5rem', textAlign: 'center', lineHeight: 1.6 }}>
              Enter your email and we will send you a 6-digit OTP to reset your password.
            </p>
            <div className="file-upload" style={{ marginBottom: '1.5rem' }}>
              <label style={{ color: '#1d1d1f', fontWeight: 600, fontSize: '0.85rem' }}>Email Address</label>
              <input
                type="email"
                placeholder="e.g. name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ background: '#f9f9fb' }}
              />
            </div>
            <button className="btn submit-btn" type="submit" disabled={loading} style={{ padding: '0.85rem', fontSize: '0.95rem' }}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword} style={{ maxWidth: '100%' }}>
            <p style={{ color: '#6e6e73', fontSize: '0.95rem', marginBottom: '1.5rem', textAlign: 'center', lineHeight: 1.6 }}>
              Enter the 6-digit OTP sent to <strong style={{ color: '#1d1d1f' }}>{email}</strong>
            </p>
            <div className="file-upload" style={{ marginBottom: '1rem' }}>
              <label style={{ color: '#1d1d1f', fontWeight: 600, fontSize: '0.85rem' }}>Security Code</label>
              <input 
                type="text" 
                placeholder="• • • • • •" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                required 
                maxLength={6} 
                style={{ background: '#f9f9fb', letterSpacing: '0.5rem', textAlign: 'center', fontSize: '1.2rem', fontWeight: 600 }} 
              />
            </div>
            <div className="file-upload" style={{ marginBottom: '1.5rem' }}>
              <label style={{ color: '#1d1d1f', fontWeight: 600, fontSize: '0.85rem' }}>New Password</label>
              <input 
                type="password" 
                placeholder="At least 8 characters" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
                style={{ background: '#f9f9fb' }}
              />
            </div>
            <button className="btn submit-btn" type="submit" disabled={loading} style={{ padding: '0.85rem', fontSize: '0.95rem' }}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button 
                type="button" 
                onClick={handleResendOTP} 
                disabled={resendLoading || loading}
                style={{ background: 'none', border: 'none', color: '#0071e3', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'none', fontWeight: 500 }}
                disabled={resendLoading || loading || timer > 0}
                style={{ background: 'none', border: 'none', color: (timer > 0 || resendLoading || loading) ? '#888' : '#0071e3', fontSize: '0.85rem', cursor: (timer > 0 || resendLoading || loading) ? 'not-allowed' : 'pointer', textDecoration: 'none', fontWeight: 500 }}
              >
                {resendLoading ? "Sending new code..." : "Didn't receive it? Resend OTP"}
                {resendLoading ? "Sending new code..." : (timer > 0 ? `Resend OTP in ${timer}s` : "Didn't receive it? Resend OTP")}
              </button>
            </div>
          </form>
        )}

        <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#6e6e73', textAlign: 'center' }}>
          <Link to="/login" style={{ color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;