
from django.conf.urls.defaults import patterns, include, url
import socketio.sdjango

urlpatterns = patterns("livetime.views",
    url("^uploads/$", "wire", name="wire"),
    url("^upload/$", "upload", name="upload"),
    url("^$", "wire", name="wire"),

    url("^rooms$", "rooms", name="rooms"),
    url("^create/$", "create", name="create"),
    url("^(?P<slug>.*)$", "room", name="room"),
)
