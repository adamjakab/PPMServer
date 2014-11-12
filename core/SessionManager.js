//SESSION MANAGER
var config = require("../configuration.json")
    , nedb = require('nedb') /*https://github.com/louischatriot/nedb*/
    , events = require("events")
    , utils = require("./Utils")
    ;

function SessionManager() {
    //file based session storage
    this.SS = new nedb({ filename: 'data/session.db', autoload:true });
    //in-memory session storage
    //this.SS = new nedb();

    // Using a unique constraint on sid (JSDoc on ensureIndex is wrong!)
    this.SS.ensureIndex({fieldName: 'sid', unique: true });
    // non-unique constraints
    this.SS.ensureIndex({fieldName: 'uid', unique: false });
    this.SS.ensureIndex({fieldName: 'ip', unique: false });
    utils.log("SessionManager created");

    //setup global event listeners
    this.setupEventListeners();

    //setup garbage Session collector
    this.GCInterval = null;
    this.eventEmitter = new events.EventEmitter();
    this.startGarbageCollector();
}


/**
 * Updates session object with fresh values and saves it
 * @param RO
 * @param callback
 */
SessionManager.prototype.updateSessionObject = function(RO, callback) {
    var self = this;
    if(RO.session !== false) {
        utils.log("UPDATING SO["+RO.session.sid+"]...");
        RO.session.timestamp = Date.now();
        RO.session.seed = utils.getUglyString(config.session.seed_length_min, config.session.seed_length_max, true);
        RO.session.leftPadLength = utils.getRandomNumberInRange(config.session.pad_length_min,config.session.pad_length_max);
        RO.session.rightPadLength = utils.getRandomNumberInRange(config.session.pad_length_min,config.session.pad_length_max);
        self.SS.update({sid: RO.session.sid }, RO.session, {}, function(err, cnt) {
            if (err) {utils.log("Error updating SO["+RO.session.sid+"]: " + JSON.stringify(err));}
            callback(RO);
        });
    } else {
        callback(RO);
    }
};


SessionManager.prototype.getSessionObjectByKey = function(key, val, callback) {
    if(!key||!val) {callback();}
    var findFilter = {};
    if(key&&val) {findFilter[key] = val;}
    this.SS.findOne(findFilter, function(err, SO) {
        if (err) {utils.log("Error finding SO: " + JSON.stringify(err));}
        callback(SO);
    });
};

SessionManager.prototype.getSessionObjectsByKey = function(key, val, callback) {
    if(!key||!val) {callback([]);}
    var findFilter = {};
    if(key&&val) {findFilter[key] = val;}
    this.SS.find(findFilter, function(err, SOS) {
        if (err) {utils.log("Error finding SOs: " + JSON.stringify(err));}
        callback(SOS);
    });
};

SessionManager.prototype.getSessionObjectsByFilter = function(findFilter, callback) {
    if(!findFilter) {callback([]);}
    this.SS.find(findFilter, function(err, SOS) {
        if (err) {utils.log("Error finding filtered SOs: " + JSON.stringify(err));}
        callback(SOS);
    });
};

SessionManager.prototype.createNewSessionObject = function (uid, ip, callback) {
    var SO = {
        sid: utils.getUglyString(config.session.sid_length),
        uid: uid,
        ip: ip,
        seed: utils.getUglyString(config.session.seed_length_min, config.session.seed_length_max, true),
        timestamp: Date.now(),
        leftPadLength: utils.getRandomNumberInRange(config.session.pad_length_min,config.session.pad_length_max),
        rightPadLength: utils.getRandomNumberInRange(config.session.pad_length_min,config.session.pad_length_max)
    };
    this.SS.insert(SO, function(err, SO) {
        if (err) {
            utils.log("Error inserting SO: " + JSON.stringify(err));
        } else {
            utils.log("CREATED NEW SESSION OBJECT["+SO.sid+"] WITH SEED("+SO.seed+").");
        }
        callback(SO);
    });
};


SessionManager.prototype.removeSessionObjectByKey = function(key, val, callback) {
    if(!key||!val) {callback();}
    var findFilter = {};
    findFilter[key] = val;
    this.SS.remove(findFilter, function(err, cnt) {
        if (err) {utils.log("Error removing SO: " + JSON.stringify(err));}
        callback();
    });
};


/**
 * GC will remove stale session objects and compact the datafile
 */
SessionManager.prototype.startGarbageCollector = function() {
    var self = this;
    this.eventEmitter.on("garbage-collect", function() {
        var expiredTimestamp = Date.now() - config.session.lifetime;
        self.SS.remove({"timestamp":{$lt: expiredTimestamp}}, {multi: true}, function(err, num) {
            utils.log("SMGarbageCollector sessions removed: " + num);
            self.SS.persistence.compactDatafile();
        });
    });
    this.GCInterval = setInterval(function(){
        self.eventEmitter.emit("garbage-collect");
    }, config.session.garbage_collection_interval);
    utils.log("SMGarbageCollector started");
};

SessionManager.prototype.stopGarbageCollector = function() {
    clearInterval(this.GCInterval);
    this.GCInterval = null;
    utils.log("SMGarbageCollector stopped");
};


SessionManager.prototype.setupEventListeners = function() {
    var self = this;
    process.on("PpmSrv_LOGOUT", function(RO, callback) {
        self.removeSessionObjectByKey("sid", RO.session.sid, function() {
            utils.log("SM REMOVED SESSION OBJECT["+RO.session.sid+"].");
            //remove timestamp, seed, leftPadLength, rightPadLength from session object
            //so they will not be sent back to client
            delete RO.session.seed;
            delete RO.session.timestamp;
            delete RO.session.leftPadLength;
            delete RO.session.rightPadLength;
            callback();
        });
    });

    process.on("PpmSrv_LOGIN", function(RO, callback) {
        self.createNewSessionObject(RO.user._id, RO.ip, function(SO) {
            RO.session = SO;
            callback();
        });
    });
};

//Exported Interface
module.exports = SessionManager;