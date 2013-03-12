'use strict';

var TimeWire = angular.module('TimeWire', ['ui', 'ngCookies', 'filters'])
    .config(['$routeProvider', function($routeProvider) {
	$routeProvider
	    .when('/', {
		templateUrl: '/static/templates/timeline.html',
		controller: 'TimeLine'
	    })
	    .when('/topics/:topics', {
		templateUrl: '/static/templates/timeline.html',
		controller: 'TimeLine'
	    })
	    .when('/topics/:topics/event/:event_id', {
		templateUrl: '/static/templates/event.html',
		controller: 'Event'
	    })
	    .when('/uploads/', {
		templateUrl: '/static/templates/upload.html',
		controller: 'Upload'
	    })
	    .otherwise({redirectTo: '/'});
    }]);


TimeWire.run(function($rootScope) {
    //set rootscope variables here - be aware the route and dom are not yet initialise
});

var pk_incrementor = function () {
    this.start = 0;
    this.incr = function () {
	this.start++;
	return this.start;
    };
};


var TimeLine_incr = new pk_incrementor();
var TimeLine = function (timewire) {
    this.date_box_width = 35;
    this.date_marker_width = 2;
    this.day_marker_width = 1;
    this.number_of_segments = 3;
    var timeline = this;

    this.pk = TimeLine_incr.incr();
    this.width = timewire.offsetWidth;
    this.dragstart_pos = 0;


    this.segments = _.map(_.range(0, this.number_of_segments), function (i) {
	return new TimeLineSeg(timeline);
    });

    this.init = function(start_date, end_date) {
	// called on loading a timewire for this first time
	this.start_date = start_date;
	this.end_date = end_date;
	this.duration = this.end_date - this.start_date;

	var seg_start_date = new Date(this.start_date.getTime() - (this.duration * (Math.floor(this.number_of_segments/2))));

	_.each(this.segments, function (seg) {
	    seg.init(seg_start_date);
	    seg_start_date = new Date(seg_start_date.getTime() + timeline.duration);
	    return seg;
	});
    };

    this.add_segment = function(side) {
	if (side === "left") {
	    var seg = new TimeLineSeg(timeline);
	    seg.set(new Date(this.segments[0].start_date.getTime() - this.duration));
	    this.segments[0] = seg; //insert at beginning of array
	} else if (side === "right") {
	    var seg = new TimeLineSeg(timeline);
	    seg.set(new Date(this.end_date.getTime()));
	    this.segments[this.segments.length] = seg;
	}
    };


    this.handle_dragstart = function ($event) {
	this.dragstart_pos = $event.pageX;
    };
    this.handle_drag = function($event) {
	_.each(this.segments, function (seg) {
	    seg.handle_move_event($event);
	});
	//add new segments where necessary
    };
    this.handle_dragend = function($event) {
	this.handle_drag($event);
	_.each(this.segments, function (seg) {
	    seg.pre_drag_left = seg.left;
	});
	// change_url
    };

    this.zoom = function (factor, zoom_point) {
	if (zoom_point==undefined) {
	    zoom_point = new Date(this.start_date.getTime() + this.duration/2);
	}
	this.duration = this.duration / factor;
	var half_new_duration = this.duration / 2;
	this.start_date = new Date(zoom_point.getTime() - half_new_duration);
	this.end_date = new Date(zoom_point.getTime() + half_new_duration); //half the new duration is on either side of the zoom point

	var seg_start = this.get_date_from_pos(this.segments[0].left);
	_.each(this.segments, function (seg) {
	    seg.set_date(seg_start);
	    seg_start = new Date(seg_start.getTime() + timeline.duration);
	});
    };

    this.get_date_pos = function (event_start_date) {
	return (this.width * (event_start_date - this.start_date)/this.duration).toFixed(0);
    };

    this.get_date_from_pos = function (pos) {
	// pos is a position from the timeline start_date which is at 0
	return new Date(this.start_date.getTime() + this.duration * (pos / this.width));

    };
    this.how_many_markers = function (level) {
	var num_markers = 0;
	if (level === "year") {
	    num_markers =  _.range(timeline.start_date.getFullYear(), timeline.end_date.getFullYear()).length;
	} else if (level === "quarter") {
	    num_markers = timeline.how_many_markers('month')[1]/3;
	} else if (level === "month") {
	    var years = timeline.how_many_markers('year')[1];
	    num_markers = Math.max((years-1), 0) * 12;
	    if (years>0) {
		num_markers += _.range(0, timeline.end_date.getMonth()+1).length;
		num_markers += _.range(timeline.start_date.getMonth(), 12).length;
	    } else {
		num_markers += _.range(timeline.start_date.getMonth(), timeline.end_date.getMonth()).length;
	    }
	} else if (level === "day") {
	    var months = timeline.how_many_markers("month")[1];
	    num_markers = Math.max((months-1), 0) * 30; // approximation of 30 days to month
	    if (months>0) {
		num_markers += _.range(0, timeline.end_date.getDate()).length;
		num_markers += _.range(timeline.start_date.getDate(), 30).length;
	    } else {
		num_markers += _.range(timeline.start_date.getDate(), timeline.end_date.getDate()+1).length;
	    }
	}
	return [level, num_markers];
    };

    this.get_date_markers = function () {
	var max_markers = this.width/(this.date_box_width*2.5);
	this.level = "year";
	var levels = _.map(["year", "quarter", "month", "day"], timeline.how_many_markers);
	_.each(levels, function(l) {
	    if (l[1] <= max_markers) {
		timeline.level = l[0];
	    }
	});
	var markers = {};
	_.each(this.segments, function(seg) {;
	    markers[seg.pk] = seg.get_all_markers(1, timeline.level);
	});
	return markers;
    };

};

