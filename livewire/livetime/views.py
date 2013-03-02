from socketio import socketio_manage

from django.http import HttpResponse
from django.contrib.auth.decorators import user_passes_test
from django.shortcuts import get_object_or_404, render, redirect

from livetime.forms import UploadFileForm

from livetime.models import ChatRoom, Event, Article, Topic
from livetime.chat_socketio import ChatNamespace

def wire(request, topics=[], template="index.html"):
    context = {}
    return render(request, template, context)

from xlrd import open_workbook, xldate_as_tuple
from datetime import datetime
from django.db import IntegrityError, DatabaseError, connection, transaction
from django.core.exceptions import ValidationError
import gevent
from django import db

def create_event(row_data, datemode):
    title, start_date, end_date, slug, topics, importance = row_data
    # we could bulk create the events for efficiency later if necessary

    start_date = datetime(*xldate_as_tuple(start_date, datemode))
    end_date = datetime(*xldate_as_tuple(end_date, datemode))
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
    
    db.close_connection()


def process_xl(file):
    """should probably use map and filter to generically map excel columns to attributes and rows to object instances
    for now lets do it the dumb way...
    """
    wb = open_workbook(file_contents=file.read()) # I think this is a socket object not a file at this point so it shouldn't block!?!
    articles_sheet = wb.sheet_by_name('Articles')
    events_sheet = wb.sheet_by_name('Events')
    more_rows = True
    row = 1
    events = []
    while more_rows:

        try:
            row_data = [d.value for d in events_sheet.row(row)[0:6] if d.value]
        except IndexError:
            more_rows=False
            break
        if len(row_data) != 6:
            more_rows=False
            break
        else:
            events.append(gevent.spawn(create_event, *[row_data, wb.datemode]))
        row += 1
    gevent.joinall(events)

    # process Articles
    more_rows = True
    row = 1
    articles = []
    i = 0
    while more_rows:
        try:
            row_data = [d.value for d in articles_sheet.row(row)[0:3]]
        except IndexError:
            more_rows=False
            break
        
        if len([r for r in row_data if r]) < 2:
            more_rows=False
            break
        
        # by default each django request gets a new connection and each new thread (or spawned work) therefore gets its own connection
        
        # should use a connection pool or more likely a pool of gevent workers to ensure we don't go over the postgres connection limit

        # oddly as little as 50 simultaneous spawns seems to be suffcient to overcrowd the postgres with max_connections set to 100?!? Perhaps the pre-init event creates a new connection too?
        # further 1 or 2 connections are left "idle in transaction" - why, when all appear to exit? 
        articles.append(gevent.spawn(create_article, *[row_data]))
        i += 1
        if i == 10:
            gevent.joinall(articles)
            i = 0
        #create_article(row_data)
        row += 1
    gevent.joinall(articles)

conn = {'num': 0}

def create_article(row_data):
        conn['num'] +=1
        print conn['num']
        importance = row_data[0].strip() == '*' and 100 or 0
        article_url = row_data[1]
        event_slug = row_data[2]
        #here we should add articles to a storm task queue for processing articles into the database and...
        # begin the process of automatic topic classification...in reality uploaded documents are expected to have topic data and therefore can be used as training data for later topic classification. 
        # when done in appengine and google task queue the article processing could be done in google task queue providing a spout to storm
        
        # in the meantime we just manually create each article and call a method on it to call the url and parse the incoming html

        event = Event.objects.get(slug=event_slug)
        a = Article(event=event, link=article_url, importance=importance)

        try:
            a.save()
            print `a.headline`
            print `a.date`
            print `a.domain_name`
            print `a.event.slug`
            print `a.domain_data.url`
            print `a.importance`
        except ValidationError, e:
            ## log failed article
            print `e`
        except IntegrityError, e:
            ## log failed article
            pass
            #connection.rollback()
        except DatabaseError:
            ## log failed article
            pass
            #connection.rollback()
        finally:
            conn['num'] -= 1
            print str(conn['num']) + " exited"
            db.close_connection()


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


from django.utils.simplejson import dumps, loads, JSONEncoder
from django.core import serializers


def jsonify_events(events, articles):
    for ev in events:
        ev.arts = ev.articles
    
    events = serializers.serialize('json', events, indent=4, extras=('get_articles',))
    
    articles = serializers.serialize('json', articles, indent=4, excludes=('html'))
    json = "[%s, %s]" %(events, articles)
    return json
    #'articles':jsonify_articles(ev.articles)}]

def aggregate(request):
    json = "[[], []]"
    if request.GET:
        topics = request.GET.get('topics', []).split(',')
        if topics:
            start = request.GET.get('start', None)
            end = request.GET.get('end', None)
            events = []
            for topic in topics:
                # find the Events with an intersection of the topic names
                if not events:
                    events = Event.objects.filter(topics__name=topic)
                else:
                    events = events.filter(topics__name=topics)
            if start:
                events = events.filter(start_date__gt=start)
            if end:
                events = events.filter(end_date__lt=end)
            articles = Article.objects.filter(event__in=events)

            json = jsonify_events(events, articles)

    return HttpResponse(json, mimetype='application/json')
        
        

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
