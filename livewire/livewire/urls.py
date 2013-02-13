from livetime.models import Domain

def sites = {'bbc.co.uk':{'title_selector':'h1 .story-header',
                                'date_selector':'meta[property=OriginalPublicationDate]',
                                'date_fmt':"%Y/%m/%d %H:%M:%S"},
            'guardian.co.uk': {'title_selector':'meta title',
                               'date_selector':'meta[property=article:published_time]&content',
                               'date_fmt':"%Y-%m-%dT%H:%M:%S%z"},
            'huffingtonpost.com': {'title_selector':'#main-article-info h1',
                               'date_selector':'meta meta[property=publish_date]',
                               'date_fmt':"%a, %d %b %Y %H:%M:%S"}
            'haaretz.com/news': {'title_selector':'meta[property=og:title]&content',
                               'date_selector':'.author span.date',
                               'date_fmt':"%b.%d, %Y | %I:%M %p"},                   
            'nytimes.com': {'title_selector':'meta[property=og:title]&content',
                               'date_selector':'meta[property=pdate]',
                               'date_fmt':"%Y%m%d"}, 
            'articles.latimes.com': {'title_selector':'meta[property=og:title]&content',
                               'date_selector':'span.pubdate a&href',
                               'date_fmt':"%B %d, %Y"}, 
            'blog.amnestyusa.org': {'title_selector':'article h1.entry-title',
                               'date_selector':'header div div.date',
                               'date_fmt':"%B %d, %Y at %I:%M %p"},
            'globalpost.com': {'title_selector':"title",
                               'date_selector':'meta[property=article:published_time]&content',
                               'date_fmt':"%Y-%m-%dT%H:%M:%S%z"},
            'telegraph.co.uk/news': {'title_selector':'meta[name=title]&content',
                               'date_selector':'meta[name=last-modified]&content',
                               'date_fmt':"%Y-%m-%d"},
            'reuters.com/article': {'title_selector':'meta[name=title]&content',
                               'date_selector':'meta[name=REVISION_DATE]&content',
                               'date_fmt':"%A %b %d %H:%M:%S %Z %Y"},
            'independent.co.uk/news': {'title_selector':'meta[name=title]&content',
                               'date_selector':'meta[property=article:published_time]&content',
                               'date_fmt':"%Y-%m-%d"},




            'common': {'title_selector':["title",'meta[property=og:title]&content'],
                               'date_selector':['meta[property=pdate]'],
                               'date_fmt':["%Y%m%d"],                   
            }


for site in sites:
    create_if_doesnt_exist()


def create_if_doesnt_exist(url):
    try:  
        Domain.objects.get(url='bbc.co.uk')
    except Domain.DoesNotExist:
        site_data = sites[url]
        site_data['url'] = url
        site = Domain(**site_data)
        site.save()






from django.conf.urls import patterns, include, url

from django.contrib import admin
admin.autodiscover()
import socketio.sdjango

urlpatterns = patterns('',
                       url("^socket\.io", include(socketio.sdjango.urls)),
                       url(r'^admin/', include(admin.site.urls)),
                       url("^", include('livetime.urls'))
    # Examples:
    # url(r'^$', 'livewire.views.home', name='home'),
    # url(r'^livewire/', include('livewire.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    # url(r'^admin/', include(admin.site.urls)),
)
