//COMMUNICATOR
var config = require("../configuration.json")
    , SessionManager = require("./SessionManager")
    , UserManager = require("./UserManager")
    , ServiceManager = require("./ServiceManager")
    , events = require("events")
    , url = require("url")
    , utils = require("./Utils")
    ;

function Communicator() {
    this.SESSMAN = new SessionManager();
    this.USERMAN = new UserManager();
    this.SERVMAN = new ServiceManager();
    utils.log("Comunicator created");
}

/**
 * Main Handler for incoming http requests
 * @param httpReq
 * @param httpResp
 * @param httpSrv
 */
Communicator.prototype.elaborateRequest = function(httpReq, httpResp, httpSrv) {
    var self = this;
    var RO = this.getDefaultResponseObject();
    //basic request validation
    RO = this.isValidRequests(RO, httpReq);
    if(RO.code !== 200) {
        httpResp.writeHead(RO.code, RO.head);
        httpResp.end(JSON.stringify(RO.body));
        return;
    }
    //getting raw post data
    this.getRawPostRequest(RO, httpReq, function(RO) {
        RO.ip = utils.getRequestIp(httpReq);
        utils.log("GOT POST REQUEST["+RO.ip+"](LEN="+RO.rawPost.length+")");
        if(RO.code !== 200) {
            httpResp.writeHead(RO.code, RO.head);
            httpResp.end(JSON.stringify(RO.body));
            httpReq.connection.destroy();
            return;
        }
        //decrypting raw post data
        self.decryptRawPostRequest(RO, httpReq, function(RO) {
            if(RO.code !== 200) {
                httpResp.writeHead(RO.code, RO.head);
                httpResp.end(JSON.stringify(RO.body));
                return;
            }
            //now we have decrypted request in RO.postData
            //setup session data
            self.setupSessionUser(RO, function(RO) {
                if(RO.code !== 200) {
                    httpResp.writeHead(RO.code, RO.head);
                    httpResp.end(JSON.stringify(RO.body));
                    return;
                }
                //we have the (updated) session object in RO.session
                //we have the current user in RO.user
                self.executeRequestedService(RO, function() {
                    self.createFinalDocumentBody(RO);
                    httpResp.writeHead(RO.code, RO.head);
                    httpResp.write(RO.encrypted_body);
                    httpResp.end();
                });
            });
        });
    });
};


/** Sets up the final version of the RO.body and puts its crypted equivalent
 *  into RO.crypted_body which will be the final output of the server
 *
 * @param RO
 */
Communicator.prototype.createFinalDocumentBody = function(RO) {
    //include (seed, timestamp, leftPadLength, rightPadLength) for basic communication (will not be available on logout)
    if(RO.session.hasOwnProperty("seed")){RO.body.seed = RO.session.seed;}
    if(RO.session.hasOwnProperty("timestamp")){RO.body.timestamp = RO.session.timestamp;}
    if(RO.session.hasOwnProperty("leftPadLength")){RO.body.leftPadLength = RO.session.leftPadLength;}
    if(RO.session.hasOwnProperty("rightPadLength")){RO.body.rightPadLength = RO.session.rightPadLength;}


    //CRYPT AND PAD THE FINAL RESPONSE(RO.encrypted_body will be posted)
    var unencryptedBody = JSON.stringify(RO.body);
    utils.log("POSTING RESPONSE("+RO.postData.service+"): " + unencryptedBody);
    var encryptedBody = utils.encryptAES(unencryptedBody, RO.postData.seed);
    RO.encrypted_body = utils.leftRightPadString(encryptedBody, RO.postData.leftPadLength, RO.postData.rightPadLength);
};

Communicator.prototype.executeRequestedService = function(RO, callback) {
    var self = this;
    try {
        self.SERVMAN.executeRequestedService(RO, function(RO) {
            callback(RO);
        });
    } catch (e) {
        msg = "UNABLE TO EXECUTE SERVICE MANAGER - " + e;
        utils.log(msg);
        RO.code = 500;
        RO.body = {msg: msg};
        callback(RO);
    }
};

Communicator.prototype.setupSessionUser = function(RO, callback) {
    var self = this;
    var msg;
    /**
     * when rawPost was decrypted(decryptRawPostRequest) by session seed (not login action) RO.user was set up
     */
    if (!RO.user) {
        self.USERMAN.getUserByKey("_id", RO.session.uid, function (USER) {
            if (USER && USER !== null) {
                RO.user = USER;
            } else {
                msg = "UNABLE TO IDENTIFY USER!";
                utils.log(msg);
                RO.code = 500;
                RO.body = {msg: msg};
            }
            callback(RO);
        });
    } else {
        callback(RO);
    }
};

