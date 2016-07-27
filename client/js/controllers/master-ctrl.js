/**
 * Master Controller
 */

app
    .controller('MasterCtrl', ['$scope', '$cookieStore', '$state', 'Session', 'localStorageService', 'authService', MasterCtrl]);

function MasterCtrl($scope, $cookieStore, $state, Session, localStorageService, authService) {
    /**
     * Sidebar Toggle & Cookie Control
     */
    var mobileView = 992;

    $scope.sessionData = [];

    $scope.currentSession = [];
    $scope.searchText = {text: ''};

    $scope.search = {text: ''};

    $scope.sessionOfToday = 0;
    $scope.engageOfToday = 0;


    console.log('cookie in master=' + JSON.stringify(localStorageService.cookie.get('username')));
    if (authService.isLogin()) {
        $scope.loginname = localStorageService.cookie.get('username').user;
    }

    $scope.getWidth = function() {
        return window.innerWidth;
    };

    $scope.$watch($scope.getWidth, function(newValue, oldValue) {
        if (newValue >= mobileView) {
            if (angular.isDefined($cookieStore.get('toggle'))) {
                $scope.toggle = ! $cookieStore.get('toggle') ? false : true;
            } else {
                $scope.toggle = true;
            }
        } else {
            $scope.toggle = false;
        }
    });

    $scope.toggleSidebar = function() {
        $scope.toggle = !$scope.toggle;
        $cookieStore.put('toggle', $scope.toggle);
    };

    window.onresize = function() {
        $scope.$apply();
    };

    var getSessions = function () {
        Session.getHistorySession()
            .success(function(sessions) {
                $scope.sessionData = sessions;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    var getCurrentSession = function () {
        Session.getCurrentSessions()
            .success(function(sessions) {
                console.log('current session length=' + sessions[0]);
                $scope.currentSession = sessions;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    $scope.refreshSessions = function () {
        Session.getHistorySession()
            .success(function(sessions) {
                $scope.sessionData = sessions;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };
    
    $scope.deleteSession = function (sessionId) {
        console.log('delete session=' + sessionId);
        Session.deleteSession(sessionId)
            .success(function(resp) {
                if (resp.code === 1000) {
                    console.log('cur session length' + $scope.currentSession.length);
                    $scope.currentSession.splice($scope.currentSession.indexOf(resp.id), 1);
                    console.log('cur session length1' + $scope.currentSession.length);
                }
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    $scope.refreshCurrentSessions = function () {
        getCurrentSession();
    };

    var getSessionOfToday = function () {
        Session.getSessionOfToday()
            .success(function(value) {
                $scope.sessionOfToday = value.number;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    $scope.getSessionOfToday = function () {
        getSessionOfToday();
    };

    var getEngageOfToday = function () {
        Session.getEngageOfToday()
            .success(function(value) {
                $scope.engageOfToday = value.number;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };
    $scope.getEngageOfToday = function () {
        getEngageOfToday();
    };

    var init = function () {
        getCurrentSession();
        getSessions();
        getSessionOfToday();
        getEngageOfToday();
    };
    init();

    $scope.logout = function () {
        authService.logout();
        $state.go('index');
    }


}