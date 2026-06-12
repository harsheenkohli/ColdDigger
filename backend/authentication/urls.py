from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register_user, name='register'),
    path('login/', views.login_user, name='login'),
    path('logout/', views.logout_user, name='logout'),
    path('check-auth/', views.check_auth, name='check_auth'),
    path('upload-files/', views.upload_files, name='upload_files'),
    path('user-resume/', views.get_user_resume, name='get_user_resume'),
    path('get-position/', views.get_user_position, name='get-position'),
    path('send-emails/', views.send_emails, name='send_emails'),
    path('contact/', views.contact_us, name='contact_us'),
    path('email-job/<int:job_id>/', views.email_job_status, name='email_job_status'),
    path('contacts/', views.get_contacts, name='get_contacts'),
    path('clear-contacts/', views.clear_contacts, name='clear_contacts'),
    path('preview-email/', views.preview_email, name='preview_email'),
    path('last-email-job/', views.last_email_job, name='last_email_job'),
]
