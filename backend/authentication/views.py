from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
import json

from .models import UserResume, CompanyContact
from .utils import process_csv_file

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
        position = request.POST.get('position', '')
        
        # Update or create resume with position
        if resume_file or position:
            defaults = {}
            if resume_file:
                defaults['resume'] = resume_file
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
                new_contacts_count = process_csv_file(csv_file)
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
        return JsonResponse({
            'resume_url': resume.resume.url,
            'updated_at': resume.updated_at
        })
    except UserResume.DoesNotExist:
        return JsonResponse({'error': 'No resume found'}, status=404)