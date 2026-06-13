import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const Profile = () => {
  const { user } = useAuth();
  
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.name) {
      const parts = user.name.trim().split(" ");
      setFirstName(parts[0] || "");
      if (parts.length > 1) {
        setLastName(parts[parts.length - 1]);
        if (parts.length > 2) {
          setMiddleName(parts.slice(1, -1).join(" "));
        }
      }
    }
  }, [user?.name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");
    setError("");
    
    const fullName = [firstName.trim(), middleName.trim(), lastName.trim()]
      .filter(Boolean)
      .join(" ");

    try {
      await api.post("/api/update-profile/", { name: fullName });
      setStatus("Profile updated successfully. Refreshing...");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile.");
      setLoading(false);
    }
  };

  const getInitials = () => {
    const first = firstName.charAt(0) || user?.name?.charAt(0) || "U";
    const last = lastName.charAt(0) || "";
    return (first + last).toUpperCase().substring(0, 2);
  };

  return (
    <div style={{ maxWidth: '640px', margin: '2rem auto', width: '100%', padding: '0 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          width: '88px', height: '88px', borderRadius: '50%', margin: '0 auto 1.25rem',
          background: 'linear-gradient(135deg, #93c5fd 0%, #c4b5fd 40%, #f9a8d4 100%)',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.2rem', fontWeight: 600, boxShadow: '0 8px 24px rgba(196, 181, 253, 0.4)'
        }}>
          {getInitials()}
        </div>
        <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#1d1d1f', fontWeight: 700, letterSpacing: '-0.02em' }}>Personal Information</h2>
        <p style={{ color: '#6e6e73', fontSize: '0.95rem', marginTop: '0.5rem' }}>Manage your profile details and display name.</p>
      </div>

      <div className="upload-section" style={{ background: '#ffffff', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 4px 32px rgba(0, 0, 0, 0.04)', border: '1px solid rgba(0,0,0,0.04)' }}>
        {status && <p className="success-message" style={{ marginBottom: '1.5rem' }}>{status}</p>}
        {error && <p className="error-message" style={{ marginBottom: '1.5rem' }}>{error}</p>}
        
        <form onSubmit={handleSubmit} style={{ maxWidth: '100%' }}>
          <div style={{ display: 'flex', gap: '1rem', width: '100%', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div className="file-upload" style={{ flex: '1 1 200px', marginBottom: 0 }}>
              <label style={{ color: '#1d1d1f', fontWeight: 600, fontSize: '0.85rem' }}>First Name</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={{ background: '#f9f9fb' }} />
            </div>
            <div className="file-upload" style={{ flex: '1 1 200px', marginBottom: 0 }}>
              <label style={{ color: '#1d1d1f', fontWeight: 600, fontSize: '0.85rem' }}>Last Name</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={{ background: '#f9f9fb' }} />
            </div>
          </div>
          
          <div className="file-upload" style={{ marginBottom: '1.5rem' }}>
            <label style={{ color: '#1d1d1f', fontWeight: 600, fontSize: '0.85rem' }}>
              Middle Name <span style={{ color: '#999', fontWeight: 400 }}>(Optional)</span>
            </label>
            <input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} style={{ background: '#f9f9fb' }} />
          </div>
          
          <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '2rem 0' }}></div>
          
          <div className="file-upload">
            <label style={{ color: '#1d1d1f', fontWeight: 600, fontSize: '0.85rem' }}>Email Address</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              style={{ backgroundColor: '#f5f5f7', color: '#888', cursor: 'not-allowed', border: '1px solid rgba(0,0,0,0.04)' }}
            />
            <small style={{ color: '#888', marginTop: '0.25rem' }}>Used for authentication. Cannot be changed.</small>
          </div>
          
          <button type="submit" className="btn submit-btn" disabled={loading} style={{ marginTop: '1rem', padding: '0.85rem', fontSize: '0.95rem' }}>
            {loading ? "Saving changes..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;