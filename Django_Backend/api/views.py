from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.conf import settings
from rest_framework.authtoken.models import Token
from .models import Case, UserCaseHistory
from .serializers import CaseSerializer, RegisterSerializer, UserSerializer, UserCaseHistorySerializer
from .ai_service import CaseArchitect, Prosecutor, DefenseAttorney, WitnessAgent

# Google token verification
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generăm (sau luăm) token-ul pentru a-l returna direct
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            "user": UserSerializer(user, context=self.get_serializer_context()).data,
            "token": token.key
        }, status=status.HTTP_201_CREATED)


class GoogleAuthView(APIView):
    """
    POST { "credential": "<Google ID token>" }
    Verifies the token, gets-or-creates the Django user, and returns
    { user, token } — same shape as RegisterView / obtain_auth_token.
    """
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        credential = request.data.get('credential')
        if not credential:
            return Response({'error': 'Missing credential'}, status=status.HTTP_400_BAD_REQUEST)

        client_id = settings.GOOGLE_OAUTH_CLIENT_ID
        try:
            id_info = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                client_id,
            )
        except ValueError as exc:
            return Response({'error': f'Invalid Google token: {exc}'}, status=status.HTTP_400_BAD_REQUEST)

        email = id_info.get('email', '')
        given_name = id_info.get('given_name', '')
        family_name = id_info.get('family_name', '')
        name = id_info.get('name', '')

        if not email:
            return Response({'error': 'Google account has no email'}, status=status.HTTP_400_BAD_REQUEST)

        # Derive a username from the email local-part; ensure uniqueness
        base_username = email.split('@')[0]
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exclude(email=email).exists():
            username = f'{base_username}{counter}'
            counter += 1

        # Get or create the user — no password needed for OAuth users
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': username,
                'first_name': given_name,
                'last_name': family_name,
            }
        )

        # If the user already exists but username slot differs, sync display name
        if not created and (not user.first_name and given_name):
            user.first_name = given_name
            user.last_name = family_name
            user.save(update_fields=['first_name', 'last_name'])

        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key,
        }, status=status.HTTP_200_OK)


class UserProfileView(generics.RetrieveAPIView):

    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        histories = UserCaseHistory.objects.filter(user=request.user).order_by('-created_at')
        return Response({
            "user": UserSerializer(request.user, context={'request': request}).data,
            "history": UserCaseHistorySerializer(histories, many=True, context={'request': request}).data
        })

class CaseViewSet(viewsets.ModelViewSet):
    queryset = Case.objects.all().order_by('-created_at')
    serializer_class = CaseSerializer
    permission_classes = [AllowAny]

    # MAGIA SE ÎNTÂMPLĂ AICI! Creăm o rută nouă: /api/cases/generate/
    @action(detail=False, methods=['post'])
    def generate(self, request):
        try:
            print("⏳ Apelăm AI-ul pentru a genera un caz nou...")
            
            # 1. Preluăm cazul generat de AI (ca dicționar)
            caseArhitect=CaseArchitect()
            ai_data = caseArhitect.generate_case()
        
            # 2. Îl trecem prin Serializator ca să validăm și să salvăm în DB
            serializer = self.get_serializer(data=ai_data)
            if not serializer.is_valid():
                print("SERIALIZER ERRORS:", serializer.errors)

            if serializer.is_valid():
                caz_salvat = serializer.save()
                
                # 3. RETURNĂM TOT CAZUL DIRECT CĂTRE FRONTEND!
                return Response({
                    "message": "Caz generat și salvat cu succes!",
                    "case": serializer.data # Aici sunt toate detaliile (martori, dovezi etc)
                }, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            print(f"EROARE LA GENERARE: {e}")   
            return Response({"error": f"Eroare la generare: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def lawyer_action(self, request, pk=None):
        case = self.get_object()
        serializer = self.get_serializer(case)
        case_data = serializer.data
        
        lawyer_type = request.data.get('lawyer_type', 'prosecutor')
        confidence = request.data.get('confidence_level', 'normal')
        phase = request.data.get('phase', 'unknown')
        evidence_name = request.data.get('evidence_name', None)
        transcript = request.data.get('transcript', [])
        phase = request.data.get('phase', 'unknown')
        evidence_name = request.data.get('evidence_name', None)
        defence=DefenseAttorney()
        prosecutor=Prosecutor()
        try:
            if lawyer_type == 'prosecutor':
                reply = prosecutor.get_reply(case_data, transcript, confidence, phase, evidence_name)
            else:
                reply = defence.get_reply(case_data, transcript, confidence, phase, evidence_name)
            return Response(reply, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def witness_answer(self, request, pk=None):
        case = self.get_object()
        serializer = self.get_serializer(case)
        
        witness_id = request.data.get('witness_id')
        question = request.data.get('question', '')
        transcript = request.data.get('transcript', [])
        
        witness = case.witnesses.filter(id=witness_id).first()
        if not witness:
            return Response({"error": "Witness not found"}, status=status.HTTP_404_NOT_FOUND)
            
        witness_data = {
            "name": witness.name,
            "role": witness.role,
            "summary_statement": witness.summary_statement,
            "hidden_truth": witness.hidden_truth
        }
        
        try:
            withness=WitnessAgent()
            reply = withness.get_reply(serializer.data, witness_data, question, transcript)
            return Response(reply, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def debrief(self, request, pk=None):
        case = self.get_object()
        user_verdict = request.data.get('verdict', '')
        transcript = request.data.get('transcript', [])

        verdict_correct = (user_verdict.lower().strip() == case.correct_verdict.lower().strip())

        # Score = score_points of the Choice the user picked. Case-insensitive
        # match on verdict_option; defaults to 0 if no matching choice exists.
        chosen_choice = next(
            (
                c for c in case.possible_choices.all()
                if c.verdict_option.lower().strip() == user_verdict.lower().strip()
            ),
            None,
        )
        score = chosen_choice.score_points if chosen_choice else 0

        if request.user.is_authenticated:
            UserCaseHistory.objects.create(
                user=request.user,
                case=case,
                transcript=transcript,
                verdict_given=user_verdict,
                is_correct=verdict_correct,
                score=score,
            )
            # NOTE: total XP is now derived from the sum of all
            # UserCaseHistory.score rows by UserSerializer — no separate
            # XP write needed here.

        return Response({
            "absolute_truth": case.absolute_truth,
            "verdict_correct": verdict_correct,
            "correct_verdict": case.correct_verdict,
            "score": score,
        }, status=status.HTTP_200_OK)
