from rest_framework import serializers
from .models import Case, Choice, Evidence, Witness

class EvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evidence
        fields = ['id', 'name', 'description']

class WitnessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Witness
        fields = ['id', 'name', 'role', 'summary_statement']

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
            Evidence.objects.create(case=case, **evidence)

        return case