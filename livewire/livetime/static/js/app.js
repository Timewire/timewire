'use strict';

var TimeWire = angular.module('TimeWire', ['ui', 'ngCookies'])
    .config(['$routeProvider', function($routeProvider) {
	$routeProvider
	    .when('/', {
		templateUrl: '/static/templates/timeline.html',
		controller: 'TimeLine'
	    })
	    .when('/uploads/', {
		templateUrl: '/static/templates/upload.html',
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
