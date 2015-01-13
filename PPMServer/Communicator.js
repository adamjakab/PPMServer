var config = require("../configuration.json")
    , CustomError = require("./CustomError")
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
     * Handle request and respond
     * @param {IncomingMessage} request
     * @param {ServerResponse} response
     * @return {Promise}
     */
    this.elaborateRequest = function(request, response) {
        return new Promise(function(fulfill, reject) {
            var RO = getDefaultResponseObject();
            checkRequestValidity(RO, request).then(function() {
                return getRawRequestData(RO, request);
            }).then(function() {
                return decryptRawRequestData(RO);
            }).then(function() {
                return setupUser(RO);
            }).then(function() {
                return executeRequestedService(RO);
            }).then(function() {
                return sendResponse(RO, request, response, null);
            }).then(function() {
                fulfill();
            }).catch(function(e) {
                sendResponse(RO, request, response, e);
                return reject(e);
            });
        });
    };

    /**
     * Sets up the final version of the RO.body and puts its crypted equivalent
     * into RO.crypted_body which will be the final output of the server
     * @todo: add option for stealth mode where we do NOT send any response in case of errors with code !== 200
     *
     * @param {Object} RO - The Response Object
     * @param {IncomingMessage} request
     * @param {ServerResponse} response
     * @param {CustomError} error
     * @return {Promise}
     */
    var sendResponse = function(RO, request, response, error) {
        return new Promise(function(fulfill, reject) {
            if(!_.isNull(error)) {
                RO.code = error.errorNumber;
                RO.body = {
                    msg: error.message
                };
            }
            utils.addSessionDataToRequestObject(RO);
            if(RO.code == 200
                && !_.isUndefined(RO.postData["seed"])
                && !_.isUndefined(RO.postData["leftPadLength"])
                && !_.isUndefined(RO.postData["rightPadLength"])) {
                //utils.log("DECRYPTED REQUEST: " + JSON.stringify(RO.postData));
                var unencryptedBody = JSON.stringify(RO.body);
                //utils.log("POSTING RESPONSE(" + RO.postData.service + "): " + unencryptedBody.substr(0, 128)+"...");
                //CRYPT(with seed supplied in request) AND PAD(with lengths supplied in request) THE FINAL RESPONSE
                var encryptedBody = utils.encryptAES(unencryptedBody, RO.postData["seed"]);
                RO.encrypted_body = utils.leftRightPadString(encryptedBody, RO.postData["leftPadLength"], RO.postData["rightPadLength"]);
            } else {
                RO.encrypted_body = JSON.stringify(RO.body);
            }
            //@todo: stealth check here - respond only to RO.code === 200
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
                return reject(e);
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
            if (!RO.user && !_.isUndefined(RO.session.uid)) {
                UserManager.getUserByKey("_id", RO.session.uid).then(function(USER) {
                    if(_.isNull(USER)) {
                        return reject(new CustomError("UNABLE TO IDENTIFY USER BY SESSION DATA!"));
                    }
                    RO.user = USER;
                    fulfill();
                }).catch(function(e) {
                    return reject(new CustomError("UNABLE TO IDENTIFY USER! " + e.message));
                });
            } else {
                fulfill();
            }
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
                    return reject(new CustomError("Decryption failed!"));
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
                } else {
                    return reject(new CustomError("REQUEST CANNOT BE DECRYPTED WITH SESSION DATA!"));
                }
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
                return reject(new CustomError("REQUEST CANNOT BE DECRYPTED WITH USER DATA!"));
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
                    return reject(new CustomError("HTTP REQUEST LENGTH EXCEEDS ALLOWED LENGTH: " + config.communicator.max_allowed_post_length));
                }
            });
            request.on('end', function () {
                if(RO.rawPost === false) {
                    return reject(new CustomError("Unable to get raw request data!"));
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
                return reject(new CustomError("INVALID PATH: " + urlParts.pathname));
            }

            //CHECK FOR INVALID REQUEST METHODS (only POST is allowed)
            if (request.method != 'POST') {
                return reject(new CustomError("INVALID METHOD: " + request.method));
            }

            //CHECK FOR COOKIES - DISABLED FOR NOW(user might have unknown cookies hanging about - @todo: think about this)
            //if(request.headers.cookie) {
            //    return reject(new CustomError("HTTP REQUEST INVALID - UN-ALLOWED COOKIES: " + request.headers.cookie));
            //}

            //CHECK FOR URL PARAMS(no url params are allowed)
            if(Object.keys(urlParts.query).length) {
                return reject(new CustomError("UN-ALLOWED URL PARAMS: " + JSON.stringify(urlParts.query)));
            }
            fulfill();
        });
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