
from django.db import models
from django.template.defaultfilters import slugify
from django.core.exceptions import ValidationError


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
    class Meta:
        unique_together = ('domain_name', 'link')
    headline = models.CharField(max_length=150, blank=False, null=False)
    text = models.TextField(blank=False, null=False)
    html = models.TextField(blank=False, null=False)
    date = models.DateTimeField(blank=False, null=False)
    link = models.CharField(max_length=200, blank=False, null=False) # absolute link excluding domain name
    domain_name = models.URLField(null=False, blank=False)
    topic = models.ManyToManyField(Topic)    
    event = models.ForeignKey('Event', related_name='articles')
    domain_data = models.ForeignKey('Domain', related_name='articles')
    importance = models.FloatField(blank=False, null=False)
    
    def get_soup(self):
        try:
            return self.soup
        except AttributeError:
            try:
                return BeautifulSoup(self.read_url(self.get_url()), 'lxml')
            except TypeError:
                raise ValidationError("can't parse html")
                #log failed article


    def read_url(self, url):
        # check robots.txt
        html = getattr(self, 'html')
        if not html:
            try:
                page = urlopen('http://' + url)
                setattr(self, 'html', page.read())
                page.close()
            except URLError:
                html = None
            except ValueError:
                html = None

        return html 

    def get_domain_entry(self, domain_str):
        domain = None
        try:
            domain = Domain.objects.get(pk=domain_str)
        except Domain.DoesNotExist:
            try:
                domain_str = domain_str.split('.', 1)[1]
                domain = self.get_domain_entry(domain_str)
            except IndexError:
                pass

        return domain

    def get_url(self):
        return ''.join([getattr(self, 'domain_name'), getattr(self, 'link')])

    def set_url(self, url):
        url = url.strip()
        res = extract(url)
        segs = []
        for seg in [res.subdomain, res.domain, res.tld]:
            if seg:
                segs.append(seg)
        domain_str = '.'.join(segs)
        domain = self.get_domain_entry(domain_str)
        if not domain:
            domain = Domain(url=domain_str) # create the domain guessing the values
            domain.save()

        setattr(self, 'domain_name', domain_str)
        setattr(self, 'domain_data', domain)
        setattr(self, 'link', url.split(domain_str, 1)[1])

        self.get_soup()
        self.set_title()
        self.set_date()
        self.set_content()

        

    def set_title(self):
        ele_select_data = self.domain_data.title_selector.split('&')
        ele_property = None
        if len(ele_select_data) == 2:
            ele_property =  ele_select_data[1]
        ele_selector = ele_select_data[0]

        try:
            title_element = self.get_soup().select(ele_selector)[0]
        except IndexError:
            print "title element not found"
            title_element = None
        finally:
            if title_element:
                if ele_property:
                    title = title_element.attrs[ele_property].encode('utf-8')[0:150]
                else:
                    title = title_element.text.encode('utf-8')[0:150]
            else:
                title = None

        setattr(self, 'headline', title)


    def set_content(self):
        # check if this need patching to do asynchrous IO, or monkey patching does the job
        setattr(self, 'text', article_extractor.INSTANCE.getText(getattr(self, 'html')))

    def set_date(self):
        #print `datetime.strptime(self.get_soup().select(self.site_data["date_selector"])[0].text, self.site_data['date_fmt'])`
        try:
            ele_select_data = self.domain_data.date_selector.split('&')
            ele_property = None
            if len(ele_select_data) == 2:
                ele_property =  ele_select_data[1]
            ele_selector = ele_select_data[0]

            date_element = self.get_soup().select(ele_selector)[0]
        except IndexError:
            date_element = None
        finally:
            if date_element:
                try:
                    if ele_property:
                        date = datetime.strptime(date_element.attrs[ele_property].encode('utf-8'), self.domain_data.date_fmt)
                    else:
                        date = datetime.strptime(date_element.text.encode('utf-8'), self.domain_data.date_fmt)
                except ValueError:
                    date = None
            else:
                date = None

        setattr(self, 'date', date)


        #return date_parser.parse(date_string, fuzzy=True, dayfirst=True)

import gevent

def parse_url(**kwargs):
    """ assumes that the Article has been instantiated with the full url in 'link' and an Event instance in 'event'.
    """

    article = kwargs['instance']
    ev = gevent.spawn(article.set_url, article.link)
    gevent.joinall([ev])

from django.db.models.signals import pre_save

pre_save.connect(parse_url, Article) #should rather user model validation Model.clean() method

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
