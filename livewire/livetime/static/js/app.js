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

//TimeWire.run(function($rootScope, $q, $route) {
    //set rootscope variables here - be aware the route is not yet initialised

//});


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

/* .when('/cal/', {
		templateUrl: '/templates/cal.html',
		controller: 'CalendarCtrl'
	 }) */
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
