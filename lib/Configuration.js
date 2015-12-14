/**
 * Created by jackisback on 08/12/15.
 */
var fs = require("fs")
    , _ = require("underscore")
    , CustomError = require("./CustomError")
    ;

/**
 * @constructor
 */
function Configuration() {
    /** @type object */
    var config = {};

    /**
     *
     * @param {Object} configuration
     */
    var setConfiguration = function (configuration) {
        if (!_.isObject(configuration)) {
            throw new CustomError("Configuration must be an object!");
        }
        config = configuration;
    };

    /**
     *
     * @return {Object}
     */
    var getConfiguration = function () {
        return (config);
    };

    /**
     * Get a key value - if key is not found and no defaultValue set it will return null
     * @param {string|Array} key
     * @returns {*}
     * @throws CustomError
     */
    var get = function (key) {
        var keyElements = parseKey(key);
        var currentItem = config;
        var currentKey;
        while (!_.isUndefined(currentItem) && keyElements.length != 0) {
            currentKey = _.first(keyElements);
            keyElements = _.rest(keyElements);
            if (currentItem.hasOwnProperty(currentKey)) {
                currentItem = currentItem[currentKey];
            } else {
                throw new CustomError("The configuration key(" + key + ") is not defined");
            }
        }
        return currentItem;
    };

    /**
     * splits a dot-separated path (x.y.z) to an array of elements
     * it also accepts ["x", "y", "z"]
     *
     * @param {string|Array} key
     * @returns []
     */
    var parseKey = function (key) {
        var answer;
        if (_.isString(key)) {
            key = key.toString();
            answer = key.split(".");
        } else if (_.isArray(key)) {
            answer = _.map(key, function (el) {
                return el.toString();
            });
        }

        //compact and remove all empty and keys items from array
        answer = _.filter(answer, function (item) {
            return !_.isEmpty(item);
        });
        return (answer);
    };

    this.setConfiguration = setConfiguration;
    this.getConfiguration = getConfiguration;
    this.get = get;
}


module.exports = new Configuration();