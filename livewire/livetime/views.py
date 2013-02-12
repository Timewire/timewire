from socketio import socketio_manage

from django.http import HttpResponse
from django.contrib.auth.decorators import user_passes_test
from django.shortcuts import get_object_or_404, render, redirect

from livetime.models import ChatRoom
from livetime.chat_socketio import ChatNamespace

def wire(request, template="index.html"):
    context = {}
    return render(request, template, context)


def process_xl(request):
    pass

def upload(request, template="index.html"):
    if request.POST and request.FILES:
        upload_form = UploadForm(request.POST, request.FILES)
        
        if form.is_valid():

            process_xl(request.FILES['file'])
        else:
            errors = form.errors
    context = {}
    return render(request, template, context)


def rooms(request, template="rooms.html"):
    """
    Homepage - lists all rooms.
    """
    context = {"rooms": ChatRoom.objects.all()}
    return render(request, template, context)


def room(request, slug, template="room.html"):
    """
    Show a room.
    """
    context = {"room": get_object_or_404(ChatRoom, slug=slug)}
    return render(request, template, context)


def create(request):
    """
    Handles post from the "Add room" form on the homepage, and
    redirects to the new room.
    """
    name = request.POST.get("name")
    if name:
        room, created = ChatRoom.objects.get_or_create(name=name)
        return redirect(room)
    return redirect(rooms)
