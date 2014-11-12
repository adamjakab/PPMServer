//STORAGE MANAGER
var config = require("../configuration.json")
    , nedb = require('nedb')
    , events = require("events")
    , utils = require("./Utils")
    ;



function StorageManager() {
    this.DB = new nedb({ filename: 'data/storage.db', autoload:true });
    // Using a unique constraint on sid (JSDoc on ensureIndex is wrong!)
    this.DB.ensureIndex({fieldName: 'id', unique: true });
    this.DB.ensureIndex({fieldName: 'uid', unique: false });
    this.DB.ensureIndex({fieldName: 'collection', unique: false });
    utils.log("StorageManager created");
}

StorageManager.prototype.getStorageDataByFilter = function(findFilter, callback) {
    if(!findFilter) {findFilter={};}
    this.DB.find(findFilter, function(err, DATA) {
        if (err) {utils.log("Error finding storage data by filter: " + err + " - " + JSON.stringify(findFilter));}
        callback(DATA);
    });
};

/*----------------------------------------------------------------OPERATIONS*/


StorageManager.prototype.operation_SAVE = function (self, RO, callback) {
    var _replyToCaller = function() {
        self.DB.persistence.compactDatafile();
        callback(RO);
    };

    //todo: check passcard!
    if(RO.postData.operation.hasOwnProperty("params") && RO.postData.operation.params.hasOwnProperty("itemdata")) {
        var itemdata = RO.postData.operation.params.itemdata;
        var filter = {
            id: itemdata.id,
            uid: RO.user._id
        };
        self.DB.findOne(filter, function(err, SDORIG) {
            if (err) {
                utils.log("Error finding storage data for save: " + err);
                _replyToCaller();
                return;
            }
            if(SDORIG === null) {//INSERT NEW
                itemdata.id = utils.get_uuid();
                itemdata.uid = RO.user._id;
                itemdata.parent_id = (itemdata.parent_id?itemdata.parent_id:0);
                itemdata.timestamp = Date.now();
                itemdata.pwchanged = itemdata.timestamp;
                self.DB.insert(itemdata, function(err, itemdata) {
                    if (err) {
                        utils.log("Error inserting SD: " + err + " - " + JSON.stringify(itemdata));
                        _replyToCaller();
                    } else {
                        utils.log("INSERTED NEW STORAGE DATA["+itemdata.id+"].");
                        RO.body.newID = itemdata.id;
                        _replyToCaller();
                    }
                });
            } else {
                //update password change timestamp
                if(itemdata.hasOwnProperty("payload")) {
                    itemdata.pwchanged = Date.now();
                }
                //copy missing properties from original
                for(var key in SDORIG) {
                    if(SDORIG.hasOwnProperty(key) && !itemdata.hasOwnProperty(key)) {
                        itemdata[key]=SDORIG[key];
                    }
                }
                self.DB.update({id:itemdata.id}, itemdata, {}, function(err, cnt) {
                    if (err || cnt!=1) {
                        utils.log("Error updating SD: " + err + " - " + JSON.stringify(itemdata));
                        _replyToCaller();
                    } else {
                        utils.log("UPDATED STORAGE DATA("+JSON.stringify(itemdata)+").");
                        RO.body.msg = "updated";
                        _replyToCaller();
                    }
                });
            }
        });
    } else {
        utils.log("StorageManager(SAVE) no itemdata was specified!");
        _replyToCaller();
    }
};

/**
 * Remove passcard with id in RO.postData.operation.params.id
 * @param self - the StorageManager Instance
 * @param RO
 * @param callback
 */
