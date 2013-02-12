'use strict';

var Events = Backbone.Collection.extend({model:Event});
var all_events = new Events();

var create_event = function (data) {
    var ev = new Event(data);
    all_events.add(ev);
};
var create_article = function (data) {
    var art = new Article(data);
    all_articles.add(art);
};
var Articles = Backbone.Collection.extend({model:Article});
var all_articles = new Articles();

var Event = Backbone.Model.extend({id:0,
				   title: 'Title',
				   start_date: new Date(),
				   end_date: new Date(),
				   slug:"/events/0",
				   articles: new Articles(),
				   defaults: {
				       id:0,
				       title: 'Title',
				       start_date: new Date(),
				       end_date: new Date(),
				       url:"/events/0"
				   },
				  initialize: function() {

				  }
				   /*author: function() { ... },

				    coordinates: function() { ... },

				    allowedToEdit: function(account) {
				    return true;*/
				  });


var Article = Backbone.Model.extend({id:0,
				     headline: 'This is a Headline',
				     date: new Date(),
				     article_content: "plain text",
				     article_image_url: "",
				     article_video_url: "",
				     main_url:"/events/0",
				     events: new Events(),
				     defaults: {
					 id:0,
					 title: 'Title',
					 start_date: new Date(),
					 end_date: new Date(),
					 url:"/events/0"
				     },
				  initialize: function() {

				  }
				   /*author: function() { ... },

				    coordinates: function() { ... },

				    allowedToEdit: function(account) {
				    return true;*/
				  });





function getOffset( el ) {
    var _x = 0;
    var _y = 0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return { top: _y, left: _x };
}

TimeWire.controller('TimeLine', function($scope) {
    $scope.all_events = all_events;
    $scope.all_articles = all_articles;
    $scope.add = function () {
	create_event();
    };

    $scope.zooming=false;
    var x_pos = undefined;
    var y_pos = undefined;
    var ele_width = undefined;
    var ele_height = undefined;
    $scope.start_zoom = function ($event) {
	x_pos = getOffset($event.target).left;
	ele_width = $event.target.offsetWidth;
	ele_height = $event.target.offsetHeight;
	y_pos = getOffset($event.target).top;
	$scope.zooming=true;
    };
    $scope.stop_zoom = function ($event) {

	if ($event.pageX <= x_pos || $event.pageX >= x_pos + ele_width || $event.pageY <= y_pos-45 || $event.pageY >= y_pos+ele_height+45) {
	    $scope.zooming=false;
	}
    };
});


TimeWire.controller('Upload', function($scope, $cookies) {
    $scope.csrf = $cookies.csrftoken;
    var test = 0;
});
