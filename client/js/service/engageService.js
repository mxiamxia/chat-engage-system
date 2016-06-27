/**
 * Created by min on 6/23/16.
 */
app.factory('Session', ['$http', function ($http) {
    return {
        getActiveSessions: function () {
            var req = {
                method: 'GET',
                url: '/api/getActiveSession'
            };
            return $http(req);
        },

        getHistorySession: function () {
            var req = {
                method: 'GET',
                url: '/api/getHistorySession'
            };
            return $http(req);
        },
        getCurrentSessions: function () {
            var req = {
                method: 'GET',
                url: '/api/getAllSessionKey'
            };
            return $http(req);
        },
        deleteSession: function (id) {
            var input = {sessionId: id};
            var req = {
                method: 'POST',
                url: '/api/deleteSession',
                data: input
            };
            return $http(req);
        }
    }
}]);