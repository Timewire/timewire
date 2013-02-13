
from django.db import models
from django.template.defaultfilters import slugify

class TimeWire(models.Model):
    """
    """
    title = models.CharField(max_length=100)
    summary = models.TextField(null=False, blank=False)
    forked_from = models.ForeignKey('TimeWire', related_name="forks")
    topic = models.ManyToManyField('Topic')

class Period(models.Model):
    """These are related to 
    """
    summary = models.TextField()
    start_date = models.DateTimeField(blank=False, null=False)
    end_date = models.DateTimeField(blank=False, null=False)
    timewire = models.ForeignKey(TimeWire, related_name="periods") 


class Topic(models.Model):
    name = models.CharField(max_length=30, unique=True)
    

class Article(models.Model):
    """
    """
    class meta:
        unique_together = ('domain', 'link')
    headline = models.CharField(max_length=100, blank=False, null=False)
    text = models.TextField(blank=False, null=False)
    date = models.DateTimeField(blank=False, null=False)
    link = models.CharField(max_length=100, blank=False, null=False) # absolute link excluding domain name
    domain = models.URLField(null=False, blank=False)
    topic = models.ManyToManyField(Topic)    
    event = models.ForeignKey('Event', related_name='articles')
    importance = models.FloatField(blank=False, null=False)

    def parse_url(self, url):
        print url
        

class Event(models.Model):
    class Meta:
        ordering = ("start_date", "end_date")
    topics = models.ManyToManyField(Topic)
    title = models.CharField(max_length=100, blank=False, null=False)
    start_date = models.DateTimeField(blank=False, null=False)
    end_date = models.DateTimeField(blank=False, null=False)
    slug = models.CharField(max_length=100, blank=False, unique_for_date='start_date', null=False)
    importance = models.FloatField(blank=False, null=False)
    #def set_headline()
       #set the headline from the article headlines

    #def set_slug()
       #set the slug from the headline


class ChatRoom(models.Model):

    name = models.CharField(max_length=20)
    slug = models.SlugField(blank=True)

    class Meta:
        ordering = ("name",)

    def __unicode__(self):
        return self.name

    @models.permalink
    def get_absolute_url(self):
        return ("room", (self.slug,))

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super(ChatRoom, self).save(*args, **kwargs)

class ChatUser(models.Model):

    name = models.CharField(max_length=20)
    session = models.CharField(max_length=20)
    room = models.ForeignKey("ChatRoom", related_name="users")

    class Meta:
        ordering = ("name",)

    def __unicode__(self):
        return self.name
