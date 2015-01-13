var config = require("../configuration.json")
    , CustomError = require("./CustomError")
    , _ = require("underscore")
    , nedb = require('nedb')
    , events = require("events")
    , utils = require("./Utils")
    , Promise = require("../node_modules/bluebird/js/browser/bluebird.min")
    ;

function UserManager() {
    /** @type Datastore */
    var UserStorage;

    var init = function() {
        UserStorage = new nedb({ filename: 'data/user.db', autoload:true });
        UserStorage.ensureIndex({fieldName: 'username', unique: true });
        utils.log("UserManager created");
    };

    /**
     * Find all users
     * @return {Promise}
     */
    this.getAllUsers = function() {
        return new Promise(function(fulfill, reject) {
            UserStorage.find({}, function(err, USERS) {
                if (err) {
                    return reject(new CustomError("User(find) error! " + err));
                }
                fulfill(USERS);
            });
        });
    };

    /**
     * Find a user by key/value pair
     * @param {string} key
     * @param {*} val
     * @return {Promise}
     */
    this.getUserByKey = function(key, val) {
        return new Promise(function(fulfill, reject) {
            if(_.isUndefined(key) || _.isUndefined(val)) {
                return reject(new CustomError("No filter key/val have been defined!"));
            }
            var filter = {};
            filter[key] = val;
            UserStorage.findOne(filter, function(err, USER) {
                if (err) {
                    return reject(new CustomError("User(find) error! " + err));
                }
                fulfill(USER);
            });
        });
    };

    init();
}
module.exports = new UserManager();
