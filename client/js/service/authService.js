/**
 * Created by min on 7/26/16.
 */

app.factory('authService', ['$http', 'localStorageService', Auth]);

function Auth ($http, localStorageService) {
    return {
        authenticate: function (email, password) {
            var input = {email: email, password: password};
            var req = {
                method: 'post',
                url: '/api/authenticate',
                data: input
            };
            return $http(req);
        },

        isLogin: function () {
            if (localStorageService.cookie.get('username') !== 'undefined' &&
                localStorageService.cookie.get('username') !== null) {
                return true;
            }
            return false;
        },

        setLoginStatus: function (user) {
            localStorageService.cookie.set('username', user, 7); //expire in a week
        },

        logout: function () {
            console.log('logout user');
            localStorageService.cookie.remove('username');
        }
    }
};