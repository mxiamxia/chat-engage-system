/**
 * Master Controller
 */

app
    .controller('MasterCtrl', ['$scope', '$cookieStore', '$http', 'Session', MasterCtrl]);

function MasterCtrl($scope, $cookieStore, $http, Session) {
    /**
     * Sidebar Toggle & Cookie Control
     */
    var mobileView = 992;

    $scope.sessionData = [];

    $scope.currentSession = [];

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

    getSessions();

    var getCurrentSession = function () {
        Session.getCurrentSessions()
            .success(function(sessions) {
                $scope.currentSession = sessions;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };
    getCurrentSession();

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
    };

    $scope.refreshCurrentSessions = function () {
        getCurrentSession();
    }
}