/**
 * Created by jackisback on 12/5/13.
 */
var config = require("../configuration.json")
    , utils = require("../core/Utils")
    ;

var maxLoops = 1;


var testAes = function() {
    var orig = utils.getUglyString(128,256,true);
    var key = utils.getUglyString(24,32,true);
    var cypher = utils.encryptAES(orig, key);
    var uncypher = utils.decryptAES(cypher, key);
    //console.log("orig:"+orig+" cypher:"+cypher+" uncypher:"+uncypher+" key:"+key);
    return(orig==uncypher);

};

var testloop = function() {
    console.time("AESTEST");
    var max = 5000;
    for (var i=0; i<max; i++){
        var res = testAes();
        if(!res) console.log("FAIL");
    }
    console.log(maxLoops+" FINISHED #"+max);
    console.timeEnd("AESTEST");

    if(maxLoops>1) {
        maxLoops--;
        setTimeout(testloop, 1000);
    }

};

testloop();