Communicator.prototype.decryptRawPostRequest = function(RO, request, callback) {
    var self = this;
    var msg;

    var _replyToCaller = function() {
        if(!RO.postData) {
            msg = "UNABLE TO DECRYPT RAW DATA!";
            utils.log(msg);
            RO.code = 500;
            RO.body = {msg: msg};
        }
        callback(RO);
    };

    /** let's get all active(not expired) session from SessionMananger
     *  which are bound to current ip(if no ip will do it on all)
     *  and see if this stuff decrypts with session seed
     */
    var _doSessionCheck = function() {
        var filter = {};
        var ip = utils.getRequestIp(request);
        if(ip) {
            filter["ip"] = ip;
        }
        filter["timestamp"] = {$gt: Date.now() - config.session.lifetime};
        self.SESSMAN.getSessionObjectsByFilter(filter, _checkSessionObjects);
    };

    var _checkSessionObjects = function(SESSIONS) {
        var decrypted;
        try {
            if(SESSIONS.length) {
                for(var i = 0; i < SESSIONS.length; i++) {
                    decrypted = utils.decryptRawDataWithSessionData(RO, SESSIONS[i]);
                    if(decrypted !== false) {
                        utils.log("DECRYPTED[SESSION="+SESSIONS[i].sid+"]: " + JSON.stringify(decrypted));
                        RO.session = SESSIONS[i];
                        RO.postData = decrypted;
                        break;
                    }
                }
            }
            if(RO.session!==false && RO.postData!==false) {
                self.SESSMAN.updateSessionObject(RO, function () {
                    _replyToCaller();
                });
            } else {
                doUsersCheck();
            }
        } catch (e) {
            utils.log("DECRYPT(SESS) FAILED! "+e);
        }
    };


    /** let's get all users and try to decrypt with:
     * 1st=password, 2nd=username and see if it works
     */
    var doUsersCheck = function() {
        self.USERMAN.getUsersByKey(null, null, _checkUsers);
    };

    var _checkUsers = function(USERS) {
        var decrypted;
        try {
            if(USERS.length) {
                for(var i = 0; i < USERS.length; i++) {
                    decrypted = utils.decryptRawDataWithUserData(RO, USERS[i]);
                    if(decrypted !== false) {
                        utils.log("DECRYPTED[USER="+USERS[i].username+"]: " + JSON.stringify(decrypted));
                        RO.user = USERS[i];
                        RO.postData = decrypted;
                        break;
                    }
                }
            }
        } catch (e) {
            utils.log("DECRYPT(USR) FAILED! "+e);
        }
        _replyToCaller();
    };

    //doit
    _doSessionCheck();
};

Communicator.prototype.getRawPostRequest = function(RO, request, callback) {
    var msg;
    //
    request.on('data', function (data) {
        if((RO.rawPost.length+data.length) < config.communicator.max_allowed_post_length) {
            RO.rawPost += data;
        } else {
            msg = "HTTP REQUEST LENGTH EXCEEDS ALLOWED LENGTH: " + config.communicator.max_allowed_post_length;
            utils.log(msg);
            RO.code = 500;
            RO.body = {msg: msg};
            RO.rawPost = false;
            callback(RO);
        }
    });
    request.on('end', function() {
        callback(RO);
    });
};

Communicator.prototype.isValidRequests = function(RO, request) {
    var msg;
    var urlParts = url.parse(request.url, true);

    //CHECK FOR INVALID PATHS (only "/" is allowed)
    if (urlParts.pathname != '/') {
        msg = "HTTP REQUEST INVALID PATH: " + urlParts.pathname;
        utils.log(msg);
        RO.code = 404;
        RO.body = {msg: msg};
        return(RO);
    }

    //CHECK FOR INVALID REQUEST METHODS (only POST is allowed)
    if (request.method != 'POST') {
        msg = "HTTP REQUEST INVALID METHOD: " + request.method;
        utils.log(msg);
        RO.code = 404;
        RO.body = {msg: msg};
        return(RO);
    }

    //CHECK FOR COOKIES(no cookies policy!)
    if(request.headers.cookie) {
        msg = "HTTP REQUEST INVALID - UN-ALLOWED COOKIES: " + request.headers.cookie;
        utils.log(msg);
        RO.code = 404;
        RO.body = {msg: msg};
        return(RO);
    }

    //CHECK FOR URL PARAMS(no url params are allowed)
    if(Object.keys(urlParts.query).length) {
        msg = "HTTP REQUEST INVALID - UN-ALLOWED URL PARAMS: " + JSON.stringify(urlParts.query);
        utils.log(msg);
        RO.code = 404;
        RO.body = {msg: msg};
        return(RO);
    }

    //all is ok
    return(RO);
};


Communicator.prototype.getDefaultResponseObject = function () {
    return({
        code: 200,
        head: {
            "Content-Type":"application/json"
        },
        /* will hold the response from this server */
        body: {},
        /* will hold the crypted response from this server */
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

Communicator.prototype.shutdown = function(cb) {
    utils.log("Communicator stopping...");
    try{
        var self = this;
        self.SESSMAN.stopGarbageCollector();
        cb();
    } catch(e) {
        utils.log("Communicator cannot be shut down: " + e);
        cb();
    }
};

//Exported Interface
module.exports = Communicator;