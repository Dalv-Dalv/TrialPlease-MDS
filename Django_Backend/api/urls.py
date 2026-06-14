from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CaseViewSet, RegisterView, UserProfileView, GoogleAuthView

# Folosim DefaultRouter pentru a genera automat rutele pentru ViewSet
router = DefaultRouter()
router.register(r'cases', CaseViewSet, basename='case')

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('auth/google/', GoogleAuthView.as_view(), name='google-auth'),
]