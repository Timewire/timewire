from socketio import socketio_manage

from django.http import HttpResponse
from django.contrib.auth.decorators import user_passes_test
from django.shortcuts import get_object_or_404, render, redirect

from livetime.forms import UploadFileForm

from livetime.models import ChatRoom, Event, Article, Topic
from livetime.chat_socketio import ChatNamespace

def wire(request, template="index.html"):
    context = {}
    return render(request, template, context)

from xlrd import open_workbook, xldate_as_tuple
from datetime import datetime
from django.db import IntegrityError

def process_xl(file):
    """should probably use map and filter to generically map excel columns to attributes and rows to object instances
    for now lets do it the dumb way...
    """
    wb = open_workbook(file_contents=file.read()) # I think this is a socket object not a file at this point so it shouldn't block!?!
    articles_sheet = wb.sheet_by_name('Articles')
    events_sheet = wb.sheet_by_name('Events')
    more_rows = True
    row = 1
    while more_rows:
        import ipdb
        ipdb.set_trace()
        try:
            row_data = [d.value for d in events_sheet.row(row)[0:6] if d.value]
        except IndexError:
            more_rows=False
            break
        if len(row_data) != 6:
            more_rows=False
        else:
            title, start_date, end_date, slug, topics, importance = row_data
            # we could bulk create the events for efficiency later if necessary

            start_date = datetime(*xldate_as_tuple(start_date, wb.datemode))
            end_date = datetime(*xldate_as_tuple(end_date, wb.datemode))
            ev, new = Event.objects.get_or_create(title=title.strip(),
                                                  start_date=start_date,
                                                  end_date=end_date,
                                                  slug=slug.strip(),
                                                  importance=importance)

            if not new:
                ev.start_date = start_date
                ev.end_date = end_date
                ev.title = title.strip()
                ev.importance = importance
            
            topics = topics.split(',')
            for topic in topics:
                topic = topic.strip()
                t, created = Topic.objects.get_or_create(name=topic)
                t.save()
                ev.topics.add(t)

            ev.save()

        row += 1

    # process Articles
    more_rows = True
    row = 1
    while more_rows:
        try:
            row_data = [d.value for d in articles_sheet.row(row)[0:3]]
        except IndexError:
            more_rows=False
            break
        
        if len(row_data) < 2:
            more_rows=False
        
        importance = row_data[0].strip() == '*' and 100 or 0
        article_url = row_data[1]
        event_slug = row_data[2]
        #here we should add articles to a storm task queue for processing articles into the database and...
        # begin the process of automatic topic classification...in reality uploaded documents are expected to have topic data and therefore can be used as training data for later topic classification. 
        # when done in appengine and google task queue the article processing could be done in google task queue providing a spout to storm
        
        # in the meantime we just manually create each article and call a method on it to call the url and parse the incoming html

        print `event_slug`
        event = Event.objects.get(slug=event_slug)

        a = Article.objects.get_or_create(event=event)
        a.parse_url(event_slug)
        a.save()

        row += 1
        

def upload(request, template="index.html"):
    if request.POST and request.FILES:
        upload_form = UploadFileForm(request.POST, request.FILES)
        
        if upload_form.is_valid():
            
            process_xl(request.FILES['time_file'])
        else:
            errors = upload_form.errors
            print `errors`
    context = {}
    return redirect('/')
    #return render(request, template, context)


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
