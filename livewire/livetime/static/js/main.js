'use strict';

function in_array(val, array){
    var i = 0;
    for(i=0; i<array.length; i+=1) {
	if(array[i] === val) {
	    return true;
	}
    }
    return false;
}
Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};


var months_fmt = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
TimeWire.controller('Event', function ($scope, $http, $route, $routeParams, $location, dataService) {
    var render_event = function (data) {
	$scope.events = data[0];
	$scope.articles = data[1];
	$scope.event = _.where($scope.events, {'pk':Number($route.current.params.event_id)})[0];
	$scope.event.start_date = new Date($scope.event.fields.start_date);
	var article_ids = angular.fromJson($scope.event.extras.get_articles);
	$scope.shown_articles = _.filter($scope.articles, function (art) {
	    return _.contains(article_ids, art.pk);
	});
    };
    dataService().then(render_event);
    $scope.close_event = function () {
	$location.path('/topics/'+$scope.topics.join('/'));
    };
});

TimeWire.controller('TimeLine', function ($scope, $http, $route, $routeParams, $location, $rootScope, dataService) {
    var init = function(data) {
	window.addEventListener("resize", init, false);
	$scope.new_topic = "";
	$scope.events = data[0];
	$scope.articles = data[1];
	if ($scope.topics.length > 0) {
	    if ($scope.events.length>0) {
		render_timewire();
	    }
	} else {
	    $location.path('/');
	}
    };
    dataService().then(init);

    var get_marker_position = function(date) {
	var left = get_date_pos(date);
	var day_txt = "";
	var month_txt = "";
	var year_txt = "";
	var marker_height = 3;
	if (this.level === 'day') {
	    day_txt = date.getDate();
	}
	if (this.level === 'month' || (this.level=='day' && !this.has_month_marker)) {
	    month_txt = months_fmt[date.getMonth()];
	}
	if (date.getMonth() === 0 || !this.has_year_marker && date.getDate()==1 || (!this.has_year_marker && !this.has_month_marker)) {
	    year_txt = date.getFullYear();
	    marker_height = 6;
	}

	return {'year_txt':year_txt,
		'month_txt':month_txt,
		'day_txt':day_txt,
		'left':left-$scope.date_marker_width/2,
		'box_left':left - $scope.date_box_width/2,
		'height':marker_height};
    };
    var get_all_markers = function (level, interval) {
	var markers = [];
	if (interval===undefined) {
	    interval = 1;
	}
	var context = {'level':level, 'has_year_marker':has_year_marker(), 'has_month_marker':has_month_marker()};
	if (level === 'year') {
	    markers = _.map(
			  _.map(_.range($scope.start_date.getFullYear()+1, $scope.end_date.getFullYear()+1), function(year) {
			      return new Date(year, 0, 1);
			  }),
			  get_marker_position, context);
	} else if (level === 'quarter') {
	    markers = get_all_markers('month', 3);
	} else if (level === 'month') {
	    // per-month markers previously to the first "year marker"
	    var year = $scope.start_date.getFullYear();
	    markers = _.union(markers, _.map(_.range($scope.start_date.getMonth() + 1 + (12-($scope.start_date.getMonth()+1)) % interval, 12, interval), function (month) {

		return new Date(year, month, 1);
		}));


	    // per-month markers between the marked years
	    _.each(_.range($scope.start_date.getFullYear()+1, $scope.end_date.getFullYear()), function(year) {
		markers = _.union(markers, _.map(_.range(0, 12, interval), function (month) {
		    return new Date(year, month, 1);
		}));
	    });
	    // per month markers after the last "year marker"
	    year = $scope.end_date.getFullYear();
	    markers = _.union(markers, _.map(_.range(0, $scope.end_date.getMonth()+1, interval), function (month) {
		    return new Date(year, month, 1);
		}));
	    markers = _.map(markers, get_marker_position, context);
	} else if (level === 'day') {
	    // per-day markers between the marked months
	    var date = new Date($scope.start_date);
	    var i = 0;
	    while (date < $scope.end_date) {
		markers[i] = date;
		date = new Date(date);
		i += 1;
		date.setDate(date.getDate() + 1);

		    //date += 1000*60*60*24; // day
	    }
	    markers = _.map(markers, get_marker_position, context);
	}
	return markers;
    };
    var has_month_marker = function () {
	$scope.start_date.getMonth();
	if (has_year_marker()) {
	    return true;
	} else if (($scope.end_date.getMonth() - $scope.start_date.getMonth()) > 0){
	    return true;
	}
	return false;
    };
    var has_year_marker = function () {
	if (($scope.end_date.getFullYear() - $scope.start_date.getFullYear()) > 0) {
	    return true;
	}
	return false;
    };

    var get_date_markers = function () {
	var max_markers = $scope.timeline_width/($scope.date_box_width*2.5);
	$scope.chosen_level = "year";
	var levels = _.map(["year", "quarter", "month", "day"], how_many_markers);
	    _.each(levels, function(level) {
		if (level[1] <= max_markers) {
		    $scope.chosen_level = level[0];
		}
	    });
	return get_all_markers($scope.chosen_level);
    };

    var how_many_markers = function (level) {
	var num_markers = 0;
	if (level === "year") {
	    num_markers =  _.range($scope.start_date.getFullYear(), $scope.end_date.getFullYear()).length;
	} else if (level === "quarter") {
	    num_markers = how_many_markers('month')[1]/3;
	} else if (level === "month") {
	    var years = how_many_markers('year')[1];
	    num_markers = Math.max((years-1), 0) * 12;
	    if (years>0) {
		num_markers += _.range(0, $scope.end_date.getMonth()+1).length;
		num_markers += _.range($scope.start_date.getMonth(), 12).length;
	    } else {
		num_markers += _.range($scope.start_date.getMonth(), $scope.end_date.getMonth()).length;
	    }
	} else if (level === "day") {
	    var months = how_many_markers("month")[1];
	    num_markers = Math.max((months-1), 0) * 30; // approximation of 30 days to month
	    if (months>0) {
		num_markers += _.range(0, $scope.end_date.getDate()).length;
		num_markers += _.range($scope.start_date.getDate(), 30).length;
	    } else {
		num_markers += _.range($scope.start_date.getDate(), $scope.end_date.getDate()+1).length;
	    }
	}
	return [level, num_markers];
    };
    var get_date_pos = function (event_start_date) {
	return ($scope.timeline_width * (event_start_date - $scope.start_date)/$scope.duration).toFixed(0);
    };
    var insert_event = function (ev, index, opts) {
	ev.fields.start_date = new Date(ev.fields.start_date);
	ev.fields.end_date = new Date(ev.fields.end_date);
	ev.left = get_date_pos(ev.fields.start_date);
	ev.box = {};
	ev.box.width = opts.box_width;
	ev.box.left = ev.left - ((ev.box.width/2) + opts.box_padding);
	ev.box.right = ev.box.left + ev.box.width + 2*opts.box_padding + opts.box_spacing;

	if ($scope.event_group.length) {
	    if ($scope.event_group[0].box.right > ev.box.left) {
		$scope.event_group[$scope.event_group.length] = ev;
	    }
	    else  {
		render_group(opts);
		// rendering group may move the right most box on layer 0
		if ($scope.event_group[0].box.right <= ev.box.left) {
		    $scope.event_group = [ev];
		} else {
		    $scope.event_group = [];
		}
	    }
	    if (index == $scope.events.length-1) {
		render_group(opts);
		$scope.event_group = [];
	    }
	} else if (ev.box.left >= $scope.layers[0].first_insert_point) {
	    $scope.event_group = [ev];
	}
    };
    var render_group = function (opts) {
	$scope.event_group = _($scope.event_group).sortBy(function (event) {
	    return -event.fields.importance;
	}).slice(0, 3);
	$scope.event_group = _($scope.event_group).sortBy(function (event) {
	    return event.fields.start_date;
	});

	var index = 2;
	_.each($scope.event_group, function (event) {
	    if (index >= 0) {
		// add "conflict" for second and third level in rare case they overlap
		// resolve this by shift the box of the previous event as there will always be space
		// or working backwards from last to first remove the conflicting box
		/* if (event.box.left < $scope.layers[index].first_insert_point) {
		    $scope.layers[index][$scope.layers[index].length].conflict_right = true;
		    event.box.conflict_left = true;
		} */

		$scope.layers[index].events.push(event);
		$scope.layers[index].first_insert_point = event.box.right;
		event.layer = $scope.index_to_layer[index];
		event.height = 40 + opts.layer_height * event.layer;
		event.box.height = event.box.width/1.62;
		event.box.top = event.height + event.box.height;
		event.box.line_height = (event.box.height/5).toFixed(0);
		$scope.shown_events.push(event);
		index -= 1;
		}
	    });
    };
    var render_timewire = function () {
	$scope.start_date = new Date($scope.events[0].fields.start_date);
	$scope.end_date = new Date($scope.events[$scope.events.length-1].fields.start_date);

	$scope.duration = $scope.end_date - $scope.start_date;

	var active_region = document.getElementById('active_region');
	var timeline_segments =  document.getElementsByClassName('timeline'); //only one for now
	_.each(timeline_segments, function (seg) {
	    seg.width = active_region.width + "px";
	    seg.left = active_region.offsetLeft + "px";
	});
	$scope.timeline_width = active_region.offsetWidth;
	$scope.date_box_width = 35;
	$scope.date_marker_width = 2;
	$scope.day_marker_width = 1;
	$scope.all_markers = get_date_markers();
	var opts = {
	    "box_width": $scope.timeline_width/10,
	    "box_padding":$scope.timeline_width/260,
	    "box_spacing": $scope.timeline_width/260,
	    "layer_height": 100}; //layer_height should be set dynamically

	$scope.layers = _.map(_.range(0, 3), function (layer_index) {
				  return {'swaps':[], 'events':[], 'first_insert_point':-((opts.box_width/2) + opts.box_padding + 1)};
			 });
	$scope.event_group = [];
	$scope.swaps = [];

	$scope.shown_events = [];
	$scope.hidden_events = [];

	$scope.index_to_layer = {
	    0:1,
	    1:0,
	    2:2
	};
	_.each($scope.events, function (ev, index) {
	    insert_event(ev, index, opts);
	});
	$scope.layer_sizes = {
	    0:1,
	    1:1,
	    2:1
	};
	//resize_events();

    };
    var resize_events = function () {
	_.each($scope.shown_events, function (ev) {
	    var factor = $scope.layer_sizes[ev.layer];
	    ev.box.width = ev.box.width*factor;
	    ev.box.height =  ev.box.height*factor;
	});
    };
    $scope.add_topic = function() {
	if ($scope.new_topic === "") {
	    return false;
	}
	if (!in_array($scope.new_topic, $rootScope.topics)) {
	    $rootScope.topics[$rootScope.topics.length] = $scope.new_topic;
	    $location.path("/topics/" + $rootScope.topics.join(','));
	} else {
	    $scope.topic_error = $scope.new_topic + " is already in Search Term";
	    $scope.new_topic = "";
	}
	return false;
    };
    $scope.del_topic = function(index) {
	$rootScope.topics.remove(index);
	$location.path("/topics/" + $rootScope.topics.join(','));
	return false;
    };


    $scope.add = function () {
	create_event();
    };
    $scope.zooming=false;
    var x_pos = undefined;
    var y_pos = undefined;
    var ele_width = undefined;
    var ele_height = undefined;
    var timeline = document.getElementById("timeline");

    $scope.stop_prop = function ($event) {
	$event.stopPropagation();
    };
    $scope.open_event = function ($event, event_id) {
	$event.stopPropagation();
	$location.path("/topics/" + $rootScope.topics.join(',') + "/event/" + event_id);
    };
    $scope.start_scroll = function ($event) {
	console.log($event);
	$scope.start_pos = $event.pageX;
	document.body.addEventListener("pointermove", $scope.scroll_move, false);
	document.body.addEventListener("pointerup", $scope.scroll_end, false);
    };
    $scope.scroll_move = function ($event) {
	var left = timeline.offsetLeft + ($event.pageX - $scope.start_pos);
	$scope.start_pos = $event.pageX;
 	timeline.style.left = left + "px";
    };
    $scope.scroll_end = function ($event) {
	document.body.removeEventListener("pointermove", $scope.scroll_move, false);
	document.body.removeEventListener("pointerup", $scope.scroll_end, false);
    };
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
