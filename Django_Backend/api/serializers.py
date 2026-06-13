from rest_framework import serializers
from django.contrib.auth.models import User
from django.db.models import Sum
from .models import Case, Choice, Evidence, Witness, UserCaseHistory, EvidenceImage, tier_for_xp


def _total_score_xp(user):
    """XP is the sum of all UserCaseHistory.score rows for this user.

    Memoized on the user instance so the four `get_xp_*` serializer methods
    only trigger one DB aggregate per user per request.
    """
    if not hasattr(user, '_cached_total_xp'):
        total = (
            UserCaseHistory.objects
            .filter(user=user)
            .aggregate(total=Sum('score'))['total']
        )
        user._cached_total_xp = total or 0
    return user._cached_total_xp


class UserSerializer(serializers.ModelSerializer):
    xp = serializers.SerializerMethodField()
    xp_label = serializers.SerializerMethodField()
    xp_current_tier_min = serializers.SerializerMethodField()
    xp_next_tier_min = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'xp', 'xp_label', 'xp_current_tier_min', 'xp_next_tier_min')

    def get_xp(self, obj):
        return _total_score_xp(obj)

    def get_xp_label(self, obj):
        return tier_for_xp(_total_score_xp(obj))[1]

    def get_xp_current_tier_min(self, obj):
        return tier_for_xp(_total_score_xp(obj))[0]

    def get_xp_next_tier_min(self, obj):
        return tier_for_xp(_total_score_xp(obj))[2]

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data.get('username'),
            email=validated_data.get('email', ''),
            password=validated_data.get('password')
        )
        return user

class EvidenceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvidenceImage
        fields = ['id', 'image_url', 'caption']

class EvidenceSerializer(serializers.ModelSerializer):
    image = serializers.CharField(write_only=True, required=False)
    images = EvidenceImageSerializer(many=True, read_only=True)

    class Meta:
        model = Evidence
        fields = ['id', 'name', 'description', 'image', 'images']

class WitnessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Witness
        fields = ['id', 'name', 'role', 'summary_statement', 'hidden_truth']

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'verdict_option', 'score_points']

class CaseSerializer(serializers.ModelSerializer):
    possible_choices = ChoiceSerializer(many=True)
    evidence_items = EvidenceSerializer(many=True)
    witnesses = WitnessSerializer(many=True)

    class Meta:
        model = Case
        fields = [
            'id', 'case_name', 'case_type', 'case_description', 
            'police_report', 'absolute_truth',
            'defendant', 'victim', 'correct_verdict', 'created_at',
            'possible_choices', 'evidence_items', 'witnesses'
        ]
        read_only_fields = ['created_at']

    def create(self, validated_data):
        choices_data = validated_data.pop('possible_choices', [])
        evidence_data = validated_data.pop('evidence_items', [])
        witnesses_data = validated_data.pop('witnesses', [])

        case = Case.objects.create(**validated_data)

        for choice in choices_data:
            Choice.objects.create(case=case, **choice)

        for witness in witnesses_data:
            Witness.objects.create(case=case, **witness)

        for evidence in evidence_data:
            image_name = evidence.pop('image', None)
            ev_obj = Evidence.objects.create(case=case, **evidence)
            if image_name:
                EvidenceImage.objects.create(evidence=ev_obj, image_url=f"/evidence_images/{image_name}", caption=ev_obj.name)

        return case

class UserCaseHistorySerializer(serializers.ModelSerializer):
    case = CaseSerializer(read_only=True)

    class Meta:
        model = UserCaseHistory
        fields = ['id', 'user', 'case', 'transcript', 'verdict_given', 'is_correct', 'score', 'created_at', 'updated_at']