/**
 * Created by jackisback on 08/12/15.
 */
var fs = require("fs")
    , path = require("path")
    , _ = require("underscore")
    , stdio = require("stdio")
    , stdioMod = require("./stdio/question")
    , Configuration = require("./Configuration")
    , utils = require("./Utils")
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
        checkConfigFile(configFile).then(function (configContent) {
            return getConfigOptionsFromUser(configContent);
        }).then(function (configuration) {
            return writeFile(configFile, configuration);
        }).then(function () {
            console.error("Configuration created: " + configFile);
        }).catch(function (e) {
            console.error("Error: " + e.message);
            console.error("Configuration was not created.");
        });
    };

    /**
     * The default PPM server configuration
     * @return {{}}
     */
    var getDefaultConfiguration = function () {
        return {
            "main": {
                "server_name": "PPM Server 1",
                "log_to_console": false
            },
            "server": {
                "ip": null,
                "port": 8765,
                "password": "5ebedf1ac058b7c02b2acbcbf098c0c4" /* "Paranoia" */
            },
            "db": {
                "path": {
                    "storage": "storage.db",
                    "session": "session.db"
                }
            },
            "session": {
                "pad_length_min": 16,
                "pad_length_max": 64,
                "lifetime": 30
            }
        };
    };

    var getConfigOptionsFromUser = function (configContent) {
        return new Promise(function (fulfill, reject) {
            var config = {};
            var defaultConfig = getDefaultConfiguration();
            if (configContent) {
                try {
                    config = JSON.parse(configContent);
                } catch (e) {
                    config = {};
                }
            }
            config = _.extend(defaultConfig, config);
            Configuration.setConfiguration(config);

            var dialogue = [
                {
                    type: "info",
                    message: "--- ANSWER THE FOLLOWING QUESTIONS ---"
                },
                {
                    type: "question",
                    key: "main.server_name",
                    message: "What name do you want to give to your server?",
                    answer: Configuration.get("main.server_name")
                },
                {
                    type: "question",
                    key: "main.log_to_console",
                    message: "Enable console logging?",
                    options: ['y', 'n'],
                    answer: Configuration.get("main.log_to_console") ? "y" : "n"
                },
                {
                    type: "question",
                    key: "server.ip",
                    message: "Ip address to bind the server to (leave empty for all interfaces)?",
                    answer: Configuration.get("server.ip")
                },
                {
                    type: "question",
                    key: "server.port",
                    message: "Port to listen on(1024-65535)?",
                    answer: Configuration.get("server.port")
                },
                {
                    type: "question",
                    key: "server.password",
                    message: "Password to use (leave empty to keep current)?",
                    answer: null /*password is written in hashed form so it would not be of use*/
                },
                {
                    type: "question",
                    key: "db.path.storage",
                    message: "Path to your password storage file?",
                    answer: Configuration.get("db.path.storage")
                },
                {
                    type: "question",
                    key: "db.path.session",
                    message: "Path to your session storage file?",
                    answer: Configuration.get("db.path.session")
                },
                {
                    type: "question",
                    key: "session.pad_length_min",
                    message: "Minimum padding length(16-64)?",
                    answer: Configuration.get("session.pad_length_min")
                },
                {
                    type: "question",
                    key: "session.pad_length_max",
                    message: "Maximum padding length(16-64)?",
                    answer: Configuration.get("session.pad_length_max")
                },
                {
                    type: "question",
                    key: "session.lifetime",
                    message: "Session lifetime in minutes(5-60)?",
                    answer: Configuration.get("session.lifetime")
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
                var opts = {
                    "question": obj.message,
                    "answer": obj.answer || null,
                    "options": obj.options || null
                };
                stdioMod.question(opts).then(function (answer) {
                    return transformAnswer(obj.key, answer);
                }).then(function (answer) {
                    Configuration.set(obj.key, answer);
                    fulfill();
                }).catch(function (e) {
                    return reject(e);
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
                case "server.password":
                    if (_.isEmpty(answer)) {
                        answer = Configuration.get("server.password");
                    } else {
                        answer = utils.md5Hash(answer);
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
                    fulfill(answer);
                    break;
                default:
                    fulfill(answer);
            }
        });
    };

    /**
     * Checks if configFile esists - it it does returns its content
     * If it does not exist checks if it can be created
     * @param {string} configFile
     * @return {string|bool}
     */
    var checkConfigFile = function (configFile) {
        return new Promise(function (fulfill, reject) {
            checkIfFileExists(configFile).then(function () {
                return readFile(configFile);
            }).then(function (configContent) {
                fulfill(configContent);
            }).catch(function () {
                checkIfFileCanBeCreated(configFile).then(function () {
                    fulfill(false);
                }).catch(function (e) {
                    reject(e);
                });
            });
        });
    };

    var checkIfFileCanBeCreated = function (filePath) {
        return new Promise(function (fulfill, reject) {
            checkIfFileExists(filePath).then(function () {
                reject(new CustomError("Cannot test file creation because file already exists!"));
            }).catch(function () {
                writeFile(filePath, {}).then(function () {
                    return deleteFile(filePath);
                }).then(function () {
                    fulfill();
                }).catch(function (e) {
                    reject(e);
                });
            });
        });
    };

    var checkIfFileExists = function (file) {
        return new Promise(function (fulfill, reject) {
            fs.stat(file, function (err, stats) {
                if (err) {
                    return reject(new CustomError("File does not exist!"));
                }
                fulfill();
            });
        });
    };

    var readFile = function (file) {
        return new Promise(function (fulfill, reject) {
            fs.readFile(file, function (err, data) {
                if (err) {
                    return reject(new CustomError("File cannot be read!" + err.message));
                }
                fulfill(data);
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
                //console.log("File written: " + file);
                fulfill();
            });
        });
    };

    var deleteFile = function (file) {
        return new Promise(function (fulfill, reject) {
            fs.unlink(file, function (err) {
                //console.log("File deleted: " + file);
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