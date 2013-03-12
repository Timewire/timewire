'use strict';

function in_array(val, array) {
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

TimeWire.controller('TimeLine', function ($scope, $http, $route, $routeParams, $location, $rootScope, dataService, timeSegments) {


    var fill_data = function (data) {
	window.addEventListener("resize", this, false);
	$scope.new_topic = "";
	$scope.events = data[0];
	$scope.articles = data[1];

	if ($scope.events.length) {
	    $scope.timewire.init(new Date($scope.events[0].fields.start_date), new Date($scope.events[$scope.events.length-1].fields.start_date));
	}


	if ($scope.topics.length > 0) {
	    if ($scope.events.length>0) {
		render_timewire();
	    }
	} else {
	    $location.path('/');
	}
    };
    var init = function () {
	dataService().then(fill_data);
    };
    init();

    var insert_event = function (ev, index, opts) {
	ev.fields.start_date = new Date(ev.fields.start_date);
	ev.fields.end_date = new Date(ev.fields.end_date);
	ev.left = $scope.timewire.get_date_pos(ev.fields.start_date);
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
	$scope.all_markers = $scope.timewire.get_date_markers();
	var opts = {
	    "box_width": $scope.timewire.width/10,
	    "box_padding":$scope.timewire.width/260,
	    "box_spacing": $scope.timewire.width/260,
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

    $scope.stop_prop = function ($event) {
	$event.stopPropagation();
    };
    $scope.open_event = function ($event, event_id) {
	$event.stopPropagation();
	$location.path("/topics/" + $rootScope.topics.join(',') + "/event/" + event_id);
    };

    $scope.start_scroll = function ($event) {
	$scope.timewire.handle_dragstart($event);
	document.body.addEventListener("pointermove", $scope.scroll_move, false);
	document.body.addEventListener("pointerup", $scope.scroll_end, false);
    };
    var scroll = function($event) {
	$scope.timewire.handle_drag($event);
	$scope.$apply();
    };
    var throttled = _.throttle(scroll, 25);
    $scope.scroll_move = function ($event) {
	throttled($event);
    };
    $scope.scroll_end = function ($event) {
	$scope.timewire.handle_dragend($event);
	$scope.$apply();
	document.body.removeEventListener("pointermove", $scope.scroll_move, false);
	document.body.removeEventListener("pointerup", $scope.scroll_end, false);
    };


    $scope.zoom_in = function (factor, zoom_point) {
	$scope.timewire.zoom(factor, zoom_point);
	render_timewire();
    };
    $scope.zoom_out = function (factor) {
	$scope.timewire.zoom(1/factor);
	$scope.all_markers = $scope.timewire.get_date_markers();
	// implement special behaviour for maximum zoomed out level
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
			console.log($scope.csrf);
    var test = 0;
});

