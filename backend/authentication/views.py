from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.core.cache import cache
import json

import os
import threading
from .models import UserResume, CompanyContact, EmailJob
from .utils import (
    process_csv_file,
    extract_resume_text_from_file,
    get_resume_content_bytes_from_file,
    generate_cold_email,
    send_email_with_resume,
    run_email_job,
)

@csrf_exempt
def register_user(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')

        if User.objects.filter(email=email).exists():
            return JsonResponse({'error': 'Email already exists'}, status=400)
        
        # Create user
        user = User.objects.create_user(
            username=email,  # Using email as username
            email=email,
            password=password
        )
        user.first_name = name
        user.save()
        
        return JsonResponse({'message': 'User registered successfully'})
    
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
def login_user(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')
        
        user = authenticate(username=email, password=password)
        
        if user is not None:
            login(request, user)
            return JsonResponse({
                'message': 'Login successful',
                'user': {
                    'name': user.first_name,
                    'email': user.email
                }
            })
        else:
            return JsonResponse({'error': 'Invalid credentials'}, status=401)
    
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
def logout_user(request):
    if request.method == 'POST':
        logout(request)
        return JsonResponse({'message': 'Logged out successfully'})
    
    return JsonResponse({'error': 'Invalid request method'}, status=400)

def check_auth(request):
    if request.user.is_authenticated:
        return JsonResponse({
            'isAuthenticated': True,
            'user': {
                'name': request.user.first_name,
                'email': request.user.email
            }
        })
    return JsonResponse({'isAuthenticated': False})


@csrf_exempt
def upload_files(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        new_contacts_count = 0
        
        # Handle Resume and Position
        resume_file = request.FILES.get('resume')
        if resume_file and not resume_file.name.lower().endswith('.pdf'):
            return JsonResponse({'error': 'Resume must be a PDF file.'}, status=400)
        position = request.POST.get('position', '')
        
        # Update or create resume with position
        if resume_file or position:
            defaults = {}
            if resume_file:
                # Save resume directly to FileField (no external upload needed)
                from django.core.files.base import ContentFile
                resume_bytes = resume_file.read()
                defaults['resume'] = ContentFile(resume_bytes, name=resume_file.name)
            if position:
                defaults['position'] = position

            UserResume.objects.update_or_create(
                user=request.user,
                defaults=defaults
            )
        
        # Handle optional CSV file
        csv_file = request.FILES.get('csv_file')
        if csv_file:
            try:
                replace = request.POST.get('replace_contacts', 'true').lower() == 'true'
                new_contacts_count = process_csv_file(csv_file, request.user, replace=replace)
            except ValueError as e:
                return JsonResponse({'error': str(e)}, status=400)
            except Exception as e:
                return JsonResponse({'error': f'Error processing CSV: {str(e)}'}, status=400)
        
        return JsonResponse({
            'message': 'Upload successful',
            'new_contacts_added': new_contacts_count
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

# Add new view to get position
@csrf_exempt
def get_user_position(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        user_resume = UserResume.objects.get(user=request.user)
        return JsonResponse({
            'position': user_resume.position,
            'updated_at': user_resume.updated_at
        })
    except UserResume.DoesNotExist:
        return JsonResponse({'error': 'No position found'}, status=404)

@csrf_exempt
def get_user_resume(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        resume = UserResume.objects.get(user=request.user)
        if not resume.resume or not resume.resume.name:
            return JsonResponse({'error': 'No resume found'}, status=404)
        resume_filename = os.path.basename(resume.resume.name) or 'resume.pdf'
        return JsonResponse({
            'resume_url': '/api/download-resume/',
            'resume_filename': resume_filename,
            'updated_at': resume.updated_at
        })
    except UserResume.DoesNotExist:
        return JsonResponse({'error': 'No resume found'}, status=404)


@csrf_exempt
def send_emails(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        user_resume = UserResume.objects.get(user=request.user)
    except UserResume.DoesNotExist:
        return JsonResponse({'error': 'Please upload a resume and set your position first'}, status=400)

    if not user_resume.position:
        return JsonResponse({'error': 'Please set your target position first'}, status=400)

    if not user_resume.resume or not user_resume.resume.name:
        return JsonResponse({'error': 'Please upload a resume first'}, status=400)

    try:
        data = json.loads(request.body) if request.body else {}
    except Exception:
        data = {}
    contact_ids = data.get('contact_ids')
    use_draft_for_all = bool(data.get('use_draft_for_all', False))
    draft_subject = (data.get('draft_subject') or '').strip()
    draft_body = (data.get('draft_body') or '').strip()
    qs = CompanyContact.objects.filter(user=request.user)
    if contact_ids:
        qs = qs.filter(id__in=contact_ids)
    contacts = list(qs)
    if not contacts:
        return JsonResponse({'error': 'No contacts found. Please upload a contact CSV first.'}, status=400)

    try:
        resume_text = extract_resume_text_from_file(user_resume.resume)
    except Exception as e:
        return JsonResponse({'error': f'Could not read resume: {str(e)}'}, status=400)

    try:
        resume_bytes = get_resume_content_bytes_from_file(user_resume.resume)
    except Exception as e:
        return JsonResponse({'error': f'Could not load resume file: {str(e)}'}, status=400)

    resume_filename = os.path.basename(user_resume.resume.name) or 'resume.pdf'
    sender_name = request.user.first_name or request.user.email.split('@')[0]
    sender_email = request.user.email

    job = EmailJob.objects.create(user=request.user, total=len(contacts), status='pending')

    t = threading.Thread(
        target=run_email_job,
        args=(
            job.id,
            resume_text,
            resume_bytes,
            resume_filename,
            user_resume.position,
            sender_name,
            sender_email,
            contacts,
            use_draft_for_all,
            draft_subject or None,
            draft_body or None,
        ),
        daemon=True,
    )
    t.start()

    return JsonResponse({'job_id': job.id, 'total': len(contacts)})

@csrf_exempt
def contact_us(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', 'unknown'))
    ip = ip.split(',')[0].strip()
    cache_key = f'contact_ratelimit_{ip}'
    count = cache.get(cache_key, 0)
    if count >= 3:
        return JsonResponse({'error': 'Too many messages. Please try again in an hour.'}, status=429)
    cache.set(cache_key, count + 1, timeout=3600)

    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        message = data.get('message', '').strip()

        if not name or not email or not message:
            return JsonResponse({'error': 'All fields are required'}, status=400)

        smtp_email = os.environ.get('SMTP_EMAIL')
        smtp_password = os.environ.get('SMTP_PASSWORD')

        if smtp_email and smtp_password:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart as _MIMEMultipart

            msg = _MIMEMultipart()
            msg['From'] = smtp_email
            msg['To'] = smtp_email
            msg['Reply-To'] = email
            msg['Subject'] = f"ColdDigger Contact: {name}"
            msg.attach(MIMEText(f"From: {name} <{email}>\n\n{message}", 'plain'))

            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(smtp_email, smtp_password)
                server.sendmail(smtp_email, smtp_email, msg.as_string())

        return JsonResponse({'message': 'Message sent! We will get back to you shortly.'})

    except Exception:
        return JsonResponse({'error': 'Something went wrong. Please try again.'}, status=500)


def email_job_status(request, job_id):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    try:
        job = EmailJob.objects.get(id=job_id, user=request.user)
        return JsonResponse({
            'status': job.status,
            'total': job.total,
            'sent': job.sent,
            'failed': job.failed,
            'results': job.results,
        })
    except EmailJob.DoesNotExist:
        return JsonResponse({'error': 'Job not found'}, status=404)


def get_contacts(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    contacts = list(
        CompanyContact.objects.filter(user=request.user)
        .order_by('company', 'name')
        .values('id', 'name', 'email', 'title', 'company', 'emailed_at')
    )
    for c in contacts:
        if c['emailed_at']:
            c['emailed_at'] = c['emailed_at'].isoformat()
    return JsonResponse({'count': len(contacts), 'contacts': contacts})


@csrf_exempt
def clear_contacts(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    if request.method != 'DELETE':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    count, _ = CompanyContact.objects.filter(user=request.user).delete()
    return JsonResponse({'message': f'Cleared {count} contacts.'})


@csrf_exempt
def preview_email(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        user_resume = UserResume.objects.get(user=request.user)
    except UserResume.DoesNotExist:
        return JsonResponse({'error': 'Please upload a resume first'}, status=400)

    if not user_resume.position:
        return JsonResponse({'error': 'Please set your target position first'}, status=400)

    if not user_resume.resume or not user_resume.resume.name:
        return JsonResponse({'error': 'Please upload a resume first'}, status=400)

    try:
        data = json.loads(request.body) if request.body else {}
    except Exception:
        data = {}
    contact_id = data.get('contact_id')
    if contact_id:
        contact = CompanyContact.objects.filter(user=request.user, id=contact_id).first()
    else:
        contact = CompanyContact.objects.filter(user=request.user).first()
    if not contact:
        return JsonResponse({'error': 'No contacts found. Upload a CSV first.'}, status=400)

    try:
        resume_text = extract_resume_text_from_file(user_resume.resume)
    except Exception as e:
        return JsonResponse({'error': f'Could not read resume: {str(e)}'}, status=400)

    sender_name = request.user.first_name or request.user.email.split('@')[0]

    # Build a tokenized template (shown first in UI) that uses placeholders like {{first_name}}, {{company}}
    template_subject = f"{{{{position}}}} Application - {{{{sender_first_name}}}}"
    template_body = (
        "Hi {{first_name}},\n\n"
        "I’m reaching out about opportunities at {{company}}. I’m applying for the {{position}} role and wanted to share my background. "
        "I’ve attached my resume for your review.\n\n"
        "Best,\n{{sender_first_name}}"
    )

    try:
        subject, body = generate_cold_email(resume_text, user_resume.position, sender_name, contact)
        return JsonResponse({
            'subject': subject,
            'body': body,
            'template_subject': template_subject,
            'template_body': template_body,
            'recipient': {
                'name': contact.name,
                'title': contact.title,
                'company': contact.company,
            },
        })
    except Exception as e:
        # If AI fails, still return the tokenized template so user can proceed.
        return JsonResponse({
            'subject': '',
            'body': '',
            'template_subject': template_subject,
            'template_body': template_body,
            'recipient': {
                'name': contact.name,
                'title': contact.title,
                'company': contact.company,
            },
            'error': f'Email generation failed: {str(e)}'
        }, status=200)


def last_email_job(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    job = EmailJob.objects.filter(user=request.user).order_by('-created_at').first()
    if not job:
        return JsonResponse({'job': None})
    return JsonResponse({
        'job': {
            'id': job.id,
            'status': job.status,
            'total': job.total,
            'sent': job.sent,
            'failed': job.failed,
            'results': job.results,
            'created_at': job.created_at.isoformat() if job.created_at else None,
            'completed_at': job.completed_at.isoformat() if job.completed_at else None,
        }
    })


def download_resume(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)

    try:
        user_resume = UserResume.objects.get(user=request.user)
    except UserResume.DoesNotExist:
        return JsonResponse({'error': 'No resume found. Please upload a resume.'}, status=404)

    try:
        # Get resume from FileField
        if not user_resume.resume or not user_resume.resume.name:
            return JsonResponse({'error': 'No resume file found. Please upload a resume.'}, status=404)

        resume_bytes = get_resume_content_bytes_from_file(user_resume.resume)
        resume_filename = os.path.basename(user_resume.resume.name) or 'resume.pdf'

        if not resume_bytes:
            return JsonResponse({'error': 'Resume file is empty'}, status=400)

        response = HttpResponse(resume_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{resume_filename}"'
        return response
    except Exception as e:
        return JsonResponse({'error': f'Failed to download resume: {str(e)}'}, status=500)


def get_google_flow(request):
    from google_auth_oauthlib.flow import Flow
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        raise ValueError("Google OAuth credentials are missing from the backend environment variables.")

    client_config = {
        "web": {
            "client_id": client_id,
            "project_id": "colddigger",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": client_secret,
        }
    }
    redirect_uri = request.build_absolute_uri('/api/google/callback/')
    # Allow HTTP transport for local development only
    if 'localhost' in redirect_uri or '127.0.0.1' in redirect_uri:
        os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

    return Flow.from_client_config(
        client_config,
        scopes=['https://www.googleapis.com/auth/gmail.send'],
        redirect_uri=redirect_uri
    )

@csrf_exempt
def google_oauth_login(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    try:
        flow = get_google_flow(request)
        auth_url, state = flow.authorization_url(prompt='consent', access_type='offline')
        return JsonResponse({'auth_url': auth_url})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def google_oauth_callback(request):
    try:
        flow = get_google_flow(request)
        flow.fetch_token(authorization_response=request.build_absolute_uri())
        creds = flow.credentials
        from .models import GoogleCredentials
        GoogleCredentials.objects.update_or_create(
            user=request.user,
            defaults={'creds_json': creds.to_json()}
        )
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
        from django.shortcuts import redirect
        return redirect(f'{frontend_url}/dashboard')
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)