from django.shortcuts import render
from django.http import JsonResponse
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
    extract_resume_text,
    extract_resume_text_from_file,
    get_resume_content_bytes,
    get_resume_content_bytes_from_file,
    get_signed_cloudinary_resume_url,
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
                import cloudinary
                import cloudinary.uploader
                cloudinary.config(
                    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
                    api_key=os.environ.get('CLOUDINARY_API_KEY'),
                    api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
                )
                result = cloudinary.uploader.upload(
                    resume_file,
                    resource_type='raw',
                    folder='resumes',
                    use_filename=True,
                    unique_filename=True,
                )
                resume_file.seek(0)
                defaults['resume'] = resume_file
                defaults['resume_cloudinary_url'] = result['secure_url']
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
        raw_url = (resume.resume.url if resume.resume else None) or resume.resume_cloudinary_url
        url = get_signed_cloudinary_resume_url(raw_url)
        if not url:
            return JsonResponse({'error': 'No resume found'}, status=404)
        return JsonResponse({
            'resume_url': url,
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

    try:
        data = json.loads(request.body) if request.body else {}
    except Exception:
        data = {}
    contact_ids = data.get('contact_ids')
    qs = CompanyContact.objects.filter(user=request.user)
    if contact_ids:
        qs = qs.filter(id__in=contact_ids)
    contacts = list(qs)
    if not contacts:
        return JsonResponse({'error': 'No contacts found. Please upload a contact CSV first.'}, status=400)

    resume_url = user_resume.resume_cloudinary_url
    if not resume_url:
        return JsonResponse({'error': 'Please re-upload your resume to use this feature.'}, status=400)

    resume_url = get_signed_cloudinary_resume_url(
        (user_resume.resume.url if user_resume.resume else None) or resume_url
    )

    try:
        if user_resume.resume:
            resume_text = extract_resume_text_from_file(user_resume.resume)
        else:
            resume_text = extract_resume_text(resume_url)
    except Exception as e:
        return JsonResponse({'error': f'Could not read resume: {str(e)}'}, status=400)

    try:
        if user_resume.resume:
            resume_bytes = get_resume_content_bytes_from_file(user_resume.resume)
        else:
            resume_bytes = get_resume_content_bytes(resume_url)
    except Exception as e:
        return JsonResponse({'error': f'Could not load resume file: {str(e)}'}, status=400)

    resume_filename = os.path.basename(user_resume.resume.name) if user_resume.resume else os.path.basename(user_resume.resume_cloudinary_url.split('/')[-1])
    resume_filename = resume_filename or 'resume.pdf'
    sender_name = request.user.first_name or request.user.email.split('@')[0]
    sender_email = request.user.email

    job = EmailJob.objects.create(user=request.user, total=len(contacts), status='pending')

    t = threading.Thread(
        target=run_email_job,
        args=(job.id, resume_text, resume_bytes, resume_filename, user_resume.position, sender_name, sender_email, contacts),
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

    resume_url = user_resume.resume_cloudinary_url
    if not resume_url:
        return JsonResponse({'error': 'Please re-upload your resume to use this feature.'}, status=400)

    resume_url = get_signed_cloudinary_resume_url(
        (user_resume.resume.url if user_resume.resume else None) or resume_url
    )

    try:
        if user_resume.resume:
            resume_text = extract_resume_text_from_file(user_resume.resume)
        else:
            resume_text = extract_resume_text(resume_url)
    except Exception as e:
        return JsonResponse({'error': f'Could not read resume: {str(e)}'}, status=400)

    sender_name = request.user.first_name or request.user.email.split('@')[0]

    try:
        subject, body = generate_cold_email(resume_text, user_resume.position, sender_name, contact)
        return JsonResponse({
            'subject': subject,
            'body': body,
            'recipient': {
                'name': contact.name,
                'title': contact.title,
                'company': contact.company,
            },
        })
    except Exception as e:
        return JsonResponse({'error': f'Email generation failed: {str(e)}'}, status=500)


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
            'created_at': job.created_at.isoformat(),
        }
    })