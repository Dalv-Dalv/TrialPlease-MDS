from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from .models import Case, UserCaseHistory
from .serializers import CaseSerializer, RegisterSerializer, UserSerializer, UserCaseHistorySerializer

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
        
        if request.user.is_authenticated:
            UserCaseHistory.objects.create(
                user=request.user,
                case=case,
                transcript=transcript,
                verdict_given=user_verdict,
                is_correct=verdict_correct
            )
        
        return Response({
            "absolute_truth": case.absolute_truth,
            "verdict_correct": verdict_correct,
            "correct_verdict": case.correct_verdict,
        }, status=status.HTTP_200_OK)
