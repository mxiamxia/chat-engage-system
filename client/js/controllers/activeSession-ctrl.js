/**
 * Created by min on 6/28/16.
 */

app.controller('SessionCtrl', ['$scope', 'Session', SessionCtrl]);

function SessionCtrl($scope, Session) {

    $scope.currentSession = [];
    $scope.search = {text: ''};

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

    $scope.refreshCurrentSessions = function () {
        getCurrentSession();
    };

    $scope.deleteSession = function (sessionId) {
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

}
