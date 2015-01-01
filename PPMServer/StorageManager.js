var config = require("../configuration.json")
    , _ = require("underscore")
    , nedb = require('nedb')
    , events = require("events")
    , utils = require("./Utils")
    , Promise = require("../node_modules/bluebird/js/browser/bluebird.min")
    ;

function StorageManager() {
    /** @type Datastore */
    var Storage;
    /**
     * Initialization
     * @todo: https://github.com/louischatriot/nedb#compacting-the-database - do it on regular intervals(Storage.persistence.compactDatafile();)
     */
    var init = function() {
        Storage = new nedb({ filename: 'data/storage.db', autoload:true });
        // Using a unique constraint on sid (JSDoc on ensureIndex is wrong!)
        Storage.ensureIndex({fieldName: 'id', unique: true });
        Storage.ensureIndex({fieldName: 'uid', unique: false });
        Storage.ensureIndex({fieldName: 'collection', unique: false });
        utils.log("StorageManager created");
    };

    /**
     * @param {Object} filter
     * @return {Promise}
     */
    var getStorageDataByFilter = function(filter) {
        return new Promise(function(fulfill, reject) {
            if (!filter) {
                filter = {};
            }
            Storage.find(filter, function (err, DATA) {
                if (err) {
                    return reject(err);
                }
                fulfill(DATA);
            });
        });
    };

    /**
     * Delete passcard from Storage
     *
     * {Object} RO - The Response Object
     * @return {Promise}
     */
    var operation_DELETE = function(RO) {
        return new Promise(function(fulfill, reject) {
            if (_.isUndefined(RO.postData.operation.params)
                || !_.isObject(RO.postData.operation.params)
                || _.isUndefined(RO.postData.operation.params.id)
            ) {
                return reject(new Error("Undefined id in parameters!"));
            }
            var filter = {
                id: RO.postData.operation.params.id,
                uid: RO.user._id
            };
            Storage.remove(filter, function(err, cnt) {
                if (err || cnt!=1) {
                    return reject(err);
                }
                RO.body = "item deleted";
                self.DB.persistence.compactDatafile();
                fulfill();
            });
        });
    };

    /**
     * Save passcard to Storage
     *
     * {Object} RO - The Response Object
     * @return {Promise}
     */
    var operation_SAVE = function(RO) {
        return new Promise(function(fulfill, reject) {
            if (_.isUndefined(RO.postData.operation.params)
                || !_.isObject(RO.postData.operation.params)
                || _.isUndefined(RO.postData.operation.params.itemdata)
                || !_.isObject(RO.postData.operation.params.itemdata)
            ) {
                return reject(new Error("Undefined itemdata in parameters!"));
            }
            var itemdata = RO.postData.operation.params.itemdata;
            var filter = {
                id: itemdata.id,
                uid: RO.user._id
            };

            Storage.findOne(filter, function(err, DATA) {
                if (err) {
                    return reject(err);
                }
                if(DATA === null) {//INSERT NEW
                    itemdata.id = utils.get_uuid();
                    itemdata.uid = RO.user._id;
                    itemdata.parent_id = (itemdata.parent_id?itemdata.parent_id:0);
                    itemdata.timestamp = Date.now();
                    itemdata.pwchanged = itemdata.timestamp;
                    Storage.insert(itemdata, function(err, itemdata) {
                        if (err) {
                            return reject(err);
                        }
                        utils.log("INSERTED NEW STORAGE DATA["+itemdata.id+"].");
                        RO.body.newID = itemdata.id;
                        fulfill();
                    });
                } else {
                    //update password change timestamp
                    if(!_.isUndefined(itemdata.payload)) {
                        itemdata.pwchanged = Date.now();
                    }
                    //copy missing properties from original
                    for(var key in DATA) {
                        if(DATA.hasOwnProperty(key) && !itemdata.hasOwnProperty(key)) {
                            itemdata[key]=DATA[key];
                        }
                    }
                    Storage.update({id:itemdata.id}, itemdata, {}, function(err, cnt) {
                        if (err || cnt!=1) {
                            return reject(err);
                        }
                        utils.log("UPDATED STORAGE DATA("+JSON.stringify(itemdata)+").");
                        RO.body.msg = "updated";
                        fulfill();
                    });
                }
            });
        });
    };

    /**
     * Get secure data(only payload) of item with id in RO.postData.operation.params.id
     *
     * {Object} RO - The Response Object
     * @return {Promise}
     */
    var operation_GET_SECURE = function(RO) {
        return new Promise(function(fulfill, reject) {
            if (_.isUndefined(RO.postData.operation.params)
                || !_.isObject(RO.postData.operation.params)
                || _.isUndefined(RO.postData.operation.params.id)
            ) {
                return reject(new Error("Undefined id in parameters!"));
            }
            var filter = {
                id: RO.postData.operation.params.id,
                uid: RO.user._id
            };
            getStorageDataByFilter(filter).then(function(DATA) {
                DATA = (DATA.length == 1 ? DATA[0] : {});
                var payload = (!_.isUndefined(DATA.payload) ? DATA.payload : false);
                if(!payload) {
                    return reject(new Error("StorageManager(GETSECURE) could not find requested secure data:" + JSON.stringify(filter)));
                }
                RO.body.data = payload;
                fulfill();
            }).catch(function(e) {
                return reject(e);
            });
        });
    };

    /**
     * Get index data(no payload) of all types owned by current user
     *
     * {Object} RO - The Response Object
     * @return {Promise}
     */
    var operation_GET_INDEX = function(RO) {
        return new Promise(function(fulfill, reject) {
            var filter = {
                uid: RO.user._id
            };
            getStorageDataByFilter(filter).then(function(DATA) {
                if (!_.isArray(DATA)) {
                    DATA = [];
                }
                for (var i = 0; i < DATA.length; i++) {
                    delete DATA[i]["payload"];
                }
                utils.log("StorageManager(GET_INDEX) has found " + DATA.length + " matching items.");
                RO.body.data = DATA;
                fulfill();
            }).catch(function(e) {
                return reject(e);
            });
        });
    };

    /**
     * "service":"db","operation":{"name":"get_index", "params":{"collection":null,...} }
     *
     * @param {Object} RO - The Response Object
     * @return {Promise}
     */
    this.executeRequestedOperation = function(RO) {
        return new Promise(function(fulfill, reject) {
            if (_.isUndefined(RO.postData.operation)
                || !_.isObject(RO.postData.operation)
                || _.isUndefined(RO.postData.operation.name)
            ) {
                return reject(new Error("Undefined operation name!"));
            }
            var promise;
            switch(RO.postData.service) {
                case "get_index":
                    promise = operation_GET_INDEX(RO);
                    break;
                case "get_secure":
                    promise = operation_GET_SECURE(RO);
                    break;
                case "save":
                    promise = operation_SAVE(RO);
                    break;
                case "delete":
                    promise = operation_DELETE(RO);
                    break;
                default:
                    return reject(new Error("Inexistent operation("+RO.postData.operation.name+")!"));
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
module.exports = new StorageManager();
