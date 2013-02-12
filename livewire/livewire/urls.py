from django.conf.urls import patterns, include, url

from django.contrib import admin
admin.autodiscover()
import socketio.sdjango

urlpatterns = patterns('',
                       url("^socket\.io", include(socketio.sdjango.urls)),
                       url(r'^admin/', include(admin.site.urls)),
                       url("^livetime/", include('livetime.urls'))
    # Examples:
    # url(r'^$', 'livewire.views.home', name='home'),
    # url(r'^livewire/', include('livewire.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    # url(r'^admin/', include(admin.site.urls)),
)
