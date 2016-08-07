(function () {
    "use strict";

    angular.module('app.controllers')
        .controller('DashboardController', function ($rootScope, $scope, $state, $stateParams, Restangular, DialogService, ToastService, Session, EVENTS, Upload, FileReaderService, CommandsService, Helpers) {
            var channel = 'pub_' + $stateParams.title;
            var Chatrooms = Restangular.all('chatrooms');
            var Chatroom = Restangular.one('chatrooms', channel);
            var Moderators = Restangular.all('moderators');
            var Rules = Restangular.all('rules');

            $scope.chatroom = {};
            $scope.collapseMarkdownHelp = true;
            $scope.chatInfoErrors = null;
            $scope.formData = {};
            $scope.banFormData = {};
            $scope.modFormData = {};
            $scope.cropOptions = {
                croppedImage: null,
                sourceImage: null,
                width: 256,
                height: 256
            };

            Helpers.whenCtrlReady(function () {
                Restangular.one('chatrooms', $stateParams.title).get().then(function (response) {

                    if (!$rootScope.isModFor($rootScope.currentUser, response.data.channel) && response.data.owner_id !== $rootScope.currentUser.id) {
                        ToastService.error('You are not a mod here.');
                        $state.go('app.home');
                    }

                    $scope.chatroom = clone(response.data);
                    $scope.formData = clone(response.data);
                });

                Moderators.getList({channel: channel}).then(function (response) {
                    $scope.mods = response;
                });

                getBans();
            });

            $scope.updateChatInfo = function () {
                $scope.formData.type = 'update';

                Chatroom.patch($scope.formData).then(function (response) {
                    $scope.chatroom = clone(response.data);
                    $scope.formData = clone(response.data);
                    ToastService.show('Chatroom has been updated');
                }, function (response) {
                    $scope.chatInfoErrors = response.data;
                });
            };
            $scope.unbanUsers = function () {
                for (var i = 0; i < $scope.bans.length; i++) {
                    if ($scope.bans[i].unban === true) {
                        (function (i) {
                            Restangular.all('commands/execute').post({
                                command: 'unban',
                                args: [$scope.bans[i].user.username],
                                channel: channel
                            }).then(function (response) {
                                getBans();
                                $scope.banFormData.username = '';
                            }, function (response) {
                                ToastService.error(response.data);
                            });
                        })(i);
                    }
                }

                ToastService.show('Unbanned users.');
            };
            $scope.banUser = function () {
                Restangular.all('commands/execute').post({
                    command: 'ban',
                    args: [$scope.banFormData.username.replace('@', '')],
                    channel: channel
                }).then(function (response) {
                    getBans();
                    ToastService.show('You have banned ' + $scope.banFormData.username + ' from #' + $scope.chatroom.title + '.');
                    $scope.banFormData.username = '';
                }, function (response) {
                    ToastService.error(response.data);
                });
            };
            $scope.demodUsers = function () {
                var usersToDemod = [];

                for (var i = 0; i < $scope.mods.length; i++) {
                    if ($scope.mods[i].demod === true) {
                        usersToDemod.push($scope.mods[i].user.id);
                        (function (i) {
                            Restangular.one('moderators', $scope.mods[i].id).remove({channel: channel}).then(function (response) {
                                $scope.mods.splice(i, 1);
                            });
                        })(i);
                    }
                }

                ToastService.show('Demodded users.');
            };
            $scope.modUser = function (chatroom) {
                $scope.modFormData.channel = channel;
                Restangular.all('moderators').post($scope.modFormData).then(function (response) {
                    $scope.mods.push(response.data);
                    ToastService.show('You have promoted ' + response.data.user.username + ' to moderator.');
                    $scope.modFormData = {};
                });
            };
            $scope.hide = function () {
                DialogService.hide();
            };
            $scope.disclaimHashtag = function (chatroom) {
                Chatroom.patch({type: 'disclaim'}).then(function (response) {
                    $scope.chatroom.owner_id = 0;
                    ToastService.show('You no longer own this hashtag.');
                    $rootScope.currentUser.chatroom = null;
                    $scope.hide();
                    $state.go('app.home');
                });
            };
            $scope.uploadPhoto = function () {
                if (!$scope.uploadingPicture && !!$scope.cropOptions.croppedImage) {
                    $scope.uploadingPicture = true;

                    Upload.upload({
                        url: '/api/chatrooms/photo',
                        method: 'POST',
                        headers: {Authorization: 'Bearer ' + Session.getToken()},
                        file: dataURItoBlob($scope.cropOptions.croppedImage),
                        data: {channel: channel}
                    }).success(function (response) {
                        $scope.cropOptions = {
                            croppedImage: null,
                            sourceImage: null,
                            width: 256,
                            height: 256
                        };
                        $scope.uploadingPicture = false;

                        ToastService.show('Chatroom avatar has been updated.');
                    }).error(function () {
                        $scope.uploadingPicture = false;
                        ToastService.error('Sorry, something went wrong.');
                    });
                }
            };
            $scope.onFileSelect = buildOnFileSelectFunction($scope, FileReaderService);

            function getBans() {
                Rules.getList({channel: channel, type: 'ban'}).then(function (response) {
                    $scope.bans = response;
                });
            }
        });

})();
