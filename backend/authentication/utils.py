# utils.py
import csv
import io
import os
import chardet
from .models import CompanyContact

def process_csv_file(csv_file, user, replace=True):
    """Process CSV file — replaces or appends to the user's existing contacts."""
    raw_data = csv_file.read()
    result = chardet.detect(raw_data)
    encoding = result['encoding']

    try:
        decoded_file = raw_data.decode(encoding)
    except UnicodeDecodeError:
        for enc in ['utf-8-sig', 'utf-16', 'iso-8859-1', 'cp1252']:
            try:
                decoded_file = raw_data.decode(enc)
                encoding = enc
                break
            except UnicodeDecodeError:
                continue
        else:
            raise ValueError("Unable to determine file encoding. Please ensure the file is properly encoded.")

    io_string = io.StringIO(decoded_file)
    reader = csv.DictReader(io_string)

    required_fields = {'name', 'email', 'title', 'company'}
    headers = set(reader.fieldnames) if reader.fieldnames else set()
    if not required_fields.issubset(headers):
        missing_fields = required_fields - headers
        raise ValueError(f"Missing required fields in CSV: {', '.join(missing_fields)}")

    rows = [row for row in reader]

    if replace:
        CompanyContact.objects.filter(user=user).delete()

    if not replace:
        seen_emails = set(CompanyContact.objects.filter(user=user).values_list('email', flat=True))
    else:
        seen_emails = set()

    new_contacts = []
    for row in rows:
        email = row['email'].strip()
        if not email or email in seen_emails:
            continue
        seen_emails.add(email)
        new_contacts.append(CompanyContact(
            user=user,
            name=row['name'].strip(),
            email=email,
            title=row['title'].strip(),
            company=row['company'].strip(),
        ))

    if new_contacts:
        CompanyContact.objects.bulk_create(new_contacts, ignore_conflicts=True)

    return len(new_contacts)


import google.generativeai as genai
import pdfplumber
import requests as http_requests
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders


def extract_resume_text(resume_field):
    """Read resume and extract text via pdfplumber."""
    from django.core.files.storage import default_storage
    content = None

    try:
        with default_storage.open(resume_field.name, 'rb') as f:
            content = f.read()
    except Exception:
        pass

    if not content:
        def _full_url(url):
            if url.startswith('http'):
                return url
            base = os.environ.get('RENDER_EXTERNAL_URL', '').rstrip('/')
            return f"{base}{url}"
        r = http_requests.get(_full_url(resume_field.url))
        r.raise_for_status()
        content = r.content

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        text = '\n'.join(page.extract_text() or '' for page in pdf.pages)
    return text.strip()


def get_resume_content_bytes(resume_field):
    """Return raw bytes of resume file for email attachment."""
    from django.core.files.storage import default_storage

    try:
        with default_storage.open(resume_field.name, 'rb') as f:
            content = f.read()
        if content:
            return content
    except Exception:
        pass

    def _full_url(url):
        if url.startswith('http'):
            return url
        base = os.environ.get('RENDER_EXTERNAL_URL', '').rstrip('/')
        return f"{base}{url}"
    r = http_requests.get(_full_url(resume_field.url))
    r.raise_for_status()
    return r.content
        return content
    except Exception:
        r = http_requests.get(_full_url(resume_field.url))
        r.raise_for_status()
        return r.content


def _tone_for_title(title):
    t = title.lower()
    if any(w in t for w in ['ceo', 'founder', 'president', 'owner', 'chief executive']):
        return "Extremely concise (2 short paragraphs). Lead with impact and business value. Zero fluff."
    if any(w in t for w in ['cto', 'vp eng', 'vp of eng', 'director of eng', 'head of eng', 'chief technology']):
        return "Technical and results-driven. Reference specific technologies and measurable outcomes."
    if any(w in t for w in ['hr', 'recruiter', 'talent', 'people ops', 'human resources', 'hiring']):
        return "Warm and professional. Emphasise cultural fit, enthusiasm, and standout qualifications clearly."
    if any(w in t for w in ['manager', 'director', 'lead', 'head', 'vp', 'vice president']):
        return "Professional and collaborative. Focus on concrete contributions and how you complement the team."
    return "Peer-to-peer and genuine. Be direct, enthusiastic, and highlight the most relevant skills."


