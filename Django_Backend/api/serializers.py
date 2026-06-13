from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Case, Choice, Evidence, Witness, UserCaseHistory, EvidenceImage

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')

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