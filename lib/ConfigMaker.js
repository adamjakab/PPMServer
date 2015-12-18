/**
 * Created by jackisback on 08/12/15.
 */
var fs = require("fs")
    , path = require("path")
    , _ = require("underscore")
    , stdio = require("stdio")
    , stdioMod = require("./stdio/question")
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
                {
                    type: "question",
                    key: "main.server_name",
                    message: "What name do you want to give to your server?",
                    answer: "PPM Server #1"
                },
                {
                    type: "question",
                    key: "main.log_to_console",
                    message: "Enable console logging?",
                    options: ['y', 'n'],
                    answer: "n"
                },
                {
                    type: "question",
                    key: "server.ip",
                    message: "Ip address to bind the server to (enter for all interfaces)?"
                },
                {type: "question", key: "server.port", message: "Port to listen on(1024-65535)?", answer: "8765"},
                {
                    type: "question",
                    key: "db.path.storage",
                    message: "Path to your password storage file?",
                    answer: "pwd.db"
                },
                {
                    type: "question",
                    key: "db.path.session",
                    message: "Path to your session storage file?",
                    answer: "sess.db"
                },
                {
                    type: "question",
                    key: "session.pad_length_min",
                    message: "Minimum padding length(16-64)?",
                    answer: "16"
                },
                {
                    type: "question",
                    key: "session.pad_length_max",
                    message: "Maximum padding length(16-64)?",
                    answer: "64"
                },
                {
                    type: "question",
                    key: "session.lifetime",
                    message: "Session lifetime in minutes(5-60)?",
                    answer: "30"
                },
                {
                    type: "question",
                    key: "session.garbage_collection_interval",
                    message: "Check for expired sessions every (1-30) minutes?",
                    answer: "5"
                },
                {
                    type: "question",
                    key: "communicator.max_login_post_length",
                    message: "Maximum POST size for unauthenticated requests(>2048)?",
                    answer: "4096"
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
                var message = "[" + obj.key + "] " + cs + obj.message + ce;
                //stdioMod.question(message, options, function (err, answer) {
                var Qargs = {
                    "question": message,
                    "answer": obj.answer || null,
                    "options": obj.options || null
                };
                stdioMod.question(Qargs, function (err, answer) {
                    if (err) {
                        return reject(new CustomError(err));
                    }
                    transformAnswer(obj.key, answer).then(function (answer) {
                        //console.log("A: " + JSON.stringify(answer));
                        Configuration.set(obj.key, answer);
                        fulfill();
                    }).catch(function (e) {
                        return reject(e);
                    });
                });
            } else {
                return reject(new CustomError("Unknown type!"));
            }
        });
    };

    var transformAnswer = function (key, answer) {
        return new Promise(function (fulfill, reject) {
            switch (key) {
                case "main.server_name":
                    //whatever is good
                    if (_.isEmpty(answer)) {
                        return reject(new CustomError("Server name cannot be empty!"));
                    }
                    fulfill(answer);
                    break;
                case "main.log_to_console":
                    answer = (answer == "y");
                    fulfill(answer);
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
                            return reject(new CustomError("Invalid ip address!"));
                        }
                    }
                    fulfill(answer);
                    break;
                case "server.port":
                    answer = parseInt(answer);
                    if (_.isNaN(answer) || answer < 1024 || answer >= Math.pow(2, 16)) {
                        return reject(new CustomError("Invalid port number!"));
                    }
                    fulfill(answer);
                    break;
                case "db.path.storage":
                case "db.path.session":
                    answer = path.resolve(answer);
                    checkIfFileCanBeCreated(answer).then(function () {
                        fulfill(answer);
                    }).catch(function (e) {
                        return reject(e);
                    });
                    break;
                case "session.pad_length_min":
                    answer = parseInt(answer);
                    if (_.isNaN(answer) || answer < 16 || answer > 64) {
                        return reject(new CustomError("Invalid padding length!"));
                    }
                    fulfill(answer);
                    break;
                case "session.pad_length_max":
                    answer = parseInt(answer);
                    if (_.isNaN(answer) || answer < 16 || answer > 64) {
                        return reject(new CustomError("Invalid padding length!"));
                    }
                    fulfill(answer);
                    break;
                case "session.lifetime":
                    answer = parseInt(answer);
                    if (_.isNaN(answer) || answer < 5 || answer > 60) {
                        return reject(new CustomError("Invalid lifetime!"));
                    }
                    answer = answer * 60 * 1000;
                    fulfill(answer);
                    break;
                case "session.garbage_collection_interval":
                    answer = parseInt(answer);
                    if (_.isNaN(answer) || answer < 1 || answer > 30) {
                        return reject(new CustomError("Invalid interval!"));
                    }
                    answer = answer * 60 * 1000;
                    fulfill(answer);
                    break;
                case "communicator.max_login_post_length":
                    answer = parseInt(answer);
                    if (_.isNaN(answer) || answer < 2048) {
                        return reject(new CustomError("Invalid size!"));
                    }
                    fulfill(answer);
                    break;
            }
        });
    };

    var checkIfFileIsOkForConfig = function (configFile) {
        return new Promise(function (fulfill, reject) {
            checkIfFileCanBeCreated(configFile).then(function () {
                fulfill();
            }).catch(function (e) {
                if (e.message == "File already exists!") {
                    e.message = "Configuration file already exists!\n" +
                        "Current version does not support modifications to configuration files.";
                }
                reject(e);
            });
        });
    };

    var checkIfFileCanBeCreated = function (filePath) {
        return new Promise(function (fulfill, reject) {
            checkIfFileExists(filePath).then(function () {
                return writeFile(filePath, {});
            }).then(function () {
                return deleteFile(filePath);
            }).then(function () {
                fulfill();
            }).catch(function (e) {
                reject(e);
            });
        });
    };

    var checkIfFileExists = function (file) {
        return new Promise(function (fulfill, reject) {
            fs.stat(file, function (err, stats) {
                if (!err) {
                    return reject(new CustomError("File(" + file + ") already exists!"));
                }
                fulfill();
            });
        });
    };

    var writeFile = function (file, data) {
        return new Promise(function (fulfill, reject) {
            var content = _.isObject(data) ? JSON.stringify(data, null, 4) : data.toString();
            fs.writeFile(file, content, function (err) {
                if (err) {
                    return reject(new CustomError("File cannot be created! Check folders and permissions.\n" + err.message));
                }
                console.log("File written: " + file);
                fulfill();
            });
        });
    };

    var deleteFile = function (file) {
        return new Promise(function (fulfill, reject) {
            fs.unlink(file, function (err) {
                console.log("File deleted: " + file);
                if (err) {
                    return reject(new CustomError(err.message));
                }
                fulfill();
            });
        });
    };

    this.setupConfigurationFile = setupConfigurationFile;
}
module.exports = new ConfigMaker();