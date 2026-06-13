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
import socket
from urllib.parse import urlparse
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders


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


def _compact_resume_text(resume_text, max_chars=6000):
    """Trim resume text so Gemini sees only the most relevant text and fewer tokens."""
    cleaned_lines = []
    for line in resume_text.splitlines():
        stripped = line.strip()
        if stripped:
            cleaned_lines.append(stripped)

    compact_text = '\n'.join(cleaned_lines)
    if len(compact_text) <= max_chars:
        return compact_text

    return compact_text[:max_chars]


def render_template(template, contact, position, sender_name):
    """Replace supported placeholders in the template using contact and context.

    Supported tokens:
      {{first_name}}, {{last_name}}, {{full_name}}, {{company}}, {{title}}, {{position}}, {{sender_first_name}}
    """
    if not template:
        return ''

    full_name = (contact.name or '').strip()
    parts = full_name.split()
    first_name = parts[0] if parts else ''
    last_name = parts[-1] if len(parts) > 1 else ''
    company = (contact.company or '')
    title = (contact.title or '')
    sender_first = (sender_name or '').strip().split()[0] if sender_name else ''

    replacements = {
        '{{first_name}}': first_name,
        '{{last_name}}': last_name,
        '{{full_name}}': full_name,
        '{{company}}': company,
        '{{title}}': title,
        '{{position}}': position or '',
        '{{sender_first_name}}': sender_first,
    }

    rendered = template
    # simple literal replacement
    for token, value in replacements.items():
        rendered = rendered.replace(token, value or '')

    return rendered


def generate_cold_email(resume_text, position, sender_name, contact):
    """Call Gemini to generate a subject line and email body with zero placeholders."""
    import re
    import time as _time
    genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))
    model = genai.GenerativeModel('gemini-2.5-flash')

    tone = _tone_for_title(contact.title)
    compact_resume_text = _compact_resume_text(resume_text)

    prompt = f"""You are writing a cold job-application email that will be sent immediately. Every field must be fully filled in — zero placeholders allowed.

--- SENDER RESUME ---
{compact_resume_text}
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
            print(f"\n--- HITTING GEMINI (Attempt {attempt + 1}) ---")
            response = model.generate_content(prompt)
            text = response.text.strip()
            print("--- GEMINI RESPONSE ---")
            print(response.text)
            # Remove markdown bolding which can break parsing
            text = response.text.strip().replace('**', '')

            # Robust extraction ignoring case and spacing
            subject_match = re.search(r'(?i)SUBJECT\s*:\s*(.*)', text)
            subject = subject_match.group(1).strip() if subject_match else ''
            
            body_match = re.search(r'(?i)BODY\s*:\s*(.*)', text, flags=re.DOTALL)
            if body_match:
                body = body_match.group(1).strip()
            else:
                # If Gemini misses the 'BODY:' tag, use everything except the subject line
                if subject_match:
                    body = text.replace(subject_match.group(0), '').strip()
                else:
                    body = text.strip()

            if not subject:
                subject = f"{position} Application - {sender_name}"

            return subject, body
        except Exception as e:
            last_error = e
            print(f"--- GEMINI ERROR on attempt {attempt + 1} ---: {e}")
            error_text = str(e).lower()
            if '429' in error_text or 'quota' in error_text or 'rate limit' in error_text:
                raise e

    if last_error:
        raise last_error

    raise Exception("Failed to generate content. Please try again.")


def send_email_with_resume(sender_name, sender_email, recipient_email, subject, body, resume_bytes, resume_filename, user=None):
    """Send email natively using the user's connected Gmail API."""
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    from .models import GoogleCredentials
    import base64

    if not user:
        raise ValueError("User reference is missing for Gmail API.")

    try:
        google_creds = GoogleCredentials.objects.get(user=user)
        import json
        creds = Credentials.from_authorized_user_info(json.loads(google_creds.creds_json))
    except GoogleCredentials.DoesNotExist:
        raise ValueError("Gmail not connected. Please connect your Google account in the dashboard.")

    msg = MIMEMultipart()
    msg['From'] = f"{sender_name} <{sender_email}>"
    msg['To'] = recipient_email
    msg['Subject'] = subject

    msg.attach(MIMEText(body, 'plain'))

    attachment = MIMEBase('application', 'octet-stream')
    attachment.set_payload(resume_bytes)
    encoders.encode_base64(attachment)
    attachment.add_header('Content-Disposition', f'attachment; filename="{resume_filename}"')
    msg.attach(attachment)

    raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode()

    try:
        service = build('gmail', 'v1', credentials=creds)
        service.users().messages().send(userId='me', body={'raw': raw_message}).execute()
    except Exception as e:
        raise ConnectionError(f"Gmail API failed: {e}") from e


def run_email_job(job_id, resume_text, resume_bytes, resume_filename, position, sender_name, sender_email, contacts, use_draft_for_all=False, draft_subject=None, draft_body=None):
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
                if use_draft_for_all and draft_subject and draft_body:
                    # Render per-contact tokens into the draft before sending
                    subject = render_template(draft_subject, contact, position, sender_name)
                    body = render_template(draft_body, contact, position, sender_name)
                else:
                    subject, body = generate_cold_email(resume_text, position, sender_name, contact)
                send_email_with_resume(
                    sender_name, sender_email, contact.email,
                    subject, body, resume_bytes, resume_filename,
                    user=job.user
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