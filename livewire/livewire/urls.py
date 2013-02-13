from livetime.models import Domain

try:
    Domain.objects.get(url='bbc.co.uk')
except Domain.DoesNotExist:        
    bbc = Domain(url='news.bbc.co.uk',
                 title_selector="h1.story-header",
                 date_selector="span.date",
                 date_fmt="%d %B %Y")
    bbc.save()

try:
    Domain.objects.get(url='guardian.co.uk')
except Domain.DoesNotExist:
    guardian = Domain(url='guardian.co.uk',
                      title_selector='#main-article-info h1',
                      date_selector='.publication time',
                      date_fmt="%A %d %B %Y %H.%M %Z")
    
    guardian.save()



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
