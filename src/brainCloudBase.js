// Inspired by: http://enterprisejquery.com/2010/10/how-good-c-habits-can-encourage-bad-javascript-habits-part-1/
// Requires that jquery has been loaded as well...

// The variable that will contain the AB Test data retrieved from S3.
var abTestData;

(function(brainCloudManager, undefined) {
    var _sendQueue = [];
    var _inProgressQueue = [];
    var _abTestingId = -1;
    var _sessionId = "";
    var _packetId = -1;
    var _loader = null;
    var _eventCallback = null;
    var _rewardCallback = null;
    var _errorCallback = null;
    var _jsonedQueue = "";

    var _gameId = "";
    var _secret = "";
    var _serverUrl = "https://sharedprod.braincloudservers.com";
    var _dispatcherUrl = _serverUrl + "/dispatcherv2";
    var _fileUploadUrl = _serverUrl + "/uploader";
    var _gameVersion = "";
    var _debugEnabled = false;

    var _useJQuery = true;
    var _requestInProgress = false;

    var _statusCodeCache = 403;
    var _reasonCodeCache = 40304;
    var _statusMessageCache = "No session";

    var _isInitialized = false;
    var _isAuthenticated = false;

    brainCloudManager.initialize = function(gameId, secret, gameVersion) {
        _gameId = gameId;
        _secret = secret;
        _gameVersion = gameVersion;
        _isInitialized = true;
    };

    brainCloudManager.setServerUrl = function(serverUrl) {
        _serverUrl = serverUrl;
        while (_serverUrl.length > 0 && _serverUrl.charAt(_serverUrl.length - 1) == '/')
        {
            _serverUrl = _serverUrl.substring(0, _serverUrl.length - 1);
        }
        _dispatcherUrl = _serverUrl + "/dispatcherv2";
        _fileUploadUrl = _serverUrl + "/uploader";
    };

    brainCloudManager.getDispatcherUrl = function() {
        return _dispatcherUrl;
    };

    brainCloudManager.getFileUploadUrl = function() {
        return _fileUploadUrl;
    };

    brainCloudManager.setABTestingId = function(abTestingId) {
        _abTestingId = abTestingId;
    };

    brainCloudManager.getABTestingId = function() {
        return _abTestingId;
    };

    brainCloudManager.getSessionId = function() {
        return _sessionId;
    };

    brainCloudManager.setSessionId = function(sessionId) {
        _sessionId = sessionId;
    };

    brainCloudManager.getSecret = function() {
        return _secret;
    };

    brainCloudManager.setSecret = function(secret) {
        _secret = secret;
    };

    brainCloudManager.getGameVersion = function() {
        return _gameVersion;
    };

    brainCloudManager.setGameVersion = function(gameVersion) {
        _gameVersion = gameVersion;
    };

    brainCloudManager.getGameId = function() {
        return _gameId;
    };

    brainCloudManager.setGameId = function(gameId) {
        _gameId = gameId;
    };

    brainCloudManager.registerEventCallback = function(eventCallback) {
        _eventCallback = eventCallback;
    };

    brainCloudManager.deregisterEventCallback = function() {
        _eventCallback = null;
    };

    brainCloudManager.registerRewardCallback = function(rewardCallback) {
        _rewardCallback = rewardCallback;
    };

    brainCloudManager.deregisterRewardCallback = function() {
        _rewardCallback = null;
    };

    brainCloudManager.setErrorCallback = function(errorCallback) {
        _errorCallback = errorCallback;
    };

    brainCloudManager.setDebugEnabled = function(debugEnabled) {
        _debugEnabled = debugEnabled;
    };

    brainCloudManager.useJQuery = function(value) {
        _useJQuery = value;
    };

    brainCloudManager.isInitialized = function() {
        return _isInitialized;
    };

    brainCloudManager.isAuthenticated = function() {
        return _isAuthenticated;
    };

    brainCloudManager.sendRequest = function(request) {
        if (_debugEnabled) {
            console.log("SendRequest: " + JSON.stringify(request));
        }
        _sendQueue.push(request);
        if (!_requestInProgress) {
            processQueue();
        }
    };

    brainCloudManager.resetCommunication = function() {
        _sendQueue = [];
        _inProgressQueue = [];
        _sessionId = "";
        _isAuthenticated = false;
        _requestInProgress = false;
        brainCloudClient.authentication.profileId = "";
        resetErrorCache();
    };

    function resetErrorCache() {
        _statusCodeCache = 403;
        _reasonCodeCache = 40304;
        _statusMessageCache = "No session";
    }

    //Handle response bundles with HTTP 200 response
    function handleSuccessResponse(response) {
        var messages = response["responses"];

        if (_debugEnabled) {
            for (var c = 0; c < messages.length; ++c) {
                if (messages[c].status == 200) {
                    console.log("Response(" + messages[c].status + "): "
                            + JSON.stringify(messages[c]));
                } else {
                    console.error("Response(" + messages[c].status + "): "
                            + JSON.stringify(messages[c]));
                }
            }
        }

        for (var c = 0; c < _inProgressQueue.length && c < messages.length; ++c) {
            callback = _inProgressQueue[c].callback;

            if (callback) {
                callback(messages[c]);
            }

            if (_inProgressQueue[c] != null && _errorCallback && essages[c].status != 200) {
                _errorCallback(messages[c]);
            }

            if(_inProgressQueue[c] == null) return; //comms was reset

            if (messages[c].status == 200) {
                if (_inProgressQueue[c].service == "playerState"
                        && (_inProgressQueue[c].operation == "LOGOUT" || _inProgressQueue[c].operation == "FULL_RESET")) {
                    _isAuthenticated = false;
                    _sessionId = "";
                    brainCloudClient.authentication.profileId = "";
                } else if (_inProgressQueue[c].operation == "AUTHENTICATE") {
                    _isAuthenticated = true;
                    resetErrorCache();
                }

                if (_rewardCallback) {
                    var rewards = null;
                    if (_inProgressQueue[c].service
                            && _inProgressQueue[c].operation) {
                        if (_inProgressQueue[c].service == "authenticationV2"
                                && _inProgressQueue[c].operation == "AUTHENTICATE") {
                            resetErrorCache();
                            if (messages[c].data && messages[c].data.rewards
                                    && messages[c].data.rewards.rewards) {
                                rewards = messages[c].data.rewards;
                            }
                        } else if ((_inProgressQueue[c].service == "playerStatistics" && _inProgressQueue[c].operation == "UPDATE")
                                || (_inProgressQueue[c].service == "playerStatisticsEvent" && (_inProgressQueue[c].operation == "TRIGGER" || _inProgressQueue[c].operation == "TRIGGER_MULTIPLE"))) {
                            if (messages[c].data && messages[c].data.rewards) {
                                rewards = messages[c].data;
                            }
                        }

                        if (rewards) {
                            _rewardCallback(rewards);
                        }
                    }
                }
            } else {
                if (messages[c].reason_code == 40303
                        || messages[c].reason_code == 40304
                        || messages[c].reason_code == 40356) {
                    _isAuthenticated = false;
                    _sessionID = "";

                    // cache error if session related
                    _statusCodeCache = messages[c].status;
                    _reasonCodeCache = messages[c].reason_code;
                    _statusMessageCache = messages[c].status_message;
                }
            }

            var events = response["events"];
            if (events && _eventCallback) {
                for (var c = 0; c < events.length; ++c) {
                    var eventsJson = {
                        events : events
                    };
                    _eventCallback(eventsJson);
                }
            }
        }
    }

    function handleNoAuth() {
        var responses = [_inProgressQueue.length];

        var response = {};
        response.status = _statusCodeCache;
        response.reason_code = _reasonCodeCache;
        response.status_message = _statusMessageCache;
        response.severity = "ERROR";

        for (var i = 0; i < _inProgressQueue.length; i++) {
            responses[i] = response;
        }

        handleSuccessResponse({
            "responses" : responses
        });
    }

    function setHeader(xhr) {
        var sig = CryptoJS.MD5(_jsonedQueue + _secret);
        xhr.setRequestHeader('X-SIG', sig);
    }

    function processQueue() {
        if (_sendQueue.length > 0) {
            _inProgressQueue = _sendQueue;
            _sendQueue = [];
            _jsonedQueue = JSON.stringify({
                messages : _inProgressQueue,
                gameId : _gameId,
                sessionId : _sessionId,
                packetId : _packetId++
            });

            // TODO: Handle retry and received packet id

            if (!_isAuthenticated) {
                var isAuth = false;
                for (i = 0; i < _inProgressQueue.length; i++) {
                    if (_inProgressQueue[i].operation == "AUTHENTICATE") {
                        isAuth = true;
                        break;
                    }
                }
                if (!isAuth) {
                    handleNoAuth();
                    return;
                }
            }

            if (_useJQuery) {
                _requestInProgress = true;
                _loader = jQuery.ajax({
                    timeout : 15000,
                    url : _dispatcherUrl,
                    type : "POST",
                    contentType : "application/json",
                    dataType : "json",
                    beforeSend : setHeader,
                    data : _jsonedQueue
                }).done(function(response) {
                    handleSuccessResponse(response);
                }).fail(
                        function(jqXhr, textStatus, errorThrown) {
                            if (_debugEnabled) {
                                console.error("Failed: " + jqXhr + ", "
                                        + textStatus + ", " + errorThrown);
                            }
                            if ((_errorCallback != undefined)
                                    && (typeof _errorCallback == 'function')) {
                                _errorCallback(errorThrown);
                            }
                        }).always(function(jqXhr, textStatus, errorThrown) {
                    //console.log("Complete: " + jqXhr + ", " + textStatus + ", " + errorThrown);
                    _loader = null;
                    _requestInProgress = false;
                    // Now call processQueue again if there is more data...
                    processQueue();
                });
            } else { // don't use jquery for the request
                _requestInProgress = true;
                var xmlhttp;
                if (window.XMLHttpRequest) {
                    // code for IE7+, Firefox, Chrome, Opera, Safari
                    xmlhttp = new XMLHttpRequest();
                } else {
                    // code for IE6, IE5
                    xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
                }

                xmlhttp.onreadystatechange = function() {
                    if (xmlhttp.readyState == XMLHttpRequest.DONE) {
                        console.log("response status : " + xmlhttp.status);
                        console.log("response : " + xmlhttp.responseText);

                        if (xmlhttp.status == 200) {
                            var response = JSON.parse(xmlhttp.responseText);
                            handleSuccessResponse(response);
                        } else {
                            try {
                                var errorResponse = JSON
                                        .parse(xmlhttp.responseText);
                                if (errorResponse["reason_code"]) {
                                    reasonCode = errorResponse["reason_code"];
                                }
                                if (errorResponse["status_message"]) {
                                    statusMessage = errorResponse["status_message"];
                                } else {
                                    statusMessage = xmlhttp.responseText;
                                }

                            } catch (e) {
                                reasonCode = 0;
                                statusMessage = xmlhttp.responseText;
                            }

                            // TODO: New error handling will split out the parts... for now
                            // just send back the response text.
                            var errorMessage = xmlhttp.responseText;
                            if (_debugEnabled) {
                                console.error("Failed");
                            }
                            if ((_errorCallback != undefined)
                                    && (typeof _errorCallback == 'function')) {
                                _errorCallback(errorMessage);
                            }
                        }
                    }

                    _requestInProgress = false;
                    processQueue();
                }; // end inner function

                xmlhttp.timeout = 15000; //millis
                xmlhttp.open("POST", _dispatcherUrl, true);
                xmlhttp.setRequestHeader("Content-type", "application/json");
                var sig = CryptoJS.MD5(_jsonedQueue + _secret);
                xmlhttp.setRequestHeader("X-SIG", sig);
                xmlhttp.send(_jsonedQueue);
            }
        }
    }
}(window.brainCloudManager = window.brainCloudManager || {}));

var brainCloudClient = function(undefined) {

    var exports = {};

    // private...
    exports.sendRequest = function(serviceRequest) {
        brainCloudManager.sendRequest(serviceRequest);
    };

    return exports;

}(window.brainCloudClient = window.brainCloudClient || {});

// See the singleton pattern here:
// https://code.google.com/p/jslibs/wiki/JavascriptTips#Singleton_pattern
function BrainCloudAuthentication() {

    // Singleton
    if (arguments.callee._bcAuthenticationInstance)
        return arguments.callee._bcAuthenticationInstance;

    arguments.callee._bcAuthentication = this;

    this.initialize = function(in_profileId, in_anonymousId) {

    };
}
