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
  const [profileError, setProfileError] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [sendError, setSendError] = useState("");
  const [position, setPosition] = useState("");
  const [contactCount, setContactCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [jobProgress, setJobProgress] = useState(null);
  const [preview, setPreview] = useState(null);
  const [editablePreview, setEditablePreview] = useState(null);
  const [useDraftForAll, setUseDraftForAll] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [savedResume, setSavedResume] = useState('');
  const [extraAttachments, setExtraAttachments] = useState([]);
  const [attachmentsContext, setAttachmentsContext] = useState('');
  const [lastJob, setLastJob] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [replaceContacts, setReplaceContacts] = useState(true);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [hasCsvFile, setHasCsvFile] = useState(false);
  const [pendingExtras, setPendingExtras] = useState({});
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
      setSelectedIds(new Set(res.data.contacts.filter(c => !c.emailed_at).map(c => c.id)));
    } catch (err) {
      // silently ignore
    }
  };

  const fetchResume = async () => {
    try {
      const res = await api.get('/api/user-resume/');
      const filename = res.data.resume_filename || res.data.resume_url.split('/').pop().split('?')[0];
      setSavedResume(decodeURIComponent(filename));
      setExtraAttachments(res.data.extra_attachments || []);
      setAttachmentsContext(res.data.attachments_context || '');
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
    setProfileError("");
    setUploadStatus("");

    const resumeFile = document.getElementById('resume-upload').files[0];
    const csvFile = document.getElementById('csv-upload').files[0];

    const extra1 = document.getElementById('extra-upload-1')?.files[0];
    const extra2 = document.getElementById('extra-upload-2')?.files[0];
    const extra3 = document.getElementById('extra-upload-3')?.files[0];

    if (!position && !resumeFile) {
      setProfileError("Please provide either a position or upload a resume");
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
    if (extra1) formData.append('extra_1', extra1);
    if (extra2) formData.append('extra_2', extra2);
    if (extra3) formData.append('extra_3', extra3);
    formData.append('attachments_context', attachmentsContext);
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
      
      // Clear the extra inputs after save so they don't re-upload
      [1, 2, 3].forEach(id => { const el = document.getElementById(`extra-upload-${id}`); if (el) el.value = ''; });
      setPendingExtras({});
      
      if (csvFile) fetchContacts();
      if (csvFile) {
        const csvEl = document.getElementById('csv-upload');
        if (csvEl) csvEl.value = '';
        setHasCsvFile(false);
        fetchContacts();
      }
      if (resumeFile) fetchResume();
      fetchResume(); // Always fetch to guarantee we see our new attachments
    } catch (err) {
      setProfileError(err.response?.data?.error || 'Upload failed');
    }
  };

  const handleConnectGmail = async () => {
    try {
      const res = await api.get('/api/google/login/');
      window.location.href = res.data.auth_url;
    } catch (err) {
      setSendError(err.response?.data?.error || 'Failed to initiate Google Login. Please try again.');
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
      setProfileError('Could not clear contacts.');
    }
  };

  const handleDeleteExtra = async (id) => {
    if (!window.confirm("Delete this attachment?")) return;
    try {
      const formData = new FormData();
      formData.append(`delete_extra_${id}`, 'true');
      await api.post('/api/upload-files/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchResume(); // Refresh list immediately
    } catch (err) {
      setProfileError('Failed to delete attachment.');
    }
  };

  const handleDownloadFile = async (e, isExtra = false, extraId = null, filename) => {
    e.preventDefault();
    try {
      const urlPath = isExtra ? `/api/download-resume/?extra=${extraId}` : `/api/download-resume/`;
      const res = await api.get(urlPath, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create an ephemeral link to force a robust download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || 'document.pdf');
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setProfileError('Could not download file.');
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
    setEditablePreview(null);
    setPreviewError('');
    try {
      const firstSelected = contacts.find(c => selectedIds.has(c.id)) || contacts[0];
      const res = await api.post('/api/preview-email/', { contact_id: firstSelected?.id || null });
      setPreview(res.data);
      // Prefer the actual AI response, fallback to template only if empty
      setEditablePreview({
        subject: res.data.subject || res.data.template_subject || '',
        body: res.data.body || res.data.template_body || '',
      });
    } catch (err) {
      setPreviewError(err.response?.data?.error || 'Could not generate preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSendEmails = async () => {
    setSending(true);
    setSendError('');
    setConfirmSend(false);
    setJobProgress(null);

    try {
      const response = await api.post('/api/send-emails/', {
        contact_ids: Array.from(selectedIds),
        use_draft_for_all: useDraftForAll,
        draft_subject: editablePreview?.subject || preview?.subject || '',
        draft_body: editablePreview?.body || preview?.body || '',
      });
      const jobId = response.data.job_id;

      pollRef.current = setInterval(async () => {
        try {
          const status = await api.get(`/api/email-job/${jobId}/`);
          setJobProgress(status.data);
          if (status.data.status === 'done' || status.data.status === 'failed') {
            clearInterval(pollRef.current);
            setSending(false);
            setPreview(null);
            setEditablePreview(null);
          }
        } catch (err) {
          clearInterval(pollRef.current);
          setSending(false);
          setSendError('Lost connection to job. Check back later.');
        }
      }, 3000);
    } catch (err) {
      setSendError(err.response?.data?.error || 'Failed to start email job');
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

  const hasExtraFiles = extraAttachments.length > 0 || Object.values(pendingExtras).some(Boolean);

  return (
    <div className="container">
      <h3>Dashboard</h3>
      <h2>Welcome, <span>{user?.name ? toTitleCase(user.name) : ''}</span>!</h2>

      <form onSubmit={handleFileSubmit}>
        <div className="upload-section">
          <h4>Profile</h4>
          <div className="file-upload">
            <label htmlFor="position-input">Position applying for <span style={{ color: '#ff3b30' }}>*</span></label>
            <input
              type="text"
              id="position-input"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g. Software Engineer Intern"
            />
          </div>
          <div className="file-upload">
            <label htmlFor="resume-upload">Resume (PDF) <span style={{ color: '#ff3b30' }}>*</span></label>
            <input type="file" id="resume-upload" accept=".pdf" />
            {savedResume && (
              <small>
                <button type="button" onClick={(e) => handleDownloadFile(e, false, null, savedResume)} style={{ background: 'none', border: 'none', color: '#0071e3', fontSize: '0.82rem', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>
                  {savedResume}
                </button>
              </small>
            )}
          </div>

          <div className="file-upload" style={{ marginTop: '0.5rem' }}>
            <label>Additional Attachments (Optional, max 3)</label>
            <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '-0.3rem', marginBottom: '0.5rem' }}>
              Cover letters, Portfolios or LORs. These will be sent along with your resume.
            </p>
            
            {extraAttachments.length > 0 && (
              <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {extraAttachments.map((file) => (
                  <div key={file.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                    <button type="button" onClick={(e) => handleDownloadFile(e, true, file.id, file.filename)} style={{ background: 'none', border: 'none', color: '#0071e3', fontSize: '0.82rem', padding: 0, cursor: 'pointer', textDecoration: 'underline', textAlign: 'left', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.filename}
                    </button>
                    <button type="button" onClick={() => handleDeleteExtra(file.id)} style={{ background: 'none', border: 'none', color: '#ff3b30', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500, paddingLeft: '1rem' }}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {[1, 2, 3].map(slotId => {
              const isUsed = extraAttachments.find(e => e.id === slotId);
              if (isUsed) return null;
              return (
                <input 
                  key={slotId} 
                  type="file" 
                  id={`extra-upload-${slotId}`} 
                  accept=".pdf" 
                  style={{ marginBottom: '0.5rem' }} 
                  onChange={(e) => setPendingExtras(prev => ({ ...prev, [slotId]: e.target.files.length > 0 }))}
                />
              );
            })}
            
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', color: '#6e6e73', fontWeight: 500 }}>Mention what these are (Optional)</label>
              <input 
                type="text" 
                value={attachmentsContext} 
                onChange={(e) => setAttachmentsContext(e.target.value)} 
                placeholder="e.g. Portfolio and Letter of Recommendation" 
                disabled={!hasExtraFiles}
                style={{ 
                  background: hasExtraFiles ? '#f9f9fb' : '#e5e5ea', 
                  width: '100%', 
                  cursor: hasExtraFiles ? 'text' : 'not-allowed',
                  opacity: hasExtraFiles ? 1 : 0.6
                }} 
              />
              <small style={{ color: '#888', marginTop: '-0.2rem' }}>AI will mention these in the email so the recruiter knows to look for them.</small>
            </div>
          </div>

          <div className="file-upload">
            <label htmlFor="csv-upload">Contact list (CSV)</label>
            <input type="file" id="csv-upload" accept=".csv" onChange={(e) => setHasCsvFile(e.target.files.length > 0)} />
            <small>Columns: name, email, title, company</small>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: hasCsvFile ? 'pointer' : 'not-allowed', fontSize: '0.82rem', color: hasCsvFile ? '#888' : '#555', opacity: hasCsvFile ? 1 : 0.6 }}>
                <input
                  type="checkbox"
                  checked={replaceContacts}
                  onChange={(e) => setReplaceContacts(e.target.checked)}
                  disabled={!hasCsvFile}
                  style={{ width: 'auto', cursor: hasCsvFile ? 'pointer' : 'not-allowed' }}
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
        {profileError && <p className="error-message" style={{ marginTop: '1rem', marginBottom: 0 }}>{profileError}</p>}
        {uploadStatus && <p className="success-message" style={{ marginTop: '1rem', marginBottom: 0 }}>{uploadStatus}</p>}
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
                  <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem', color: '#888', fontWeight: 500 }}>Email</th>
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
                    <td style={{ padding: '0.3rem 0.5rem', color: '#ccc' }}>{c.email}</td>
                    <td style={{ padding: '0.3rem 0.5rem', color: '#ccc' }}>{c.company}</td>
                    <td style={{ padding: '0.3rem 0.5rem', color: '#999' }}>{c.title}</td>
                    <td style={{ padding: '0.3rem 0.5rem', textAlign: 'center' }}>
                      {c.emailed_at ? (
                        <span style={{ color: '#66fcf1', fontSize: '0.75rem' }}>Yes</span>
                      ) : (
                        <span style={{ color: '#555', fontSize: '0.75rem' }}>No</span>
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
          <>
            <button
              type="button"
              className="btn"
              onClick={handlePreview}
              disabled={loadingPreview || sending || !savedResume}
              style={{ marginBottom: '0.75rem', width: '100%' }}
            >
              {loadingPreview ? 'Generating preview...' : 'Preview one email'}
            </button>
            {previewError && <p className="error-message" style={{ marginTop: '-0.25rem', marginBottom: '0.75rem' }}>{previewError}</p>}
          </>
        )}

        {preview && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', textAlign: 'left' }}>
            <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>
              Preview for {preview.recipient.name} — {preview.recipient.title} at {preview.recipient.company}
            </p>
            {preview.error && (
              <div style={{ background: 'rgba(220,53,69,0.1)', border: '1px solid rgba(220,53,69,0.3)', color: '#ff6b6b', padding: '0.75rem', borderRadius: '6px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                <strong>Warning:</strong> {preview.error}
              </div>
            )}
            <p style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '0.75rem' }}>
              This is a sample draft. By default, each sent email is personalized per recipient.
            </p>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Subject
            </label>
            <input
              type="text"
              value={editablePreview?.subject || ''}
              onChange={(e) => setEditablePreview((current) => ({ ...(current || {}), subject: e.target.value }))}
              style={{ width: '100%', marginBottom: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.12)', background: '#ffffff', color: '#000000' }}
            />
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Body
            </label>
            <textarea
              value={editablePreview?.body || ''}
              onChange={(e) => setEditablePreview((current) => ({ ...(current || {}), body: e.target.value }))}
              rows={10}
              style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.12)', background: '#ffffff', color: '#000000', resize: 'vertical', whiteSpace: 'pre-wrap' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setEditablePreview({ subject: preview.subject || '', body: preview.body || '' })}
                style={{ flex: 1 }}
              >
                Reset draft
              </button>
            </div>
            <div style={{ marginTop: '0.75rem', color: '#bbb', fontSize: '0.82rem' }}>
              <div style={{ marginBottom: '0.35rem' }}>Allowed placeholders (use these in subject/body):</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <code style={{ background: 'rgba(255,255,255,0.03)', padding: '0.25rem 0.4rem', borderRadius: '4px' }}>{'{first_name}'}</code>
                <code style={{ background: 'rgba(255,255,255,0.03)', padding: '0.25rem 0.4rem', borderRadius: '4px' }}>{'{last_name}'}</code>
                <code style={{ background: 'rgba(255,255,255,0.03)', padding: '0.25rem 0.4rem', borderRadius: '4px' }}>{'{full_name}'}</code>
                <code style={{ background: 'rgba(255,255,255,0.03)', padding: '0.25rem 0.4rem', borderRadius: '4px' }}>{'{company}'}</code>
                <code style={{ background: 'rgba(255,255,255,0.03)', padding: '0.25rem 0.4rem', borderRadius: '4px' }}>{'{title}'}</code>
                <code style={{ background: 'rgba(255,255,255,0.03)', padding: '0.25rem 0.4rem', borderRadius: '4px' }}>{'{position}'}</code>
                <code style={{ background: 'rgba(255,255,255,0.03)', padding: '0.25rem 0.4rem', borderRadius: '4px' }}>{'{sender_first_name}'}</code>
              </div>
              <div style={{ marginTop: '0.5rem', color: '#999' }}>Example: "Hi {'{first_name}'}, I'm interested in the {'{position}'} role at {'{company}'}."</div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.8rem', color: '#ccc' }}>
              <input
                type="checkbox"
                checked={useDraftForAll}
                onChange={(e) => setUseDraftForAll(e.target.checked)}
              />
              Reuse this edited draft for all selected contacts
            </label>
            <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem', marginBottom: 0 }}>
              Default send mode personalizes each email separately. Turn this on only if you want the exact edited draft reused.
            </p>
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
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#ccc' }}>{r.name} ({r.email}) — {r.company}</span>
                    <span style={{ color: r.status === 'sent' ? '#28a745' : '#dc3545' }}>{r.status}</span>
                    </div>
                    {r.error && (
                      <span style={{ color: '#dc3545', fontSize: '0.75rem', marginTop: '0.2rem' }}>Error: {r.error}</span>
                    )}
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
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#ccc' }}>{r.name} ({r.email}) - {r.company}</span>
                    <span style={{ color: r.status === 'sent' ? '#28a745' : '#dc3545' }}>{r.status}</span>
                    </div>
                    {r.error && (
                      <span style={{ color: '#dc3545', fontSize: '0.75rem', marginTop: '0.2rem' }}>Error: {r.error}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
    
    <div style={{ marginBottom: '1rem' }}>
      <button type="button" className="btn" onClick={handleConnectGmail} style={{ width: '100%', background: '#4285F4', color: 'white', border: 'none' }}>
        Connect Gmail (Required to send)
      </button>
    </div>

        {!confirmSend ? (
          <>
            <button
              type="button"
              className="btn submit-btn"
              onClick={() => setConfirmSend(true)}
              disabled={sending || selectedIds.size === 0 || !savedResume}
            >
              {sending ? `Sending... ${jobProgress ? `${jobProgress.sent + jobProgress.failed}/${jobProgress.total}` : ''}` : 'Send cold emails'}
            </button>
            {sendError && <p className="error-message" style={{ marginTop: '0.75rem', marginBottom: 0 }}>{sendError}</p>}
          </>
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
            {sendError && <p className="error-message" style={{ marginTop: '0.25rem', marginBottom: 0 }}>{sendError}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
