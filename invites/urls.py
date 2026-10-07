from django.urls import path
from . import views

app_name = 'invites'

urlpatterns = [
    path('', views.home_view, name='home'),
    path('invite/', views.invite_view, name='invite'),
    path('pass-image/', views.pass_image_view, name='pass_image'),
    path('poster/', views.poster_view, name='poster'),
    path('admin.html', views.admin_view, name='admin_html'),
    path('admin-portal/', views.admin_view, name='admin_portal'),
]
