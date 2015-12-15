/**
 * Created by jackisback on 08/12/15.
 */
var fs = require("fs")
    , _ = require("underscore")
    , stdio = require("stdio")
    , Configuration = require("./Configuration")
    , CustomError = require("./CustomError")
    , Promise = require("../node_modules/bluebird/js/browser/bluebird.min")
    ;

/**
 * @constructor
 */
function ConfigMaker() {


    var talkWithUser = function (obj) {
        return new Promise(function (fulfill, reject) {
            if (obj.type == "info") {
                console.log(obj.message);
                fulfill();
            } else if (obj.type == "question") {
                var cs = '\x1b[33m';
                var ce = '\x1b[0m';
                var options = obj.options || null;
                stdio.question(cs + obj.message + ce, options, function (err, answer) {
                    if (err) {
                        return reject(new CustomError(err));
                    }
                    try {
                        answer = transformAnswer(obj.key, answer);
                        console.log("A: " + JSON.stringify(answer));
                        Configuration.set(obj.key, answer);
                        fulfill();
                    } catch (e) {
                        return reject(e);
                    }
                });
            } else {
                return reject(new CustomError("Unknown type!"));
            }
        });
    };

    var transformAnswer = function (key, answer) {
        switch (key) {
            case "main.log_to_console":
                answer = (answer == "y");
                break;
            case "server.ip":
                if (_.isEmpty(answer)) {
                    answer = null;
                } else {
                    //@todo: shorthand(test this): ^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$
                    var ipRegExp = new RegExp('^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)'
                        + '\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)'
                        + '\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)'
                        + '\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$');
                    if (!ipRegExp.test(answer)) {
                        throw new CustomError("Invalid ip address!");
                    }
                }
                break;
            case "server.port":
                answer = parseInt(answer);
                if (answer < 1024 || answer >= Math.pow(2, 16)) {
                    throw new CustomError("Invalid port number!");
                }
                break;
        }
        return answer;
    };

    /**
     *
     * @param {object} opts
     */
    var setupConfigurationFile = function (opts) {
        Configuration.setConfiguration({
            "main": {
                "version": Configuration.getServerVersion()
            }
        });
        //try {
        //    fs.statSync(configurationFile);
        //} catch (e) {
        //    throw new CustomError("The specified configuration file does not exist!");
        //}
        var dialogue = [
            {type: "info", message: "Creating configuration file: " + opts.configuration},
            {type: "question", key: "main.log_to_console", message: "Enable console logging?", options: ['y', 'n']},
            {type: "question", key: "server.ip", message: "Ip address to bind to(enter for all interfaces)?"},
            {type: "question", key: "server.port", message: "Port to listen on(1024-65535)?"}
        ];
        Promise.each(dialogue, talkWithUser).then(function () {
            console.log('DONE');
            console.log('CONFIG: ' + JSON.stringify(Configuration.getConfiguration()));
        }).catch(function (e) {
            console.error("Error: " + e);
            console.error("Configuration file was not created.");
        });
    };

    this.setupConfigurationFile = setupConfigurationFile;
}
module.exports = new ConfigMaker();