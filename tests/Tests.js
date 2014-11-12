//TESTER
var config = require("../configuration.json");
//var events = require("events");
var nedb = require('nedb');
var utils = require("./../core/Utils");
//var ServiceManager = require("../core/ServiceManager");






savePasscard({
    id: "0d32b3b2-063d-40b6-8be9-fae4e64ef5a5",/*utils.get_uuid(),*/
    uid:"vzxFJHu2Ou6kvCif",
    collection: "passcard",
    parent_id: 0,
    name: "Test-XYZ-2sss",
    identifier: ".*",
    payload: "##@@@@##zzz"
}, function(SD) {
    utils.log("OK:"+JSON.stringify(SD));
});