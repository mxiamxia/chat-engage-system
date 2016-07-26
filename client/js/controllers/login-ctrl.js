app.controller('login-ctrl', ['$scope', '$state', 'authService', LoginController]);


function LoginController($scope, $state, authService) {
    $scope.input = {
        username:'',
        password:''
    };

    $scope.login = function () {
        authService.authenticate($scope.input.username, $scope.input.password)
            .success(function (result) {
                if (result) {
                    if (result.auth) {
                        $scope.loginerror = false;
                        $state.go('layout.dashboard', {username: $scope.input.username});
                    } else {
                        $scope.loginerror = true;
                        $scope.errdetail = 'The username or password is not correct';
                    }
                } else {
                    $scope.loginerror = true;
                    $scope.errdetail = 'Login fail!';
                }
            })
            .error(function (error) {
                $scope.loginerror = true;
                $scope.errdetail = 'Your account does not exist in Mattermost';
            });
    }
}