'use strict';

var TimeWire = angular.module('TimeWire', ['ui'])
    .config(['$routeProvider', function($routeProvider) {
	$routeProvider
	    .when('/', {
		templateUrl: '/templates/timeline.html',
		controller: 'TimeLine'
	    })
	    .when('/upload/', {
		templateUrl: '/templates/upload.html',
		controller: 'Upload'
	    })
	    .otherwise({redirectTo: '/'});
    }]);

/* .when('/cal/', {
		templateUrl: '/templates/cal.html',
		controller: 'CalendarCtrl'
	 }) */
TimeWire.config(function($locationProvider) {
    $locationProvider.html5Mode(true).hashPrefix('!');
});
