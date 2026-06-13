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
      title: "No placeholders",
      description: "Every email is fully written out. No [First Name] or [Company Name] left in.",
    },
    {
      title: "Tone that fits",
      description: "A recruiter gets a different email than a CEO or an engineer. The tone shifts automatically based on job title.",
    },
    {
      title: "Your resume, attached",
      description: "Each email goes out with your resume as an attachment and your name in the sender field.",
    },
    {
      title: "Company context",
      description: "AI pulls in what it knows about the company to make each email feel specific rather than generic.",
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {features.map((f) => (
              <div key={f.title} style={{
                background: '#f5f5f7',
                padding: '2rem',
                borderRadius: '24px',
                border: '1px solid rgba(0,0,0,0.03)'
              }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#1d1d1f', marginBottom: '0.75rem', letterSpacing: '-0.01em' }}>{f.title}</h3>
                <p style={{ fontSize: '0.95rem', color: '#6e6e73', lineHeight: 1.6, margin: 0 }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default About;
