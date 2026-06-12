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
from urllib.parse import urlparse
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders


def extract_resume_text(url):
    """Extract text from a resume PDF given its URL."""
    url = get_signed_cloudinary_resume_url(url)
    r = http_requests.get(url, timeout=30)
    r.raise_for_status()
    content = r.content
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        text = '\n'.join(page.extract_text() or '' for page in pdf.pages)
    return text.strip()


def extract_resume_text_from_file(resume_file):
    """Extract text from an uploaded resume file stored by Django."""
    if hasattr(resume_file, 'open'):
        resume_file.open('rb')
    content = resume_file.read()
    if hasattr(resume_file, 'close'):
        resume_file.close()
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        text = '\n'.join(page.extract_text() or '' for page in pdf.pages)
    return text.strip()


def get_resume_content_bytes(url):
    """Return raw bytes of resume from its URL."""
    url = get_signed_cloudinary_resume_url(url)
    r = http_requests.get(url, timeout=30)
    r.raise_for_status()
    return r.content


def get_signed_cloudinary_resume_url(url):
    """Return a signed Cloudinary delivery URL when the asset is a raw PDF."""
    if not url:
        return url

    try:
        import cloudinary
        import cloudinary.utils

        parsed = urlparse(url)
        path_parts = [part for part in parsed.path.split('/') if part]
        if 'upload' not in path_parts:
            return url

        upload_index = path_parts.index('upload')
        asset_parts = path_parts[upload_index + 1:]
        if not asset_parts:
            return url

        version = None
        if asset_parts[0].startswith('v') and asset_parts[0][1:].isdigit():
            version = int(asset_parts[0][1:])
            asset_parts = asset_parts[1:]

        if not asset_parts:
            return url

        asset_path = '/'.join(asset_parts)
        public_id, extension = os.path.splitext(asset_path)
        if not public_id:
            return url

        cloudinary.config(
            cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
            api_key=os.environ.get('CLOUDINARY_API_KEY'),
            api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
        )

        # Prefer private_download_url when available (provides authenticated download)
        try:
            private_fn = getattr(cloudinary.utils, 'private_download_url', None)
            if private_fn:
                pd = private_fn(public_id, format=extension.lstrip('.') or None, resource_type='raw', version=version)
                if pd:
                    return pd
        except Exception:
            pass

        signed_url, _ = cloudinary.utils.cloudinary_url(
            public_id,
            resource_type='raw',
            type='upload',
            secure=True,
            sign_url=True,
            version=version,
            format=extension.lstrip('.') or None,
        )
        return signed_url or url
    except Exception:
        return url


def get_resume_content_bytes_from_file(resume_file):
    """Return raw bytes from an uploaded resume file stored by Django."""
    if hasattr(resume_file, 'open'):
        resume_file.open('rb')
    content = resume_file.read()
    if hasattr(resume_file, 'close'):
        resume_file.close()
    return content


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