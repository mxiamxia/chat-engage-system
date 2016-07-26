/**
 * Created by min on 7/26/16.
 */

app.factory('authService', ['$http', Auth]);

function Auth ($http) {
    return {
        authenticate: function (email, password) {
            var input = {email: email, password: password};
            var req = {
                method: 'post',
                url: '/api/authenticate',
                data: input
            };
            return $http(req);
        }
    }
};