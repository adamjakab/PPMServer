var Configuration = require("./Configuration")
    , CustomError = require("./CustomError")
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
        //Unique constraints
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
            filter = filter || {};
            Storage.find(filter, function (err, DATA) {
                if (err) {
                    return reject(new CustomError("Storage(find) error! " + err, 200));
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
                || _.isUndefined(RO.postData.operation.params._id)
            ) {
                return reject(new CustomError("Undefined _id in parameters!", 200));
            }
            var filter = {
                _id: RO.postData.operation.params._id,
                uid: RO.user._id
            };
            Storage.remove(filter, function(err, cnt) {
                if (err || cnt!=1) {
                    return reject(new CustomError("Storage(remove) error! " + err, 200));
                }
                Storage.persistence.compactDatafile();
                RO.body.msg = "deleted";
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
            if (_.isUndefined(RO.postData["operation"]["params"])
                || !_.isObject(RO.postData["operation"]["params"])
                || _.isUndefined(RO.postData["operation"]["params"]["itemdata"])
                || !_.isObject(RO.postData["operation"]["params"]["itemdata"])
                || _.isUndefined(RO.postData["operation"]["params"]["itemdata"]["_id"])
                || _.isEmpty(RO.postData["operation"]["params"]["itemdata"]["_id"])
            ) {
                return reject(new CustomError("Undefined itemdata or missing _id in parameters!", 200));
            }
            var itemdata = RO.postData["operation"]["params"]["itemdata"];
            var filter = {
                _id: itemdata._id,
                uid: RO.user._id
            };
            Storage.findOne(filter, function(err, currentData) {
                if (err) {
                    return reject(new CustomError("Storage(save) error! " + err, 200));
                }
                if(currentData === null) {//INSERT NEW
                    itemdata.uid = RO.user._id;
                    Storage.insert(itemdata, function(err, itemdata) {
                        if (err) {
                            return reject(new CustomError("Storage(insert) error! " + err, 200));
                        }
                        Storage.persistence.compactDatafile();
                        utils.log("INSERTED NEW STORAGE DATA["+itemdata._id+"].");
                        RO.body.msg = "inserted";
                        fulfill();
                    });
                } else {
                    //copy missing properties from original
                    itemdata = _.extend(currentData, itemdata);
                    Storage.update({_id:itemdata._id}, itemdata, {}, function(err, cnt) {
                        if (err || cnt!=1) {
                            return reject(new CustomError("Storage(update) error! " + err, 200));
                        }
                        Storage.persistence.compactDatafile();
                        utils.log("UPDATED STORAGE DATA["+itemdata._id+"].");
                        RO.body.msg = "updated";
                        fulfill();
                    });
                }
            });
        });
    };

    /**
     * Get secure data(only payload) of item with _id in RO.postData.operation.params._id
     *
     * {Object} RO - The Response Object
     * @return {Promise}
     */
    var operation_GET_SECURE = function(RO) {
        return new Promise(function(fulfill, reject) {
            if (_.isUndefined(RO.postData.operation.params)
                || !_.isObject(RO.postData.operation.params)
                || _.isUndefined(RO.postData.operation.params._id)
                || _.isEmpty(RO.postData.operation.params._id)
            ) {
                return reject(new CustomError("Undefined _id in parameters!", 200));
            }
            var filter = {
                _id: RO.postData.operation.params._id,
                uid: RO.user._id
            };
            getStorageDataByFilter(filter).then(function(DATA) {
                DATA = (DATA.length == 1 ? DATA[0] : {});
                var payload = (!_.isUndefined(DATA.payload) ? DATA.payload : false);
                if(!payload) {
                    return reject(new CustomError("StorageManager(GETSECURE) could not find requested secure data for: " + RO.postData.operation.params._id, 200));
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
                    delete DATA[i]["payload"];//initial index load will not get payload - it will be loaded separately
                    delete DATA[i]["uid"];//client should NOT know about uid
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
                return reject(new CustomError("Undefined operation name!", 200));
            }
            var promise;
            switch(RO.postData.operation.name) {
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
                    return reject(new CustomError("Inexistent operation("+RO.postData.operation.name+")!", 200));
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
