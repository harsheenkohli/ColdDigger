import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const Profile = () => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");
    setError("");
    try {
      await api.post("/api/update-profile/", { name });
      setStatus("Profile updated successfully. Refreshing...");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile.");
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '520px', marginTop: '2rem' }}>
      <h2>Edit Profile</h2>
      {status && <p className="success-message">{status}</p>}
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="file-upload">
          <label>Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="file-upload">
          <label>Email (Cannot be changed)</label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
            style={{ backgroundColor: '#f5f5f7', color: '#888', cursor: 'not-allowed', border: '1px solid rgba(0,0,0,0.06)' }}
          />
        </div>
        <button type="submit" className="btn submit-btn" disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
};

export default Profile;