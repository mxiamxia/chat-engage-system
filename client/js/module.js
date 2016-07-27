var app = angular.module('RDash', ['ui.bootstrap', 'ui.router', 'ngCookies', 'angularUtils.directives.dirPagination', 'LocalStorageModule']);

app.run(['$rootScope', '$location', 'authService', '$state', function($rootScope, $location, authService, $state) {
    $rootScope.$on('$stateChangeStart',function(event, toState, toParams, fromState, fromParams){
        if (toState.name=='index') {
            if (authService.isLogin()) {
                event.preventDefault();
                $state.go('layout.dashboard');
                return;
            }
            return;
        }
        if (!authService.isLogin()) {
            event.preventDefault();
            $state.go('index');
            return;
        }
    });
}]);

app.config(['localStorageServiceProvider',
    function (localStorageServiceProvider) {
        localStorageServiceProvider.setPrefix('coengage');
    }]);


