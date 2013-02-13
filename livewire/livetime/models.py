
from django.db import models
from django.template.defaultfilters import slugify

from urllib2 import urlopen, URLError
from jnius import autoclass
from bs4 import BeautifulSoup
from datetime import datetime
from dateutil import parser as date_parser
from tldextract.tldextract import extract

#default_extractor = autoclass("de.l3s.boilerpipe.extractors.DefaultExtractor")
article_extractor = autoclass("de.l3s.boilerpipe.extractors.ArticleExtractor")


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
    headline = models.CharField(max_length=150, blank=False, null=False)
    text = models.TextField(blank=False, null=False)
    html = models.TextField(blank=False, null=False)
    date = models.DateTimeField(blank=False, null=False)
    link = models.CharField(max_length=200, blank=False, null=False) # absolute link excluding domain name
    domain = models.URLField(null=False, blank=False)
    topic = models.ManyToManyField(Topic)    
    event = models.ForeignKey('Event', related_name='articles')
    domain = models.ForeignKey('Domain', related_name='articles')
    importance = models.FloatField(blank=False, null=False)
    
    def get_soup(self):
        try:
            return self.soup
        except AttributeError:
            return BeautifulSoup(self.read_url(self.get_url()), 'lxml')


    def read_url(self, url):
        # check robots.txt
        try:
            self.html
        except AttributeError:
            try:
                page = urlopen(url)
                self.html  = page.read()
                page.close()
            except URLError:
                self.html = ""
        finally:
            return self.html 

    def set_url(self, url):
        url = url.strip()
        res = extract(url)
        segs = []
        for seg in [res.subdomain, res.domain, res.tld]:
            if seg:
                segs.append(seg)
        domain_str = '.'.join(segs)

        try:
            domain = Domain.objects.get(pk=domain_str)
        except Domain.DoesNotExist:
            domain = Domain(url = domain_str)
            domain.save()

        setattr(self, 'domain', domain)
        try:
            setattr(self, 'link', url.split(domain_str, 1)[1])
        except:
            import ipdb
            ipdb.set_trace()
        self.get_soup()
        self.set_title()
        self.set_date()
        self.set_content()

    def get_url(self):
        return ''.join([getattr(self, 'domain').url, getattr(self, 'link')])
        

    def set_title(self):
        setattr(self, 'headline', self.get_soup().select(self.domain.title_selector)[0].text[0:150])

    def set_content(self):
        # check if this need patching to do asynchrous IO, or monkey patching does the job
        setattr(self, 'text', article_extractor.INSTANCE.getText(self.html))

    def set_date(self):
        #print `datetime.strptime(self.get_soup().select(self.site_data["date_selector"])[0].text, self.site_data['date_fmt'])`
        date_str = self.get_soup().select(self.domain.date_selector)[0].text
        date = datetime.strptime(date_str, self.domain.date_fmt)
        setattr(self, 'date', date)


        #return date_parser.parse(date_string, fuzzy=True, dayfirst=True)



def parse_url(**kwargs):
    """ assumes that the Article has been instantiated with the full url in 'link' and an Event instance in 'event'.
    """
    article = kwargs['instance']
    article.set_url(article.link)
        
from django.db.models.signals import pre_save

pre_save.connect(parse_url, Article)

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




class Domain(models.Model):
    # add synopsis
    url = models.URLField(primary_key=True)
    date_fmt = models.CharField(max_length="40")
    date_selector = models.CharField(max_length="100")
    title_selector = models.CharField(max_length="100")


    def guess_title_selector(self):
        return ''

    def guess_date_selector(self):
        return ''

    def guess_date_fmt(self):
        return ''


def set_data(**kwargs):
    domain= kwargs['instance']
    if not kwargs.has_key('title_selector'):
        kwargs['title_selector'] = domain.guess_title_selector()

    if not kwargs.has_key('date_selector'):
        kwargs['date_selector'] = domain.guess_date_selector()

    if not kwargs.has_key('date_fmt'):
        kwargs['date_fmt'] = domain.guess_date_fmt()


pre_save.connect(set_data, Domain)




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
