var config = require("../configuration.json")
    , AesCtr = require("./lib/AesCtr")
    , Md5 = require("./lib/Md5")
    ;


var _getRequestIp = function (request) {
    return(request.headers['x-forwarded-for'] ||
        request.connection.remoteAddress ||
        request.socket.remoteAddress ||
        request.connection.socket.remoteAddress);
};
exports.getRequestIp = _getRequestIp;

/** called by: Communicator.decryptRawPostRequest
 * Tries to decrypt rawData with sessionObject.seed
 * if it results in a valid JSON object then it is ok
 * @param RO
 * @param sessionObject
 */
var _decryptRawDataWithSessionData = function(RO, sessionObject){
    var decrypted = false;
    try {
        var tmp = RO.rawPost;
        //strip padding on both side
        tmp = _leftRightTrimString(tmp, sessionObject.leftPadLength, sessionObject.rightPadLength);
        //decrypt with seed on sessionObject
        tmp = _decryptAES(tmp, sessionObject.seed);
        tmp = JSON.parse(tmp);
        if (typeof tmp === 'object') {
            decrypted = tmp;
        }
    } catch (e) {/*did not work :-( */}
    return(decrypted);
};
exports.decryptRawDataWithSessionData = _decryptRawDataWithSessionData;

/** called by: Communicator.decryptRawPostRequest
 * Tries to decrypt rawData with 1)password 2)username
 * if it results in a valid JSON object then it is ok
 * @param RO
 * @param user
 */
var _decryptRawDataWithUserData = function(RO, user) {
    var decrypted = false;
    try {
        var tmp = RO.rawPost;
        //strip padding on both side (username lenght is used)
        tmp = _leftRightTrimString(tmp, user.username.length, user.username.length);
        //decrypt with user's password
        tmp = _decryptAES(tmp, user.password);
        //decrypt with user's username
        tmp = _decryptAES(tmp, user.username);
        //now we should have a JSON string
        tmp = JSON.parse(tmp);
        if (typeof tmp === 'object' && tmp.service == "login") {
            decrypted = tmp;
        }
    } catch (e) {/*did not work :-( */}
    return(decrypted);
};
exports.decryptRawDataWithUserData = _decryptRawDataWithUserData;


var _encryptAES = function(txt,key) {
    return(AesCtr.encrypt(txt, key, 256));
};
exports.encryptAES = _encryptAES;

var _decryptAES = function(txt,key) {
    return(AesCtr.decrypt(txt, key, 256));
};
exports.decryptAES = _decryptAES;

var _md5hash = function(txt){
    return(Md5.hex_md5(txt));
};
exports.md5hash = _md5hash;


/**
 *
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
var _getRandomNumberInRange = function(min, max) {
    return(min + Math.round(Math.random()*(max-min)));
};
exports.getRandomNumberInRange = _getRandomNumberInRange;

/**
 * Returns a very ugly string
 * @param {int} minLength
 * @param {int} [maxLength] will be same as minLength
 * @param {boolean} [useSpecial=false]
 * @returns {string}
 */
var _getUglyString = function(minLength, maxLength, useSpecial) {
    minLength = minLength || 16;
    maxLength = maxLength || minLength;
    var length = minLength + Math.round((maxLength-minLength)*Math.random());
    //
    useSpecial = (useSpecial===true);
    var typeLength = [];
    typeLength["alpha"] = Math.floor(length/(useSpecial?3:2));//ALPHA
    typeLength["numeric"] = (useSpecial?typeLength["alpha"]:length-typeLength["alpha"]);//NUMERIC
    typeLength["special"] = (useSpecial?length-typeLength["alpha"]-typeLength["numeric"]:0);//SPECIAL
    var charTypes = ["alpha","numeric"];
    if(useSpecial) {
        charTypes.push("special");
    }
    //console.log("L(tot):"+length+" L(alpha):"+typeLength["alpha"] + " L(num):"+typeLength["numeric"] + " L(spec):"+typeLength["special"]);

    var answer = '';
    var t, chars, cLen;
    var i = 0;
    while(answer.length < length) {
        i++;
        if(i>(length*2))break;//emergency break to avoid infinity loop
        t = charTypes[Math.floor(Math.random() * charTypes.length)];
        typeLength[t]--;
        if(!typeLength[t]) {
            charTypes.splice(charTypes.indexOf(t),1);
        }
        chars = config.session.ugly_chars[t];
        answer += chars[Math.floor(chars.length*Math.random())];
    }
    return(answer);
};
exports.getUglyString = _getUglyString;


/**
 * Pads a string on both sides with lft and rgt number of random(crypted-like) chars
 * @param {string} str
 * @param {int} lft
 * @param {int} rgt
 * @returns {string}
 */
var _leftRightPadString = function(str, lft, rgt) {
    var ugly = _getUglyString((lft>rgt?lft:rgt)*2);
    var leftChars = _encryptAES(ugly, ugly).substr(0, lft);
    var rightChars = _encryptAES(ugly, ugly).slice(rgt*-1);
    return(leftChars + str + rightChars);
};
exports.leftRightPadString = _leftRightPadString;

/**
 * Removes random padding chars on both sides
 * @param {string} str
 * @param {int} lft
 * @param {int} rgt
 * @returns {string}
 */
var _leftRightTrimString = function(str, lft, rgt) {
    return(str.substr(lft,(str.length)-lft-rgt));
};
exports.leftRightTrimString = _leftRightTrimString;

var _get_uuid = function() {
    var chars = '0123456789abcdef'.split('');
    var uuid = [], rnd = Math.random, r;
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    uuid[14] = '4'; // version 4
    for (var i = 0; i < 36; i++) {
        if (!uuid[i]) {
            r = 0 | rnd()*16;
            uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r & 0xf];
        }
    }
    return uuid.join('');
};
exports.get_uuid = _get_uuid;

/**
 * Checks is timestamp is expired: considered expired if SO.timestamp + offset < Date.now()
 * @param {int} ts
 * @param {int} [offset=0]
 * @returns {boolean}
 */
var _isTimestampExpired = function(ts, offset) {
    offset = (offset?offset:0);
    return((ts + offset < Date.now()));
};
exports.isTimestampExpired = _isTimestampExpired;


// Pure duck-typing implementation taken from Underscore.js.
var _isFunction = function(object) {
    return !!(object && object.constructor && object.call && object.apply);
};
exports.isFunction = _isFunction;

/**
 * Logs to console (if debug is enabled in configuration)
 * @param msg
 */
var _log = function(msg) {
    if(config.main.debug) {
        console.log(msg);
    }
};
exports.log = _log;
