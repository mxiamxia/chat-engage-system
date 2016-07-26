var app = angular.module('RDash', ['ui.bootstrap', 'ui.router', 'ngCookies', 'angularUtils.directives.dirPagination', 'LocalStorageModule']);

app.config(['localStorageServiceProvider',
    function (localStorageServiceProvider) {
        localStorageServiceProvider.setPrefix('coengage');
        // localStorageServiceProvider.setStorageCookieDomain('example.com');
        // localStorageServiceProvider.setStorageType('sessionStorage');
    }]);