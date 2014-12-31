var config = require("../configuration.json")
    , _ = require("underscore")
    , StorageManager = require("./StorageManager")
    , events = require("events")
    , utils = require("./Utils")
    , Promise = require("../node_modules/bluebird/js/browser/bluebird.min")
    ;

function ServiceManager() {
    /**
     * Init function
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
                    return reject(new Error("Unable to create session!"));
                }
            });
        });
    };

    /**
     * Executes the requested service
     * @param {Object} RO - The Response Object
     * @return {Promise}
     */
    this.executeRequestedService = function(RO) {
        return new Promise(function(fulfill, reject) {
            if (!RO.postData.hasOwnProperty("service")) {
                return reject(new Error("Undefined service!"));
            }
            switch(RO.postData.service) {
                case "login":
                    service_LOGIN(RO).then(function() {
                        fulfill();
                    }).catch(function(e) {
                        return reject(e);
                    });
                    break;
                default:
                    return reject(new Error("Inexistent service("+RO.postData.service+")!"));
                    break;
            }

            //if (RO.postData.hasOwnProperty("service") && self.checkIfServiceIsAvailable(RO.postData.service)) {
            //    var serviceObject =  self.availableServices[RO.postData.service];
            //    var handler = (serviceObject.hasOwnProperty("handler")?self[serviceObject.handler]:false);
            //    try {
            //        if(utils.isFunction(handler)) {
            //            //utils.log("EXECUTING HANDLER FOR SERVICE("+RO.postData.service+")...");
            //            handler(RO, function(RO) {
            //                callback(RO);
            //            });
            //        } else {
            //            throw("Not a funtion!");
            //        }
            //    } catch(e) {
            //        msg = "ERROR EXECUTING SERVICE("+RO.postData.service+"): " + e;
            //        utils.log(msg);
            //        RO.body.msg = msg;
            //        callback(RO);
            //    }
            //} else {
            //    msg = "THE REQUESTED SERVICE("+(RO.postData.hasOwnProperty("service")?RO.postData.service:"UNDEFINED")+") IS NOT AVAILABLE!";
            //    utils.log(msg);
            //    RO.code = 500;
            //    RO.body = {msg: msg};
            //    callback(RO);
            //}
        });
    };

    init();
}
module.exports = new ServiceManager();

