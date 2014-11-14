//USER MANAGER
var config = require("../configuration.json")
    , nedb = require('nedb')
    , events = require("events")
    , utils = require("./Utils")
    ;

function UserManager() {
    this.US = new nedb({ filename: 'data/user.db', autoload:true });
    // Using a unique constraint on sid (JSDoc on ensureIndex is wrong!)
    this.US.ensureIndex({fieldName: 'username', unique: true });
    utils.log("UserManager created");
}


UserManager.prototype.getUserByKey = function(key, val, callback) {
    var findFilter = {};
    if(key&&val) {findFilter[key] = val;}
    this.US.findOne(findFilter, function(err, USR) {
        if (err) {utils.log("Error finding USER: " + JSON.stringify(err));}
        callback(USR);
    });
};

UserManager.prototype.getUsersByKey = function(key, val, callback) {
    var findFilter = {};
    if(key&&val) {findFilter[key] = val;}
    this.US.find(findFilter, function(err, USRS) {
        if (err) {utils.log("Error finding USERS: " + JSON.stringify(err));}
        callback(USRS);
    });
};


//Exported Interface
module.exports = UserManager;