var config = require("../configuration.json")
    , nedb = require('nedb')
    , events = require("events")
    , utils = require("./Utils")
    ;

function StorageManager() {
    utils.log("StorageManager created");



}
module.exports = StorageManager;