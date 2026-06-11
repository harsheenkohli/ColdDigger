from django.db import models
from django.contrib.auth.models import User


class CompanyContact(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField()
    title = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['email', 'company']  # Prevent duplicate entries

    def __str__(self):
        return f"{self.name} - {self.company}"


class UserResume(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    resume = models.FileField(upload_to='resumes/')
    position = models.CharField(max_length=255, blank=True)  # New field
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Resume of {self.user.email} for position '{self.position}'"