var TimeLineSeg_incr = new pk_incrementor();
var TimeLineSeg = function (timewire) {
    var that = this;
    this.pk = TimeLineSeg_incr.incr();
    this.timewire = timewire;
    this.shown = false;

    this.set_position = function () {
	this.left = this.timewire.get_date_pos(this.start_date);
	this.pre_drag_left = this.left;
	this.check_shown();
    };
    this.set_date = function(start_date) {
	// called on zoom
	this.start_date = start_date;
	this.end_date = new Date(start_date.getTime() + timewire.duration);
    };
    this.init = function (start_date) {
	// called only on:
	// a) timewire initialisation
	// b) browser resize - i.e. always the width of the timewire.
	this.set_date(start_date);
	this.set_position();
    };
    this.handle_move_event = function ($event) {
 	that.left = Number(that.pre_drag_left) + $event.pageX - that.timewire.dragstart_pos;
	that.check_shown();
    };
    this.check_shown = function () {
    	if (this.end_date > this.timewire.start_date && this.start_date < this.timewire.end_date) {
	    this.shown = true;
	} else {
	    this.shown = false;
	}
    };



    this.get_marker_position = function(date) {
	var left = that.timewire.get_date_pos(date);
	var day_txt = "";
	var month_txt = "";
	var year_txt = "";
	var marker_height = 3;
	if (that.level === 'day') {
	    day_txt = date.getDate();
	}
	if (that.level === 'month' || (that.level=='day' && !that.has_month_marker())) {
	    month_txt = months_fmt[date.getMonth()];
	}
	if (date.getMonth() === 0 || !that.has_year_marker() && date.getDate()==1 || (!that.has_year_marker() && !that.has_month_marker())) {
	    year_txt = date.getFullYear();
	    marker_height = 6;
	}

	return {'year_txt':year_txt,
		'month_txt':month_txt,
		'day_txt':day_txt,
		'left':left-that.timewire.date_marker_width/2,
		'box_left':left - that.timewire.date_box_width/2,
		'height':marker_height};
    };

    this.get_all_markers = function (interval, level) {
	var markers = [];
	if (interval===undefined) {
	    interval = 1;
	}
	var context = {'level':level, 'has_year_marker':this.has_year_marker(), 'has_month_marker':this.has_month_marker()};
	if (level === 'year') {
	    markers = _.map(
			  _.map(_.range(this.start_date.getFullYear()+1, this.end_date.getFullYear()+1), function(year) {
			      return new Date(year, 0, 1);
			  }),
			  this.get_marker_position, context);
	} else if (level === 'quarter') {
	    markers = this.get_all_markers(3, "month");
	} else if (level === 'month') {
	    // per-month markers previously to the first "year marker"
	    var year = this.start_date.getFullYear();
	    markers = _.union(markers, _.map(_.range(this.start_date.getMonth() + 1 + (12-(this.start_date.getMonth()+1)) % interval, 12, interval), function (month) {

		return new Date(year, month, 1);
		}));


	    // per-month markers between the marked years
	    _.each(_.range(this.start_date.getFullYear()+1, this.end_date.getFullYear()), function(year) {
		markers = _.union(markers, _.map(_.range(0, 12, interval), function (month) {
		    return new Date(year, month, 1);
		}));
	    });
	    // per month markers after the last "year marker"
	    year = this.end_date.getFullYear();
	    markers = _.union(markers, _.map(_.range(0, this.end_date.getMonth()+1, interval), function (month) {
		    return new Date(year, month, 1);
		}));
	    markers = _.map(markers, this.get_marker_position, context);
	} else if (level === 'day') {
	    // per-day markers between the marked months
	    var date = new Date(this.start_date);
	    var i = 0;
	    while (date < this.end_date) {
		markers[i] = date;
		date = new Date(date);
		i += 1;
		date.setDate(date.getDate() + 1);

		    //date += 1000*60*60*24; // day
	    }
	    markers = _.map(markers, this.get_marker_position, context);
	}
	return markers;
    };

    this.has_month_marker = function () {
	this.start_date.getMonth();
	if (this.has_year_marker()) {
	    return true;
	} else if ((this.end_date.getMonth() - this.start_date.getMonth()) > 0){
	    return true;
	}
	return false;
    };
    this.has_year_marker = function () {
	if ((this.end_date.getFullYear() - this.start_date.getFullYear()) > 0) {
	    return true;
	}
	return false;
    };
 };




