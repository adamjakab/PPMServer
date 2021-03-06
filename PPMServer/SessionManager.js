var config = require("../configuration.json")
    , CustomError = require("./CustomError")
    , nedb = require('nedb')
    , events = require("events")
    , Promise = require("../node_modules/bluebird/js/browser/bluebird.min")
    , utils = require("./Utils")
    ;

function SessionManager() {
    /** @type Datastore */
    var SessionStorage;
    var GCInterval = null;
    var eventEmitter;

    var init = function() {
        //file based session storage
        SessionStorage = new nedb({filename: 'data/session.db', autoload:true});
        //in-memory session storage
        //SessionStorage = new nedb();

        // Using a unique constraint on sid
        SessionStorage.ensureIndex({fieldName: 'sid', unique: true });
        SessionStorage.ensureIndex({fieldName: 'uid', unique: false });
        SessionStorage.ensureIndex({fieldName: 'ip', unique: false });

        //setup global event listeners
        setupEventListeners();

        //setup garbage Session collector
        eventEmitter = new events.EventEmitter();
        startGarbageCollector();

        utils.log("SessionManager created");
    };

    /**
     * Creates new session object for user with uid/ip
     * @param {string} uid
     * @param {string} ip
     * @return {Promise}
     */
    var createNewSessionObject = function (uid, ip) {
        return new Promise(function(fulfill, reject) {
            var SO = {
                sid: utils.getGibberish(config.session.sid_length, config.session.sid_length, {"special": false, "extendedUpper": false, "extendedLower": false}),
                uid: uid,
                ip: ip,
                seed: utils.getGibberish(config.session.seed_length_min, config.session.seed_length_max),
                timestamp: Date.now(),
                leftPadLength: utils.getRandomNumberInRange(config.session.pad_length_min, config.session.pad_length_max),
                rightPadLength: utils.getRandomNumberInRange(config.session.pad_length_min, config.session.pad_length_max)
            };
            SessionStorage.insert(SO, function (err, SO) {
                if (err) {
                    return reject(new CustomError("Cannot create new Session! " + err));
                }
                utils.log("CREATED NEW SESSION OBJECT[" + SO.sid + "] WITH SEED(" + SO.seed + ").");
                fulfill(SO);
            });
        });
    };

    /**
     * Updates session object with fresh values and saves it
     * @param {Object} RO - The Response Object
     * @return {Promise}
     */
    this.updateSessionObject = function(RO) {
        return new Promise(function(fulfill, reject) {
            if(RO.session === false) {
                return reject(new CustomError("Undefined Session Error!"));
            }
            utils.log("UPDATING Session["+RO.session.sid+"]...");
            RO.session.timestamp = Date.now();
            RO.session.seed = utils.getGibberish(config.session.seed_length_min, config.session.seed_length_max);
            RO.session.leftPadLength = utils.getRandomNumberInRange(config.session.pad_length_min, config.session.pad_length_max);
            RO.session.rightPadLength = utils.getRandomNumberInRange(config.session.pad_length_min, config.session.pad_length_max);
            SessionStorage.update({sid: RO.session.sid }, RO.session, {}, function(err) {
                if (err) {
                    return reject(new CustomError("Cannot update Session! " + err));
                }
                fulfill();
            });
        });
    };

    /**
     * @param {Object} filter
     * @return {Promise}
     */
    this.getSessionObjectsByFilter = function(filter) {
        return new Promise(function(fulfill, reject) {
            if(!filter) {
                return reject(new CustomError("Undefined filter!"));
            }
            SessionStorage.find(filter, function(err, SOS) {
                if (err) {
                    return reject(new CustomError("Cannot get Session Objects! " + err));
                }
                fulfill(SOS);
            });
        });
    };

    /**
     * @param {Object} filter
     * @return {Promise}
     */
    var removeSessionObjectByFilter = function(filter) {
        return new Promise(function(fulfill, reject) {
            if(!filter) {
                return reject(new CustomError("Undefined filter!"));
            }
            SessionStorage.remove(filter, function(err, cnt) {
                if (err) {
                    return reject(new CustomError("Cannot remove Session Objects! " + err));
                }
                fulfill();
            });
        });

    };


    /**
     * Listen to internal events
     */
    var setupEventListeners = function() {
        process.on("PpmSrv_LOGIN", function(RO, callback) {
            createNewSessionObject(RO.user._id, RO.ip).then(function(newSessionObject) {
                RO.session = newSessionObject;
                callback(undefined);
            }).catch(function(e) {
                callback(e);
            });
        });

        process.on("PpmSrv_LOGOUT", function(RO, callback) {
            removeSessionObjectByFilter({sid: RO.session.sid}).then(function() {
                utils.log("SM REMOVED SESSION OBJECT["+RO.session.sid+"].");
                //remove timestamp, seed, leftPadLength, rightPadLength from session object
                //so they will not be sent back to client
                delete RO.session.seed;
                delete RO.session.timestamp;
                delete RO.session.leftPadLength;
                delete RO.session.rightPadLength;
                callback(undefined);
            }).catch(function(e) {
                callback(e);
            });
        });

        process.on("PpmSrv_SHUTDOWN", function(callback) {
            stopGarbageCollector();
            callback();
        });
    };


    /**
     * GC will remove stale session objects and compact the datafile
     */
    var startGarbageCollector = function() {
        eventEmitter.on("garbage-collect", function() {
            var expiredTimestamp = Date.now() - config.session.lifetime;
            //@todo - let's use removeSessionObjectByFilter by adding multi option on it
            SessionStorage.remove({"timestamp":{$lt: expiredTimestamp}}, {multi: true}, function(err, num) {
                utils.log("SMGarbageCollector sessions removed: " + num);
                SessionStorage.persistence.compactDatafile();
            });
        });
        GCInterval = setInterval(function() {
            eventEmitter.emit("garbage-collect");
        }, config.session.garbage_collection_interval);
        utils.log("SMGarbageCollector started");
    };

    var stopGarbageCollector = function() {
        clearInterval(GCInterval);
        GCInterval = null;
        utils.log("SMGarbageCollector stopped");
    };

    init();
}
module.exports = new SessionManager();