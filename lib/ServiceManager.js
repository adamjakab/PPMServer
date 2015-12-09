var Configuration = require("./Configuration")
    , CustomError = require("./CustomError")
    , _ = require("underscore")
    , StorageManager = require("./StorageManager")
    , events = require("events")
    , utils = require("./Utils")
    , Promise = require("../node_modules/bluebird/js/browser/bluebird.min")
    ;

function ServiceManager() {
    /**
     * Initialization
     */
    var init = function() {
        utils.log("ServiceManager created");
    };

    /**
     * Signals to session manager that user has logged in (create a new session object)
     * @param {Object} RO - The Response Object
     * @return {Promise}
     */
    var service_LOGIN = function(RO) {
        return new Promise(function(fulfill, reject) {
            process.emit('PpmSrv_LOGIN', RO, function(err) {
                if(err) {
                    return reject(err);
                }
                if(_.isObject(RO.session) && !_.isUndefined(RO.session.sid)) {
                    var msg = "YOU("+RO.user.username+") ARE NOW LOGGED IN WITH SESSION("+RO.session.sid+").";
                    utils.log(msg);
                    RO.body.msg = msg;
                    fulfill();
                } else {
                    return reject(new CustomError("Unable to create session!"));
                }
            });
        });
    };

    /**
     * Signals to session manager that user has logged out (removes the current session object)
     * @param {Object} RO - The Response Object
     * @return {Promise}
     */
    var service_LOGOUT = function(RO) {
        return new Promise(function(fulfill, reject) {
            process.emit('PpmSrv_LOGOUT', RO, function(err) {
                if(err) {
                    return reject(err);
                }
                var msg = "GOOD BYE "+RO.user.username+"!";
                utils.log(msg);
                RO.body.msg = msg;
                fulfill();
            });
        });
    };

    /**
     * Simple ping service which does really nothing
     * its purpose is to update seed&timestamp on session object so it does not expire
     * @param {Object} RO - The Response Object
     * @return {Promise}
     */
    var service_PING = function(RO) {
        return new Promise(function(fulfill) {
            RO.body.msg = "PONG";
            fulfill();
        });
    };

    /**
     * Execute Storage services
     * @param {Object} RO - The Response Object
     * @return {Promise}
     */
    var service_DB = function(RO) {
        return StorageManager.executeRequestedOperation(RO);
    };

    /**
     * Executes the requested service
     * @param {Object} RO - The Response Object
     * @return {Promise}
     */
    this.executeRequestedService = function(RO) {
        return new Promise(function(fulfill, reject) {
            if (!RO.postData.hasOwnProperty("service")) {
                return reject(new CustomError("Undefined service!", 200));
            }
            var promise;
            switch(RO.postData.service) {
                case "login":
                    promise = service_LOGIN(RO);
                    break;
                case "logout":
                    promise = service_LOGOUT(RO);
                    break;
                case "ping":
                    promise = service_PING(RO);
                    break;
                case "db":
                    promise = service_DB(RO);
                    break;
                default:
                    return reject(new CustomError("Inexistent service("+RO.postData.service+")!", 200));
                    break;
            }
            promise.then(function() {
                fulfill();
            }).catch(function(e) {
                return reject(e);
            });
        });
    };

    init();
}
module.exports = new ServiceManager();

