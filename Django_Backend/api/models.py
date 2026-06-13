from django.db import models
from django.contrib.auth.models import User

class Case(models.Model): # <-- Aici era greșeala (models.Model în loc de models.fields.Model)
    # Legătura cu utilizatorul (dacă un caz e atribuit sau rezolvat de un user)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cases', null=True, blank=True)
    
    # Datele principale ale cazului
    case_name = models.CharField(max_length=255)
    case_type = models.CharField(max_length=100)
    case_description = models.TextField()
    
    # Nou: split the truth
    police_report = models.TextField(null=True, blank=True)
    absolute_truth = models.TextField(null=True, blank=True)
    
    # Detalii despre inculpat și victimă
    defendant = models.TextField()
    victim = models.TextField()
    
    # Răspunsul corect 
    correct_verdict = models.CharField(max_length=255)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.case_name} ({self.case_type})"


class Choice(models.Model):
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='possible_choices')
    verdict_option = models.CharField(max_length=255)
    score_points = models.IntegerField()

    def __str__(self):
        return f"{self.verdict_option} - {self.score_points} pts"


class Evidence(models.Model):
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='evidence_items')
    name = models.CharField(max_length=255)
    description = models.TextField()

    def __str__(self):
        return f"Evidence: {self.name} for {self.case.case_name}"


class EvidenceImage(models.Model):
    evidence = models.ForeignKey(Evidence, on_delete=models.CASCADE, related_name='images')
    image_url = models.URLField(max_length=500)
    caption = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Image for {self.evidence.name}"


class Witness(models.Model):
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='witnesses')
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=150)
    summary_statement = models.TextField()
    hidden_truth = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.role})"

class UserCaseHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='case_histories')
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='case_histories')
    transcript = models.JSONField(default=list)
    verdict_given = models.CharField(max_length=255, null=True, blank=True)
    is_correct = models.BooleanField(null=True, blank=True)
    # Score points awarded for the verdict the user picked. Sourced from the
    # matching Choice.score_points on the case at debrief time.
    score = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"History: {self.user.username} - {self.case.case_name} ({self.score} pts)"