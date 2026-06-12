const About = () => {
  const steps = [
    {
      number: "01",
      title: "Upload your resume",
      description: "Drop in your PDF resume. Gemini reads it and pulls out your real experience, skills and projects to write from.",
    },
    {
      number: "02",
      title: "Add your contacts",
      description: "Upload a CSV with columns: name, email, title and company. These are the people who will receive your emails.",
    },
    {
      number: "03",
      title: "Send",
      description: "Hit the button. Gemini writes a personalised email for each contact, adjusts the tone based on their job title and sends it with your resume attached.",
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
      description: "Gemini pulls in what it knows about the company to make each email feel specific rather than generic.",
    },
  ];

  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="container">
          <h1>Cold emailing that sounds like you</h1>
          <p className="about-subtitle">
            ColdDigger takes your resume and a list of contacts, then writes a personalised email for each one. No templates and no filler text.
          </p>
        </div>
      </section>

      <section className="about-features">
        <div className="container">
          <h2>Why it works</h2>
          <div className="features-grid">
            {features.map((f) => (
              <div className="feature-card" key={f.title}>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-steps">
        <div className="container">
          <h2>How it works</h2>
          <div className="steps-list">
            {steps.map((s) => (
              <div className="step-item" key={s.number}>
                <span className="step-number">{s.number}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
