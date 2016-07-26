'use strict';

/**
 * Route configuration for the RDash module.
 */
app.config(['$stateProvider', '$urlRouterProvider', '$locationProvider',
    function($stateProvider, $urlRouterProvider, $locationProvider) {

        // For unmatched routes
        $urlRouterProvider.otherwise('/');

        $locationProvider.html5Mode(true);

        // Application routes
        $stateProvider
            .state('index', {
                url: '/',
                templateUrl: 'templates/login.html',
                controller: 'login-ctrl'
            })
            .state('register', {
                url:'/register',
                templateUrl: 'templates/register.html'
            })
            .state('layout', {
                url: '/main',
                abstract: true,
                templateUrl: 'templates/layout.html'
            })
            .state('layout.dashboard', {
                url: '/dashboard',
                params: {
                    username: {}
                },
                views: {
                    'dashboard': {
                        templateUrl: 'templates/dashboard.html'
                    }
                }
            })
            .state('layout.tables', {
                url: '/tables',
                views: {
                    'table': {
                        templateUrl: 'templates/tables.html'
                    }
                }
            });
    }
]);