StorageManager.prototype.operation_DELETE = function(self, RO, callback) {
    if(RO.postData.operation.hasOwnProperty("params") && RO.postData.operation.params.hasOwnProperty("id")) {
        var filter = {
            id: RO.postData.operation.params.id,
            uid: RO.user._id
        };
        self.DB.remove(filter, function(err, cnt) {
            if(cnt!=1) {
                RO.code = 500;
                var msg = "StorageManager(DELETE) could not find requested item to delete:" + JSON.stringify(filter);
                utils.log(msg);
                RO.body = {msg:msg};
            } else {
                RO.body = "item deleted";
                self.DB.persistence.compactDatafile();
            }
            callback(RO);
        });
    } else {
        RO.code = 500;
        var msg = "StorageManager(DELETE) no id was specified!";
        utils.log(msg);
        RO.body = {msg:msg};
        callback(RO);
    }
};


/**
 * Get secure data(only payload) of passcard with id in RO.postData.operation.params.id
 * @param self - the StorageManager Instance
 * @param RO
 * @param callback
 */
StorageManager.prototype.operation_GETSECURE = function(self, RO, callback) {
    if(RO.postData.operation.hasOwnProperty("params") && RO.postData.operation.params.hasOwnProperty("id")) {
        var filter = {
            id: RO.postData.operation.params.id,
            uid: RO.user._id
        };
        self.getStorageDataByFilter(filter, function(DATA) {
            DATA = (DATA.length==1?DATA[0]:{});
            var payload = (DATA.hasOwnProperty("payload")?DATA.payload:false);
            if(!payload) {
                utils.log("StorageManager(GETSECURE) could not find requested secure data:" + JSON.stringify(filter));
            }
            RO.body.data = payload;
            callback(RO);
        });
    } else {
        utils.log("StorageManager(GETSECURE) no id was specified!");
        callback(RO);
    }
};


/**
 * Get index data(no payload) of all types bound to current user
 * @param self - the StorageManager Instance
 * @param RO
 * @param callback
 */
StorageManager.prototype.operation_GETINDEX = function(self, RO, callback) {
    var filter = {
        uid: RO.user._id
    };
    self.getStorageDataByFilter(filter, function(DATA) {
        if(!DATA) {DATA = [];}
        for(var i=0; i<DATA.length; i++) {
            delete DATA[i]["payload"];
        }
        utils.log("StorageManager(GETINDEX) has found " + DATA.length + " matching items.");
        RO.body.data = DATA;
        callback(RO);
    });
};

/**
 * This object holds the function names that will handle the requested operations
 *  {[servicename]: {handler: Function}, ...}
 */
StorageManager.prototype.availableOperations = {
    get_index: {"handler":"operation_GETINDEX"},
    get_secure: {"handler":"operation_GETSECURE"},
    save: {"handler":"operation_SAVE"},
    delete: {"handler":"operation_DELETE"}
};

StorageManager.prototype.executeRequestedOperation = function(RO, callback) {
    var self = this;
    var msg;
    var operationName = (RO.postData.hasOwnProperty("operation") && RO.postData.operation.hasOwnProperty("name")?RO.postData.operation.name:"UNDEFINED");
    if (this.checkIfOperationIsAvailable(operationName)) {
        var operationObject =  this.availableOperations[operationName];
        var handler = (operationObject.hasOwnProperty("handler")?self[operationObject.handler]:false);
        try {
            if(utils.isFunction(handler)) {
                utils.log("EXECUTING HANDLER FOR STORAGE OPERATION("+operationName+")...");
                handler(self, RO, function(RO) {
                    callback(RO);
                });
            } else {
                throw("Not a funtion!");
            }
        } catch(e) {
            msg = "ERROR EXECUTING STORAGE OPERATION("+operationName+"): " + e;
            utils.log(msg);
            RO.body.msg = msg;
            callback(RO);
        }
    } else {
        msg = "THE REQUESTED STORAGE OPERATION("+operationName+") IS NOT AVAILABLE!";
        utils.log(msg);
        RO.code = 500;
        RO.body = {msg: msg};
        callback(RO);
    }
};

StorageManager.prototype.checkIfOperationIsAvailable = function(operationName) {
    return(this.availableOperations.hasOwnProperty(operationName));
};

//Exported Interface
module.exports = StorageManager;