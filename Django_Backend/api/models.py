from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

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

# 10 progressive rank labels keyed by minimum XP required.
# Order matters — must be ascending by threshold.
XP_LEVELS = [
    (0,    'Law Apprentice'),
    (100,  'Court Clerk'),
    (250,  'Paralegal'),
    (450,  'Junior Counsel'),
    (700,  'Solicitor'),
    (1000, 'Barrister'),
    (1400, 'Senior Advocate'),
    (1900, 'Magistrate'),
    (2500, 'Judge Master'),
    (3200, 'Chief Justice'),
]


def tier_for_xp(xp):
    """Return (min_threshold, label, next_min_or_None) for the given xp."""
    last = XP_LEVELS[0]
    for i, (threshold, label) in enumerate(XP_LEVELS):
        if xp < threshold:
            # We're below this tier — return the previous one and this as next.
            return last[0], last[1], threshold
        last = (threshold, label)
        # If this is the last tier, no "next".
        if i == len(XP_LEVELS) - 1:
            return threshold, label, None
    return last[0], last[1], None


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    # DEPRECATED: total XP is now derived from the sum of UserCaseHistory.score
    # rows (see serializers._total_score_xp). This field is no longer the
    # source of truth and is left in place only to avoid a destructive
    # migration. Safe to remove in a follow-up cleanup pass.
    xp = models.PositiveIntegerField(default=0)

    @property
    def xp_label(self):
        return tier_for_xp(self.xp)[1]

    @property
    def xp_current_tier_min(self):
        return tier_for_xp(self.xp)[0]

    @property
    def xp_next_tier_min(self):
        return tier_for_xp(self.xp)[2]

    def __str__(self):
        return f"{self.user.username} — profile"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)


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