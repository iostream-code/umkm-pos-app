from django.conf import settings
from rest_framework.permissions import BasePermission


class AnalyticsTokenPermission(BasePermission):
    """
    Validasi request dari Laravel menggunakan shared secret token.
    Header: Authorization: Bearer <ANALYTICS_TOKEN>
    """

    def has_permission(self, request, view):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return False
        token = auth.split(" ", 1)[1].strip()
        return token == settings.ANALYTICS_TOKEN
