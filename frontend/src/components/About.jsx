const About = () => {
  const steps = [
    {
      number: "01",
      title: "Upload your resume",
      description: "Drop in your PDF resume. AI reads it and pulls out your real experience, skills and projects to write from.",
    },
    {
      number: "02",
      title: "Add your contacts",
      description: "Upload a CSV with columns: name, email, title and company. These are the people who will receive your emails.",
    },
    {
      number: "03",
      title: "Send",
      description: "Hit the button. AI writes a personalised email for each contact, adjusts the tone based on their job title and sends it with your resume attached.",
    },
  ];

  const features = [
    {
      title: "Tone that fits",
      description: "A recruiter gets a different email than a CEO or an engineer. The tone shifts automatically based on job title.",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="url(#icon-grad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      )
    },
    {
      title: "Company context",
      description: "AI pulls in what it knows about the company to make each email feel specific rather than generic.",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="url(#icon-grad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      )
    },
  ];

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '4rem 2rem 6rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle background decorative gradient blob */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '800px',
        height: '800px',
        background: 'radial-gradient(circle, rgba(196,181,253,0.12) 0%, rgba(249,168,212,0.05) 50%, rgba(255,255,255,0) 70%)',
        zIndex: -1,
        pointerEvents: 'none'
      }}></div>

      <div style={{ maxWidth: '860px', width: '100%', zIndex: 1 }}>
        
        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
            marginBottom: '1.5rem',
            color: '#1d1d1f'
          }}>
            Cold emailing that <br />
            <span style={{
              background: 'linear-gradient(135deg, #93c5fd 0%, #c4b5fd 40%, #f9a8d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>sounds like you.</span>
          </h1>
          <p style={{
            fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
            color: '#6e6e73',
            lineHeight: 1.6,
            maxWidth: '600px',
            margin: '0 auto',
            fontWeight: 400
          }}>
            ColdDigger takes your resume and a list of contacts, then writes a fully personalised email for each one. No templates, no placeholders, and no filler text.
          </p>
        </div>

        {/* How it works */}
        <div style={{ marginBottom: '6rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '2.5rem', color: '#1d1d1f', textAlign: 'center' }}>
            How it works
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {steps.map((s) => (
              <div key={s.number} style={{ 
                display: 'flex', 
                gap: '1.5rem', 
                alignItems: 'flex-start',
                background: '#ffffff',
                padding: '2rem',
                borderRadius: '24px',
                boxShadow: '0 4px 32px rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.04)'
              }}>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  lineHeight: 1,
                  background: 'linear-gradient(135deg, #93c5fd 0%, #c4b5fd 40%, #f9a8d4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  minWidth: '4rem'
                }}>
                  {s.number}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1d1d1f', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>{s.title}</h3>
                  <p style={{ fontSize: '1rem', color: '#6e6e73', lineHeight: 1.6, margin: 0 }}>{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why it works */}
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '2.5rem', color: '#1d1d1f', textAlign: 'center' }}>
            Why it works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
              <defs>
                <linearGradient id="icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="40%" stopColor="#c4b5fd" />
                  <stop offset="100%" stopColor="#f9a8d4" />
                </linearGradient>
              </defs>
            </svg>
            {features.map((f) => (
              <div key={f.title} style={{
                background: '#ffffff',
                padding: '3rem 2rem',
                borderRadius: '24px',
                border: '1px solid rgba(0,0,0,0.04)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(147,197,253,0.1) 0%, rgba(196,181,253,0.1) 40%, rgba(249,168,212,0.1) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.5rem',
                  border: '1px solid rgba(196,181,253,0.2)'
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1d1d1f', marginBottom: '1rem', letterSpacing: '-0.01em' }}>{f.title}</h3>
                <p style={{ fontSize: '1rem', color: '#6e6e73', lineHeight: 1.6, margin: 0 }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default About;