def generate_cold_email(resume_text, position, sender_name, contact):
    """Call Gemini to generate a subject line and email body with zero placeholders."""
    import time as _time
    genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))
    model = genai.GenerativeModel('gemini-2.0-flash')

    tone = _tone_for_title(contact.title)

    prompt = f"""You are writing a cold job-application email that will be sent immediately. Every field must be fully filled in — zero placeholders allowed.

--- SENDER RESUME ---
{resume_text}
--- END RESUME ---

SENDER NAME: {sender_name}
POSITION APPLYING FOR: {position}

RECIPIENT NAME: {contact.name}
RECIPIENT TITLE: {contact.title}
RECIPIENT COMPANY: {contact.company}

TONE: {tone}

RULES:
1. Open by addressing the recipient by first name only.
2. Pick 2-3 specific, concrete details from the resume (projects, technologies, metrics) and weave them naturally into the email.
3. Mention {contact.company} by name. Draw on your knowledge of what {contact.company} does, its products, industry, or mission to show genuine interest — be specific, not generic.
4. Absolutely no placeholders such as [Company Name], [Skill], [Your Name], [Position], etc. Everything must be written out in full.
5. Maximum 3 paragraphs.
6. Close with only the sender's first name as the signature.
7. Do NOT include a subject line inside the body.

Output format — use these exact labels:
SUBJECT: <subject line>
BODY:
<email body>"""

    last_error = None
    for attempt in range(3):
        try:
            if attempt > 0:
                _time.sleep(2 ** attempt)
            response = model.generate_content(prompt)
            text = response.text.strip()

            subject = ''
            body_lines = []
            in_body = False

            for line in text.split('\n'):
                if line.startswith('SUBJECT:'):
                    subject = line.replace('SUBJECT:', '').strip()
                elif line.startswith('BODY:'):
                    in_body = True
                elif in_body:
                    body_lines.append(line)

            body = '\n'.join(body_lines).strip()
            if not subject:
                subject = f"{position} Application - {sender_name}"

            return subject, body
        except Exception as e:
            last_error = e

    raise last_error


def send_email_with_resume(sender_name, sender_email, recipient_email, subject, body, resume_bytes, resume_filename):
    """Send email via Gmail SMTP with resume attached."""
    smtp_email = os.environ.get('SMTP_EMAIL')
    smtp_password = os.environ.get('SMTP_PASSWORD')

    msg = MIMEMultipart()
    msg['From'] = f"{sender_name} <{smtp_email}>"
    msg['To'] = recipient_email
    msg['Reply-To'] = sender_email
    msg['Subject'] = subject

    msg.attach(MIMEText(body, 'plain'))

    attachment = MIMEBase('application', 'octet-stream')
    attachment.set_payload(resume_bytes)
    encoders.encode_base64(attachment)
    attachment.add_header('Content-Disposition', f'attachment; filename="{resume_filename}"')
    msg.attach(attachment)

    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        server.login(smtp_email, smtp_password)
        server.sendmail(smtp_email, recipient_email, msg.as_string())


def run_email_job(job_id, resume_text, resume_bytes, resume_filename, position, sender_name, sender_email, contacts):
    """Background thread: generates and sends one email per contact, updates EmailJob progress."""
    import time as _time
    from django.utils import timezone
    from django.db import connection
    from .models import EmailJob, CompanyContact

    try:
        job = EmailJob.objects.get(id=job_id)
        job.status = EmailJob.STATUS_RUNNING
        job.save()

        results = []
        sent = 0
        failed = 0

        for i, contact in enumerate(contacts):
            if i > 0:
                _time.sleep(0.6)
            try:
                subject, body = generate_cold_email(resume_text, position, sender_name, contact)
                send_email_with_resume(
                    sender_name, sender_email, contact.email,
                    subject, body, resume_bytes, resume_filename
                )
                CompanyContact.objects.filter(id=contact.id).update(emailed_at=timezone.now())
                sent += 1
                results.append({
                    'name': contact.name, 'email': contact.email,
                    'company': contact.company, 'status': 'sent',
                })
            except Exception as e:
                failed += 1
                results.append({
                    'name': contact.name, 'email': contact.email,
                    'company': contact.company, 'status': 'failed', 'error': str(e),
                })

            job.sent = sent
            job.failed = failed
            job.results = results
            job.save()

        job.status = EmailJob.STATUS_DONE
        job.completed_at = timezone.now()
        job.save()

    except Exception:
        try:
            job = EmailJob.objects.get(id=job_id)
            job.status = EmailJob.STATUS_FAILED
            job.save()
        except Exception:
            pass
    finally:
        connection.close()