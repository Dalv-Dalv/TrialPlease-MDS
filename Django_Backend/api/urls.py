from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CaseViewSet

# Folosim DefaultRouter pentru a genera automat rutele pentru ViewSet
router = DefaultRouter()
router.register(r'cases', CaseViewSet, basename='case')

urlpatterns = [
    path('', include(router.urls)),
    # Endpoint-ul tău de login existent probabil arată așa:
    # path('login/', obtain_auth_token, name='api_token_auth'),
]