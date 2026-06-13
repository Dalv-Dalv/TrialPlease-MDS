from django.contrib import admin
from .models import Case, Choice, Evidence, EvidenceImage, Witness, UserCaseHistory, UserProfile

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

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'total_xp', 'tier')
    search_fields = ('user__username',)
    raw_id_fields = ('user',)

    def _xp_sum(self, obj):
        from django.db.models import Sum
        total = (
            UserCaseHistory.objects
            .filter(user=obj.user)
            .aggregate(total=Sum('score'))['total']
        )
        return total or 0

    def total_xp(self, obj):
        return self._xp_sum(obj)
    total_xp.short_description = 'XP (sum of scores)'

    def tier(self, obj):
        from .models import tier_for_xp
        return tier_for_xp(self._xp_sum(obj))[1]
    tier.short_description = 'Tier'