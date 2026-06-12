import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const toTitleCase = (str) => {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

const Dashboard = () => {
  const { user } = useAuth();
  const [uploadStatus, setUploadStatus] = useState("");
  const [error, setError] = useState("");
  const [position, setPosition] = useState("");
  const [contactCount, setContactCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [jobProgress, setJobProgress] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [savedResume, setSavedResume] = useState('');
  const [lastJob, setLastJob] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [replaceContacts, setReplaceContacts] = useState(true);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    Promise.all([fetchPosition(), fetchContacts(), fetchResume(), fetchLastJob()])
      .finally(() => setPageLoading(false));
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const fetchPosition = async () => {
    try {
      const response = await api.get('/api/get-position/');
      if (response.data.position) setPosition(response.data.position);
    } catch (err) {
      // no position saved yet
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await api.get('/api/contacts/');
      setContactCount(res.data.count);
      setContacts(res.data.contacts);
      setSelectedIds(new Set(res.data.contacts.map(c => c.id)));
    } catch (err) {
      // silently ignore
    }
  };

  const [savedResumeUrl, setSavedResumeUrl] = useState('');

  const fetchResume = async () => {
    try {
      const res = await api.get('/api/user-resume/');
      const filename = res.data.resume_filename || res.data.resume_url.split('/').pop().split('?')[0];
      setSavedResume(decodeURIComponent(filename));
      setSavedResumeUrl('/api/download-resume/');
    } catch (err) {
      // no resume yet
    }
  };

  const fetchLastJob = async () => {
    try {
      const res = await api.get('/api/last-email-job/');
      if (res.data.job) setLastJob(res.data.job);
    } catch (err) {
      // silently ignore
    }
  };

  const handleFileSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setUploadStatus("");

    const resumeFile = document.getElementById('resume-upload').files[0];
    const csvFile = document.getElementById('csv-upload').files[0];

    if (!position && !resumeFile) {
      setError("Please provide either a position or upload a resume");
      return;
    }

    if (csvFile && replaceContacts && contactCount > 0 && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }

    setConfirmReplace(false);
    const formData = new FormData();
    if (csvFile) formData.append('csv_file', csvFile);
    if (resumeFile) formData.append('resume', resumeFile);
    if (position) formData.append('position', position);
    formData.append('replace_contacts', replaceContacts ? 'true' : 'false');

    try {
      const response = await api.post('/api/upload-files/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const added = response.data.new_contacts_added;
      setUploadStatus(
        added
          ? `Saved. ${added} contact${added === 1 ? '' : 's'} ${replaceContacts ? 'loaded' : 'added'}.`
          : 'Saved.'
      );
      if (csvFile) fetchContacts();
      if (resumeFile) fetchResume();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    }
  };

  const handleClearContacts = async () => {
    try {
      await api.delete('/api/clear-contacts/');
      setContactCount(0);
      setContacts([]);
      setSelectedIds(new Set());
      setUploadStatus('Contact list cleared.');
    } catch (err) {
      setError('Could not clear contacts.');
    }
  };

  const toggleContact = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)));
    }
  };

  const handlePreview = async () => {
    setLoadingPreview(true);
    setPreview(null);
    setError('');
    try {
      const firstSelected = contacts.find(c => selectedIds.has(c.id)) || contacts[0];
      const res = await api.post('/api/preview-email/', { contact_id: firstSelected?.id || null });
      setPreview(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not generate preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSendEmails = async () => {
    setSending(true);
    setError('');
    setConfirmSend(false);
    setJobProgress(null);
    setPreview(null);

    try {
      const response = await api.post('/api/send-emails/', { contact_ids: Array.from(selectedIds) });
      const jobId = response.data.job_id;

      pollRef.current = setInterval(async () => {
        try {
          const status = await api.get(`/api/email-job/${jobId}/`);
          setJobProgress(status.data);
          if (status.data.status === 'done' || status.data.status === 'failed') {
            clearInterval(pollRef.current);
            setSending(false);
          }
        } catch (err) {
          clearInterval(pollRef.current);
          setSending(false);
          setError('Lost connection to job. Check back later.');
        }
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start email job');
      setSending(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="container" style={{ padding: '4rem', color: '#888' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="container">
      <h3>Dashboard</h3>
      <h2>Welcome, <span>{user?.name ? toTitleCase(user.name) : ''}</span>!</h2>

      {error && <p className="error-message">{error}</p>}
      {uploadStatus && <p className="success-message">{uploadStatus}</p>}

      <form onSubmit={handleFileSubmit}>
        <div className="upload-section">
          <h4>Profile</h4>
          <div className="file-upload">
            <label htmlFor="position-input">Position applying for</label>
            <input
              type="text"
              id="position-input"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g. Software Engineer Intern"
            />
          </div>
          <div className="file-upload">
            <label htmlFor="resume-upload">Resume (PDF)</label>
            <input type="file" id="resume-upload" accept=".pdf" />
            {savedResume && (
              <small>
                <a href={savedResumeUrl} target="_blank" rel="noreferrer" style={{ color: '#0071e3', fontSize: '0.82rem' }}>
                  {savedResume}
                </a>
              </small>
            )}
          </div>
          <div className="file-upload">
            <label htmlFor="csv-upload">Contact list (CSV)</label>
            <input type="file" id="csv-upload" accept=".csv" />
            <small>Columns: name, email, title, company</small>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', color: '#888' }}>
                <input
                  type="checkbox"
                  checked={replaceContacts}
                  onChange={(e) => setReplaceContacts(e.target.checked)}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
                Replace existing contacts
              </label>
            </div>
            {confirmReplace && (
              <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(240,165,0,0.08)', border: '1px solid rgba(240,165,0,0.3)', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.85rem', color: '#f0a500', marginBottom: '0.5rem' }}>
                  This will delete your {contactCount} existing contact{contactCount === 1 ? '' : 's'} and replace them. Are you sure?
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn" style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', flex: 1 }}>
                    Yes, replace
                  </button>
                  <button type="button" className="btn" onClick={() => setConfirmReplace(false)} style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', flex: 1 }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <button type="submit" className="btn submit-btn">Save Profile</button>
      </form>

      <div className="upload-section" style={{ marginTop: '2rem', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h4 style={{ margin: 0 }}>
            Contact list
            {contactCount > 0 && (
              <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#999', marginLeft: '0.5rem' }}>
                {contactCount} contact{contactCount === 1 ? '' : 's'}
              </span>
            )}
          </h4>
          {contactCount > 0 && (
            <button
              type="button"
              className="btn"
              onClick={handleClearContacts}
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
            >
              Clear list
            </button>
          )}
        </div>
        {contactCount === 0 ? (
          <p style={{ fontSize: '0.9rem', color: '#999' }}>No contacts loaded. Upload a CSV above.</p>
        ) : (
          <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '0.5rem', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#888' }}>
              <span>{selectedIds.size} of {contacts.length} selected</span>
              <button type="button" className="btn" onClick={toggleAll} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                {selectedIds.size === contacts.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '0.3rem 0.5rem', width: '2rem' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === contacts.length && contacts.length > 0}
                      onChange={toggleAll}
                      style={{ cursor: 'pointer', width: 'auto' }}
                    />
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem', color: '#888', fontWeight: 500 }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem', color: '#888', fontWeight: 500 }}>Company</th>
                  <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem', color: '#888', fontWeight: 500 }}>Title</th>
                  <th style={{ textAlign: 'center', padding: '0.3rem 0.5rem', color: '#888', fontWeight: 500 }}>Emailed</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: selectedIds.has(c.id) ? 1 : 0.4, cursor: 'pointer' }}
                    onClick={() => toggleContact(c.id)}
                  >
                    <td style={{ padding: '0.3rem 0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleContact(c.id)}
                        onClick={e => e.stopPropagation()}
                        style={{ cursor: 'pointer', width: 'auto' }}
                      />
                    </td>
                    <td style={{ padding: '0.3rem 0.5rem', color: '#ccc' }}>{c.name}</td>
                    <td style={{ padding: '0.3rem 0.5rem', color: '#ccc' }}>{c.company}</td>
                    <td style={{ padding: '0.3rem 0.5rem', color: '#999' }}>{c.title}</td>
                    <td style={{ padding: '0.3rem 0.5rem', textAlign: 'center' }}>
                      {c.emailed_at ? (
                        <span style={{ color: '#66fcf1', fontSize: '0.75rem' }}>Sent</span>
                      ) : (
                        <span style={{ color: '#555', fontSize: '0.75rem' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="upload-section" style={{ marginTop: '2rem', width: '100%' }}>
        <h4>Send cold emails</h4>
        <p style={{ fontSize: '0.9rem', color: '#6e6e73', marginBottom: '1rem' }}>
          AI writes a personalised email for each contact based on your resume, their title and their company. Your resume is attached.
        </p>
        {!savedResume && (
          <p style={{ fontSize: '0.82rem', color: '#ff3b30', marginBottom: '0.75rem' }}>
            Upload a resume above before sending.
          </p>
        )}

        {contactCount > 0 && (
          <button
            type="button"
            className="btn"
            onClick={handlePreview}
            disabled={loadingPreview || sending || !savedResume}
            style={{ marginBottom: '0.75rem', width: '100%' }}
          >
            {loadingPreview ? 'Generating preview...' : 'Preview one email'}
          </button>
        )}

        {preview && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', textAlign: 'left' }}>
            <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>
              Preview for {preview.recipient.name} — {preview.recipient.title} at {preview.recipient.company}
            </p>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Subject: {preview.subject}</p>
            <pre style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap', color: '#ccc', margin: 0 }}>{preview.body}</pre>
          </div>
        )}

        {jobProgress && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.9rem', color: jobProgress.status === 'done' ? '#28a745' : '#f0a500' }}>
              {jobProgress.status === 'done'
                ? `Done. Sent: ${jobProgress.sent}, Failed: ${jobProgress.failed}`
                : `Sending... ${jobProgress.sent + jobProgress.failed} / ${jobProgress.total}`}
            </p>
            {jobProgress.results && jobProgress.results.length > 0 && (
              <div style={{ maxHeight: '180px', overflowY: 'auto', marginTop: '0.5rem' }}>
                {jobProgress.results.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.2rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: '#ccc' }}>{r.name} — {r.company}</span>
                    <span style={{ color: r.status === 'sent' ? '#28a745' : '#dc3545' }}>{r.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!jobProgress && lastJob && lastJob.status === 'done' && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.4rem' }}>Last run: Sent {lastJob.sent}, Failed {lastJob.failed}</p>
            {lastJob.results && lastJob.results.length > 0 && (
              <div style={{ maxHeight: '140px', overflowY: 'auto' }}>
                {lastJob.results.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.2rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: '#ccc' }}>{r.name} - {r.company}</span>
                    <span style={{ color: r.status === 'sent' ? '#28a745' : '#dc3545' }}>{r.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!confirmSend ? (
          <button
            type="button"
            className="btn submit-btn"
            onClick={() => setConfirmSend(true)}
            disabled={sending || selectedIds.size === 0 || !savedResume}
          >
            {sending ? `Sending... ${jobProgress ? `${jobProgress.sent + jobProgress.failed}/${jobProgress.total}` : ''}` : 'Send cold emails'}
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ fontSize: '0.9rem', color: '#f0a500' }}>
              This will send to {selectedIds.size} contact{selectedIds.size === 1 ? '' : 's'}. Are you sure?
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" className="btn" onClick={handleSendEmails} disabled={sending} style={{ flex: 1 }}>
                Yes, send
              </button>
              <button type="button" className="btn" onClick={() => setConfirmSend(false)} disabled={sending} style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
