/**
 * Created by jackisback on 08/12/15.
 */
var fs = require("fs")
    , path = require("path")
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
    /**
     * @param {object} opts
     */
    var setupConfigurationFile = function (opts) {
        var configFile = path.resolve(opts.configuration);
        checkIfFileIsOkForConfig(configFile).then(function () {
            return getConfigOptionsFromUser();
        }).then(function (configuration) {
            //console.log('CONFIG: ' + JSON.stringify(configuration));
            return writeFile(configFile, configuration);
        }).then(function () {
            console.error("Configuration created: " + configFile);
        }).catch(function (e) {
            console.error("Error: " + e.message);
            console.error("Configuration was not created.");
        });
    };

    var getConfigOptionsFromUser = function () {
        return new Promise(function (fulfill, reject) {
            Configuration.setConfiguration({});
            var dialogue = [
                {type: "info", message: "--- ANSWER THE FOLLOWING QUESTIONS ---"},
                {type: "question", key: "main.log_to_console", message: "Enable console logging?", options: ['y', 'n']},
                {type: "question", key: "server.ip", message: "Ip address to bind to(enter for all interfaces)?"},
                {type: "question", key: "server.port", message: "Port to listen on(1024-65535)?"},
                {type: "question", key: "session.pad_length_min", message: "Minimum padding length(16-64)?"},
                {type: "question", key: "session.pad_length_max", message: "Maximum padding length(16-64)?"},
                {type: "question", key: "session.lifetime", message: "Session lifetime in minutes(5-60)?"},
                {
                    type: "question",
                    key: "session.garbage_collection_interval",
                    message: "Check for expired sessions every (1-30) minutes?"
                },
                {
                    type: "question",
                    key: "communicator.max_login_post_length",
                    message: "Maximum POST size for unauthenticated requests(>2048)?"
                }
            ];
            Promise.each(dialogue, talkWithUser).then(function () {
                fulfill(Configuration.getConfiguration());
            }).catch(function (e) {
                reject(e);
            });
        });
    };

    var talkWithUser = function (obj) {
        return new Promise(function (fulfill, reject) {
            if (obj.type == "info") {
                console.log(obj.message);
                fulfill();
            } else if (obj.type == "question") {
                var cs = '\x1b[33m';
                var ce = '\x1b[0m';
                var options = obj.options || null;
                var message = "[" + obj.key + "] " + cs + obj.message + ce;
                stdio.question(message, options, function (err, answer) {
                    if (err) {
                        return reject(new CustomError(err));
                    }
                    try {
                        answer = transformAnswer(obj.key, answer);
                        //console.log("A: " + JSON.stringify(answer));
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
                if (_.isNaN(answer) || answer < 1024 || answer >= Math.pow(2, 16)) {
                    throw new CustomError("Invalid port number!");
                }
                break;
            case "session.pad_length_min":
                answer = parseInt(answer);
                if (_.isNaN(answer) || answer < 16 || answer > 64) {
                    throw new CustomError("Invalid padding length!");
                }
                break;
            case "session.pad_length_max":
                answer = parseInt(answer);
                if (_.isNaN(answer) || answer < 16 || answer > 64) {
                    throw new CustomError("Invalid padding length!");
                }
                break;
            case "session.lifetime":
                answer = parseInt(answer);
                if (_.isNaN(answer) || answer < 5 || answer > 60) {
                    throw new CustomError("Invalid lifetime!");
                }
                answer = answer * 60 * 1000;
                break;
            case "session.garbage_collection_interval":
                answer = parseInt(answer);
                if (_.isNaN(answer) || answer < 1 || answer > 30) {
                    throw new CustomError("Invalid interval!");
                }
                answer = answer * 60 * 1000;
                break;
            case "communicator.max_login_post_length":
                answer = parseInt(answer);
                if (_.isNaN(answer) || answer < 2048) {
                    throw new CustomError("Invalid size!");
                }
                break;
        }
        return answer;
    };

    var checkIfFileIsOkForConfig = function (configFile) {
        return new Promise(function (fulfill, reject) {
            checkIfFileExists(configFile).then(function (exists) {
                if (exists) {
                    throw new CustomError("Configuration file already exists!\n" +
                        "Current version does not support modifications to configuration files.");
                }
                return writeFile(configFile, {});
            }).then(function () {
                return deleteFile(configFile);
            }).then(function () {
                fulfill();
            }).catch(function (e) {
                reject(e);
            });
        });
    };

    var checkIfFileExists = function (file) {
        return new Promise(function (fulfill, reject) {
            fs.exists(file, function (exists) {
                fulfill(exists);
            });
        });
    };

    var writeFile = function (file, data) {
        return new Promise(function (fulfill, reject) {
            var content = _.isObject(data) ? JSON.stringify(data, null, 4) : data.toString();
            fs.writeFile(file, content, function (err) {
                if (err) {
                    reject(new CustomError("File cannot be created! Check folders and permissions.\n" + err.message));
                }
                fulfill();
            });
        });
    };

    var deleteFile = function (file) {
        return new Promise(function (fulfill, reject) {
            fs.unlink(file, function (err) {
                if (err) {
                    reject(new CustomError(err.message));
                }
                fulfill();
            });
        });
    };

    this.setupConfigurationFile = setupConfigurationFile;
}
module.exports = new ConfigMaker();