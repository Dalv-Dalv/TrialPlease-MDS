from django.contrib import admin
from .models import Case, Choice, Evidence, EvidenceImage, Witness, UserCaseHistory

# Înregistrarea simplă (cea mai rapidă variantă)
# admin.site.register(Case)
# admin.site.register(Choice)
# admin.site.register(Evidence)
# admin.site.register(EvidenceImage)
# admin.site.register(Witness)

# --- SAU ---
# Înregistrarea avansată (Recomandată)
# Folosim clase ModelAdmin pentru a personaliza cum arată listele în panoul de admin

@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    # Ce coloane să apară în tabelul principal
    list_display = ('case_name', 'case_type', 'created_at', 'user')
    # Adăugăm un filtru lateral
    list_filter = ('case_type', 'created_at')
    # Permitem căutarea după numele cazului
    search_fields = ('case_name', 'defendant', 'victim')

@admin.register(Choice)
class ChoiceAdmin(admin.ModelAdmin):
    list_display = ('verdict_option', 'score_points', 'case')
    list_filter = ('case',)

@admin.register(Evidence)
class EvidenceAdmin(admin.ModelAdmin):
    list_display = ('name', 'case')
    search_fields = ('name',)

@admin.register(EvidenceImage)
class EvidenceImageAdmin(admin.ModelAdmin):
    list_display = ('evidence', 'caption')

@admin.register(Witness)
class WitnessAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'case')
    list_filter = ('case',)
    search_fields = ('name', 'role')

@admin.register(UserCaseHistory)
class UserCaseHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'case', 'verdict_given', 'is_correct', 'score', 'created_at')
    list_filter = ('is_correct', 'created_at')
    search_fields = ('user__username', 'case__case_name', 'verdict_given')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('user', 'case')