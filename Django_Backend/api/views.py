from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Case
from .serializers import CaseSerializer
from .ai_service import genereaza_caz_cu_ai # <--- Importăm funcția ta de AI

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
            ai_data = genereaza_caz_cu_ai()
            
            # 2. Îl trecem prin Serializator ca să validăm și să salvăm în DB
            serializer = self.get_serializer(data=ai_data)
            
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
            return Response({"error": f"Eroare la generare: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)