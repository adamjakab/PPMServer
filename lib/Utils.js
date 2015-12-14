var Configuration = require("./Configuration")
    , _ = require("underscore")//../node_modules/underscore/underscore-min
    , MD5 = require("../node_modules/crypto-js/md5")
    , CryptoJS = require("../node_modules/crypto-js/core")
    , HmacMD5 = require("../node_modules/crypto-js/hmac-md5")
    , Sha3 = require("../node_modules/crypto-js/sha3")
    , EncHex = require("../node_modules/crypto-js/enc-hex")
    , EncUtf8 = require("../node_modules/crypto-js/enc-utf8")
    , AES = require("../node_modules/crypto-js/aes")
    , AES_CTR = require("../node_modules/crypto-js/mode-ctr")
    , PAD_PKCS7 = require("../node_modules/crypto-js/pad-pkcs7")
    ;


var Utils = function() {
    /**
     * Available characters to use for gibberish string
     * @type {{alphaUpper: string, alphaLower: string, numeric: string, special: string, extendedUpper: string, extendedLower: string}}
     */
    var CHAR_CLASSES = {
        "alphaUpper": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "alphaLower": "abcdefghijklmnopqrstuvwxyz",
        "numeric": "0123456789",
        "special": "#@?!|&%^*+-=.:,;/([{<>}])",
        "extendedUpper": "ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß",
        "extendedLower": "àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ"
    };

    var AesMode = { mode: AES_CTR, padding: PAD_PKCS7};

    AesMode.format = {
        /**
         * creates a string divided by ":" character with [cipherText]:[iv]:[salt]
         * @todo: iv(len=32), salt(len=16) - char ":" should be removed so after padding
         * @param cipherParams
         * @return {string}
         */
        stringify: function (cipherParams) {
            return (
            cipherParams.ciphertext.toString(EncHex)
            + ":"
            + cipherParams.iv.toString()
            + ":"
            + cipherParams.salt.toString()
            );
        },
        /**
         * parse and extract the above stringified values to cipherParams
         * @param {string} parsable
         */
        parse: function (parsable) {
            var parsedArray = parsable.split(":");
            if(parsedArray.length === 3) {
                return CryptoJS.lib.CipherParams.create({
                    ciphertext: EncHex.parse(parsedArray[0]),
                    iv: EncHex.parse(parsedArray[1]),
                    salt: EncHex.parse(parsedArray[2])
                });
            } else {
                return false;
            }
        }
    };

    /**
     * Extracts and returns the ip from where the request originated from
     * @param {IncomingMessage} request - The request from the Http server
     * @return {string|boolean}
     */
    this.getRequestIp = function (request) {
        var ip = false;
        ip = (!ip && !_.isUndefined(request.headers['x-forwarded-for']) ? request.headers['x-forwarded-for'] : ip);
        if(!_.isUndefined(request.connection)) {
            ip = (!ip && !_.isUndefined(request.connection.remoteAddress) ? request.connection.remoteAddress : ip);
            ip = (!ip && !_.isUndefined(request.connection.socket.remoteAddress) ? request.connection.socket.remoteAddress : ip);
        }
        if(!_.isUndefined(request.socket)) {
            ip = (!ip && !_.isUndefined(request.socket.remoteAddress) ? request.socket.remoteAddress : ip);
        }
        return ip;
    };


    /**
     * Copies over some session data(seed, timestamp, leftPadLength, rightPadLength) into the final response body
     * @param {Object} RO - The Request Object
     */
    this.addSessionDataToRequestObject = function(RO) {
        if (RO.session.hasOwnProperty("seed")) {
            RO.body.seed = RO.session.seed;
        }
        if (RO.session.hasOwnProperty("timestamp")) {
            RO.body.timestamp = RO.session.timestamp;
        }
        if (RO.session.hasOwnProperty("leftPadLength")) {
            RO.body.leftPadLength = RO.session.leftPadLength;
        }
        if (RO.session.hasOwnProperty("rightPadLength")) {
            RO.body.rightPadLength = RO.session.rightPadLength;
        }
    };

    /**
     * Called by: Communicator.decryptRawPostRequest
     * Tries to decrypt rawPost with sessionObject.seed
     * if it results in a valid JSON object then it is valid
     * @param {Object} RO - The Request Object
     * @param {Object} sessionObject - The Session Object
     */
    this.decryptRawRequestWithSessionData = function(RO, sessionObject) {
        var decrypted = false;
        try {
            var tmp = RO.rawPost;
            //strip padding on both side
            tmp = this.leftRightTrimString(tmp, sessionObject.leftPadLength, sessionObject.rightPadLength);
            //decrypt with seed on sessionObject
            tmp = this.decryptAES(tmp, sessionObject.seed);
            //now we should have a JSON string
            tmp = JSON.parse(tmp);
            if (_.isObject(tmp)) {
                decrypted = tmp;
            }
        } catch (e) {/*did not work :-( */}
        return(decrypted);
    };

    /**
     * @todo: configuration should have service password and UserManager should be deleted
     * @todo: also decryptRawRequestData_USER in Communicator should be changed
     * Called by: Communicator.decryptRawPostRequest
     * Tries to decrypt rawPost with 1)password 2)username
     * if it results in a valid JSON object and the requested service is "login"
     * then it is a correct login package
     * @param {Object} RO - The Request Object
     * @param {{username, password}} user - The User object
     */
    this.decryptLoginRequest = function (RO, user) {
        var decrypted = false;
        try {
            var tmp = RO.rawPost;
            //strip padding on both side (using username for length)
            tmp = this.leftRightTrimString(tmp, user.username.length, user.username.length);
            //decrypt with user's password
            tmp = this.decryptAES(tmp, user.password);
            //decrypt with user's username
            tmp = this.decryptAES(tmp, user.username);
            //now we should have a JSON string
            tmp = JSON.parse(tmp);
            if (_.isObject(tmp) && !_.isUndefined(tmp.service) && tmp.service == "login") {
                decrypted = tmp;
            }
        } catch (e) {/*did not work :-( */}
        return(decrypted);
    };

    /**
     * @param {string} cipherText - text to decrypt
     * @param {string} key - key to decrypt with
     * @param {boolean} [parse] - return json parsed object
     * @return {string|object|boolean} answer - the decrypted string or parsed object or false
     */
    this.decryptAES = function(cipherText, key, parse) {
        try {
            var answer = AES.decrypt(cipherText, key, AesMode);
            answer = answer.toString(EncUtf8);
            if (parse === true) {
                answer = JSON.parse(answer);
                if (!_.isObject(answer)) {
                    answer = false;
                }
            }
        } catch (e) {
            answer = false;
        }
        return(answer);
    };

    /**
     *
     * @param {string} txt
     * @param {string} key
     * @returns {string}
     */
    this.encryptAES = function(txt, key) {
        var encrypted = AES.encrypt(txt, key, AesMode);
        var ciphertext = encrypted.toString();
        return(ciphertext);
    };

    /**
     * Returns Sha3 hash (using by default 256 bit length)
     * @param {string} txt
     * @returns {string}
     */
    this.sha3Hash = function(txt) {
        return(Sha3(txt, { outputLength: 256 }).toString(EncHex));
    };

    /**
     * Returns Md5 hash - if key is supplied Hmac is used
     * @param {string} txt
     * @param {string} [key]
     * @returns {string}
     */
    this.md5Hash = function(txt, key) {
        key = (_.isUndefined(key) ? null : key);
        var hash = (key===null ? MD5(txt) : HmacMD5(txt, key));
        return(hash.toString(EncHex));
    };

    /**
     * Returns a variable length very ugly string
     * @param {int} [minLength] - if not set if will default to 0
     * @param {int} [maxLength] - if not set if will default to minLength(will return empty string)
     * @param {{}} [options] - options to set which character classes to use
     * @returns {string}
     */
    this.getGibberish = function(minLength, maxLength, options) {
        var config = {
            "alphaUpper": true,
            "alphaLower": true,
            "numeric": true,
            "special": true,
            "extendedUpper": true,
            "extendedLower": true,
            "extra": false,
            "extraChars": ""
        };
        _.extend(config, options);
        if(config["extraChars"].length==0) {
            config["extra"] = false;
        }
        // calculate length
        minLength = Math.abs(minLength) || 0;
        maxLength = Math.abs(maxLength) || minLength;
        if(maxLength == 0) {return '';}
        if(maxLength<minLength) {maxLength=minLength;}
        var finalLength = this.getRandomNumberInRange(minLength, maxLength);
        //
        var numEnabledClasses = 0;
        _.each(config, function(isActive) {
            numEnabledClasses = numEnabledClasses + ( isActive===true ? 1 : 0);
        });
        if(numEnabledClasses == 0) {
            return '';
        }
        //
        var lengthPerClass = Math.floor(finalLength/numEnabledClasses)+1;
        var classLength = {
            alphaUpper:     (config["alphaUpper"] ? lengthPerClass : 0),
            alphaLower:     (config["alphaLower"] ? lengthPerClass : 0),
            numeric:        (config["numeric"] ? lengthPerClass : 0),
            special:        (config["special"] ? lengthPerClass : 0),
            extendedUpper:  (config["extendedUpper"] ? lengthPerClass : 0),
            extendedLower:  (config["extendedLower"] ? lengthPerClass : 0),
            extra:          (config["extra"] ? lengthPerClass : 0)
        };
        //
        var classTypes = _.keys(classLength);
        var currentType, currentChars;
        var answer = '';
        do {
            var remainingChars = _.reduce(classLength, function(memo, num){ return memo + num; }, 0);
            //currentType = _.sample(classTypes);//this is not available in underscore 1.4.4
            currentType = classTypes[this.getRandomNumberInRange(0, classTypes.length)];

            if(classLength[currentType] > 0) {
                currentChars = (currentType != "extra" ? CHAR_CLASSES[currentType] : config["extraChars"]);
                answer += currentChars[this.getRandomNumberInRange(0, currentChars.length-1)];
                classLength[currentType]--;
            }
        } while(remainingChars>0);
        if(answer.length > finalLength) {
            answer = answer.substr(0, finalLength);
        }
        return(answer);
    };

    /**
     * Pads a string on both sides with lft and rgt number of random(hex) chars
     * @param {string} str
     * @param {int} lft
     * @param {int} rgt
     * @returns {string}
     */
    this.leftRightPadString = function(str, lft, rgt) {
        var options = {
            "alphaUpper": false,
            "alphaLower": false,
            "numeric": true,
            "special": false,
            "extendedUpper": false,
            "extendedLower": false,
            "extra": true,
            "extraChars": "abcdef" /*make it hex like*/
        };
        var uglyLeft = this.getGibberish(lft, lft, options);
        var uglyRight = this.getGibberish(rgt, rgt, options);
        return(uglyLeft + str + uglyRight);
    };

    /**
     * Removes padding chars from left/right sides of a string
     * @param {string} str - the padded string
     * @param {int} lft - number of chars to remove on the left
     * @param {int} rgt - number of chars to remove on the right
     * @returns {string}
     */
    this.leftRightTrimString = function(str, lft, rgt) {
        return(str.substr(lft,(str.length)-lft-rgt));
    };

    /**
     * Returns a number N where N is between min and max (inclusive, ie. N can be min or max)
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    this.getRandomNumberInRange = function(min, max) {
        return _.random(min, max);
    };


    /**
     * Checks is timestamp is expired
     * @param {int} ts
     * @param {int} [offset=0]
     * @returns {boolean}
     */
    //this.isTimestampExpired = function(ts, offset) {
    //    offset = (offset?offset:0);
    //    return((ts + offset < Date.now()));
    //};

    /**
     * Main logging interface with configuration option to disable console logging
     * @param {string} msg
     */
    this.log = function(msg) {
        if (Configuration.get("main.log_to_console")) {
            console.log(msg);
        }
    };
};
module.exports = new Utils();