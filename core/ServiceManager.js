//SERVICE MANAGER
var config = require("../configuration.json")
    , StorageManager = require("./StorageManager")
    , events = require("events")
    , utils = require("./Utils")
    ;

var STORMAN;

function ServiceManager() {
    STORMAN = new StorageManager();
    utils.log("ServiceManager created");
}

/**
 * Database services - "service":"db","operation":{"name":"get_index", "params":{"collection":null,...} }
 * @param RO
 * @param callback
 */
ServiceManager.prototype.service_DB = function(RO, callback) {
    STORMAN.executeRequestedOperation(RO, function(RO) {
        callback(RO);
    });
};

/**
 * Signals to session manager to create a new session object
 * @param RO
 * @param callback
 */
ServiceManager.prototype.service_LOGIN = function(RO, callback) {
    process.emit('PpmSrv_LOGIN', RO, function() {
        var msg = "YOU("+RO.user.username+") ARE NOW LOGGED IN WITH SESSION("+RO.session.sid+").";
        utils.log(msg);
        RO.body.msg = msg;
        callback();
    });
};

/**
 * Signals to session manager so to remove the current session object
 * @param RO
 * @param callback
 */
ServiceManager.prototype.service_LOGOUT = function(RO, callback) {
    process.emit('PpmSrv_LOGOUT', RO, function() {
        var msg = "GOOD BYE "+RO.user.username+"!";
        utils.log(msg);
        RO.body.msg = msg;
        callback();
    });
};

/**
 * Simple ping service which does really nothing
 * its purpose is to update seed&timestamp on session object so it does not expire
 * @param RO
 * @param callback
 */
ServiceManager.prototype.service_PING = function(RO, callback) {
    var msg = "PINGED";
    //utils.log(msg);
    RO.body.msg = msg;
    callback();
};

/**
 * This object holds the function names that will handle the requested service
 *  {[servicename]: {handler: FunctionName}, ...}
 */
ServiceManager.prototype.availableServices = {
    login: {"handler":"service_LOGIN"},
    logout: {"handler":"service_LOGOUT"},
    ping: {"handler":"service_PING"},
    db: {"handler":"service_DB"}
};

ServiceManager.prototype.executeRequestedService = function(RO, callback) {
    var self = this;
    var msg;
    if (RO.postData.hasOwnProperty("service") && self.checkIfServiceIsAvailable(RO.postData.service)) {
        var serviceObject =  self.availableServices[RO.postData.service];
        var handler = (serviceObject.hasOwnProperty("handler")?self[serviceObject.handler]:false);
        try {
            if(utils.isFunction(handler)) {
                //utils.log("EXECUTING HANDLER FOR SERVICE("+RO.postData.service+")...");
                handler(RO, function(RO) {
                    callback(RO);
                });
            } else {
                throw("Not a funtion!");
            }
        } catch(e) {
            msg = "ERROR EXECUTING SERVICE("+RO.postData.service+"): " + e;
            utils.log(msg);
            RO.body.msg = msg;
            callback(RO);
        }
    } else {
      msg = "THE REQUESTED SERVICE("+(RO.postData.hasOwnProperty("service")?RO.postData.service:"UNDEFINED")+") IS NOT AVAILABLE!";
      utils.log(msg);
      RO.code = 500;
      RO.body = {msg: msg};
      callback(RO);
    }
};


ServiceManager.prototype.checkIfServiceIsAvailable = function(serviceName) {
    return(this.availableServices.hasOwnProperty(serviceName));
};

//Exported Interface
module.exports = ServiceManager;