var config = require("../configuration.json")
    , _ = require("underscore")
    , events = require("events")
    , url = require("url")
    , Promise = require("../node_modules/bluebird/js/browser/bluebird.min")
    , SessionManager = require("./SessionManager")
    , UserManager = require("./UserManager")
    , ServiceManager = require("./ServiceManager")
    , utils = require("./Utils")
    ;

function Communicator() {
    /**
     * Initialization
     */
    var init = function() {
        utils.log("Communicator created");
    };

    /**
     * Delegate request handling to Communicator
     * @param {IncomingMessage} request
     * @param {ServerResponse} response
     * @return {Promise}
     */
    this.elaborateRequest = function(request, response) {
        return new Promise(function(fulfill, reject) {
            var RO = getDefaultResponseObject();
            checkRequestValidity(RO, request).then(function() {
                getRawRequestData(RO, request).then(function() {
                    decryptRawRequestData(RO).then(function() {
                        setupUser(RO).then(function() {
                            executeRequestedService(RO).then(function() {
                                sendFinalResponse(RO, request, response).then(function() {
                                    fulfill();
                                }).catch(function(e) {
                                    sendResponseForBadRequest(RO, request, response, e);
                                    return reject(e);
                                });
                            }).catch(function(e) {
                                sendResponseForBadRequest(RO, request, response, e);
                                return reject(e);
                            });
                        }).catch(function(e) {
                            sendResponseForBadRequest(RO, request, response, e);
                            return reject(e);
                        });
                    }).catch(function(e) {
                        sendResponseForBadRequest(RO, request, response, e);
                        return reject(e);
                    });
                }).catch(function(e) {
                    sendResponseForBadRequest(RO, request, response, e);
                    return reject(e);
                });
            }).catch(function(e) {
                sendResponseForBadRequest(RO, request, response, e);
                return reject(e);
            });
        });
    };

    /**
     * Sets up the final version of the RO.body and puts its crypted equivalent
     * into RO.crypted_body which will be the final output of the server
     *
     * @param {Object} RO - The Response Object
     * @param {IncomingMessage} request
     * @param {ServerResponse} response
     * @return {Promise}
     */
    var sendFinalResponse = function(RO, request, response) {
        return new Promise(function(fulfill, reject) {
            //include (seed, timestamp, leftPadLength, rightPadLength)
            if (RO.session.hasOwnProperty("seed")) {
                RO.body.seed = RO.session.seed;
            }
            if (RO.session.hasOwnProperty("timestamp")) {
                RO.body.timestamp = RO.session.timestamp;
            }
            if (RO.session.hasOwnProperty("leftPadLength")) {
                RO.body.leftPadLength = RO.session.leftPadLength;
            }
            if (RO.session.hasOwnProperty("rightPadLength")) {
                RO.body.rightPadLength = RO.session.rightPadLength;
            }

            utils.log("DECRYPTED REQUEST: " + JSON.stringify(RO.postData));
            //CRYPT(with seed supplied in request) AND PAD(with lengths supplied in request) THE FINAL RESPONSE
            var unencryptedBody = JSON.stringify(RO.body);
            utils.log("POSTING RESPONSE(" + RO.postData.service + "): " + unencryptedBody);
            var encryptedBody = utils.encryptAES(unencryptedBody, RO.postData.seed);
            RO.encrypted_body = utils.leftRightPadString(encryptedBody, RO.postData.leftPadLength, RO.postData.rightPadLength);
            //
            response.writeHead(RO.code, RO.head);
            response.write(RO.encrypted_body);
            response.end();
            //request.connection.destroy(); //is this needed?
            fulfill();
        });
    };

    /**
     * Execute the requested service
     * @param {Object} RO - The Response Object
     * @return {Promise}
     */
    var executeRequestedService = function(RO) {
        return new Promise(function(fulfill, reject) {
            ServiceManager.executeRequestedService(RO).then(function() {
                fulfill();
            }).catch(function(e) {
                return reject(new Error("SERVICE MANAGER ERROR: " + e.message));
            });
        });
    };

    /**
     * When rawPost is decrypted by session seed (not login action)
     * we are missing RO.user so let's find him
     * @param {Object} RO - The Response Object
     * @return {Promise}
     */
    var setupUser = function(RO) {
        return new Promise(function(fulfill, reject) {
            var msg;
            if (!RO.user && !_.isUndefined(RO.session.uid)) {
                UserManager.getUserByKey("_id", RO.session.uid).then(function(USER) {
                    RO.user = USER;
                }).catch(function(e) {
                    msg = e.message;
                });
            }
            if (!RO.user) {
                return reject(new Error("UNABLE TO IDENTIFY USER! " + (!_.isNull(msg) ? msg : "")));
            }
            fulfill();
        });
    };

    /**
     * Try to decrypt Raw Request Data with sessions/users
     * @param {Object} RO - The Response Object
     * @return {Promise}
     */
    var decryptRawRequestData = function(RO) {
        return new Promise(function(fulfill, reject) {
            decryptRawRequestData_SESSION(RO).then(function() {
                utils.log("Decrypted with session");
                fulfill();
            }).catch(function(e) {
                decryptRawRequestData_USER(RO).then(function() {
                    utils.log("Decrypted with user");
                    fulfill();
                }).catch(function(e) {
                    return reject(new Error("Decryption failed!"));
                });
            });
        });
    };

    /**
     * Try to decrypt Raw Request Data with available sessions
     * @param {Object} RO - The Response Object
     * @return {Promise}
     */
    var decryptRawRequestData_SESSION = function(RO) {
        return new Promise(function(fulfill, reject) {
            var filter = {};
            if(RO.ip) {
                filter["ip"] = RO.ip;
            }
            filter["timestamp"] = {$gt: Date.now() - config.session.lifetime};
            SessionManager.getSessionObjectsByFilter(filter).then(function(SESSIONS) {
                if(SESSIONS.length) {
                    for(var i = 0; i < SESSIONS.length; i++) {
                        var decrypted = utils.decryptRawRequestWithSessionData(RO, SESSIONS[i]);
                        if(decrypted !== false) {
                            RO.session = SESSIONS[i];
                            RO.postData = decrypted;
                            break;
                        }
                    }
                }
                if(RO.session!==false && RO.postData!==false) {
                    SessionManager.updateSessionObject(RO).then(function() {
                        fulfill();
                    }).catch(function (e) {
                        return reject(e);
                    });
                }
                return reject(new Error("Unable to decrypt with sessions!"));
            }).catch(function (e) {
                return reject(e);
            });
        });
    };

    /**
     * Try to decrypt Raw Request Data with available users
     * @param {Object} RO - The Response Object
     * @return {Promise}
     */
    var decryptRawRequestData_USER = function(RO) {
        return new Promise(function(fulfill, reject) {
            UserManager.getAllUsers().then(function(USERS) {
                if(USERS.length) {
                    for(var i = 0; i < USERS.length; i++) {
                        var decrypted = utils.decryptRawRequestWithUserData(RO, USERS[i]);
                        if(decrypted !== false) {
                            utils.log("DECRYPTED[USER="+USERS[i].username+"]: " + JSON.stringify(decrypted));
                            RO.user = USERS[i];
                            RO.postData = decrypted;
                            break;
                        }
                    }
                }
                if(RO.user!==false && RO.postData!==false) {
                    fulfill();
                }
                return reject(new Error("Unable to decrypt with users!"));
            }).catch(function (e) {
                return reject(e);
            });
        });
    };



    /**
     * Reads in the data from the request
     * @param {Object} RO - The Response Object
     * @param {IncomingMessage} request
     * @return {Promise}
     */
    var getRawRequestData = function(RO, request) {
        return new Promise(function(fulfill, reject) {
            request.on('data', function (data) {
                if ((RO.rawPost.length + data.length) < config.communicator.max_allowed_post_length) {
                    RO.rawPost += data;
                } else {
                    RO.rawPost = false;
                    return reject(new Error("HTTP REQUEST LENGTH EXCEEDS ALLOWED LENGTH: " + config.communicator.max_allowed_post_length));
                }
            });
            request.on('end', function () {
                if(RO.rawPost === false) {
                    return reject(new Error("Unable to get raw request data!"));
                } else {
                    fulfill();
                }
            });
        });
    };

    /**
     *
     * @param {Object} RO - The Response Object
     * @param {IncomingMessage} request
     * @return {Promise}
     */
    var checkRequestValidity = function(RO, request) {
        return new Promise(function(fulfill, reject) {
            var urlParts = url.parse(request.url, true);
            RO.ip = utils.getRequestIp(request);
            utils.log("GOT REQUEST FROM: " + RO.ip);

            //CHECK FOR INVALID PATHS (only "/" is allowed)
            if (urlParts.pathname != '/') {
                return reject(new Error("HTTP REQUEST INVALID PATH: " + urlParts.pathname));
            }

            //CHECK FOR INVALID REQUEST METHODS (only POST is allowed)
            if (request.method != 'POST') {
                return reject(new Error("HTTP REQUEST INVALID METHOD: " + request.method));
            }

            //CHECK FOR COOKIES(no cookies policy!)
            if(request.headers.cookie) {
                return reject(new Error("HTTP REQUEST INVALID - UN-ALLOWED COOKIES: " + request.headers.cookie));
            }

            //CHECK FOR URL PARAMS(no url params are allowed)
            if(Object.keys(urlParts.query).length) {
                return reject(new Error("HTTP REQUEST INVALID - UN-ALLOWED URL PARAMS: " + JSON.stringify(urlParts.query)));
            }
            fulfill();
        });
    };

    /**
     * Sends response back for bad requests and closes the connection
     * @todo: add option for stealth mode where we do NOT send any response
     *
     * @param {Object} RO - The Response Object
     * @param {IncomingMessage} request
     * @param {ServerResponse} response
     * @param {Error} error
     */
    var sendResponseForBadRequest = function(RO, request, response, error) {
        RO.code = (RO.code==200 ? 500 : RO.code);
        if(!_.isObject(RO.body)) {
            RO.body = {};
        }
        if(_.isUndefined(RO.body.msg)) {
            RO.body.msg = error.message;
        }
        response.writeHead(RO.code, RO.head);
        response.end(JSON.stringify(RO.body));
        request.connection.destroy();
    };

    /**
     * Set up the default Response Object
     * @return {Object}
     */
    var getDefaultResponseObject = function () {
        return({
            code: 200,
            head: {
                "Content-Type": "text/plain"
            },
            /* will hold the response from this server */
            body: {},
            /* will hold the encrypted response from this server */
            encrypted_body: '',
            /* will hold the ip the user is making request from*/
            ip: false,
            /* will hold the original post */
            rawPost: '',
            /* will hold the decrypted rawPost */
            postData: false,
            /* will hold the user identified as the requester */
            user: false,
            /* will hold the user's current session object*/
            session: false
        });
    };

    init();
}
module.exports = new Communicator();