TimeWire.factory('timeSegments', function($rootScope) {
    var timewire = document.getElementById('timewire');
    $rootScope.timewire = new TimeLine(timewire);
    return $rootScope.timewire;
});

TimeWire.factory('dataService', function($rootScope, $route, $http, $q) {
    /* this could potentially store data locally in IndexDb */
    var cached_topics = {};
    var get_topic = function () {
	$rootScope.topics = $route.current.params['topics'];
	var d = $q.defer();
	if ($rootScope.topics === undefined || $rootScope.topics === "") {
	    $rootScope.topics = [];
	} else {
	    $rootScope.topics = _.sortBy($route.current.params['topics'].split(','), function (topic){return topic;});
	}
	if ($rootScope.topics.length > 0) {
	    var topic_str = $rootScope.topics.join(',');
	    if (cached_topics[topic_str] !== undefined) {
		d.resolve(cached_topics[topic_str]);
	    } else {
		$http({method: 'GET', url: '/aggregate?topics='+ topic_str}).
		    success(function (data, status, headers, config) {
			d.resolve(data);
			cached_topics[topic_str] = data;
		    });
	    }
	} else {
	    d.resolve([[], []]);
	}
	return d.promise;
    };
    return get_topic;
});


TimeWire.config(function($locationProvider) {
    $locationProvider.html5Mode(true).hashPrefix('!');
});


angular.module('filters', []).
    filter('truncate', function () {
	return function (text, length, end) {
	    if (isNaN(length))
		length = 10;

	    if (end === undefined)
		end = "";

	    if (text.length <= length || text.length - end.length <= length) {
		return text;
	    }
	    else {
		return String(text).substring(0, length-end.length) + end;
	    }
	};
    });
