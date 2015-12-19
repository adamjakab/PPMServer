var Configuration = require("./Configuration")
    , CustomError = require("./CustomError")
    , cluster = require("cluster")
    , fs = require("fs")
    ;

(function() {
    var server = null;

    /**
     * This should never happen(but eventually it will)!
     */
    process.on("uncaughtException", function (e) {
        _killApplication(e);
    });

    /**
     * Kills the application by sending the SIGKILL signal to the precess
     * @param {Error} e
     * @private
     */
    var _killApplication = function(e) {
        console.log(e.message);
        console.trace();
        process.kill(process.pid, "SIGKILL");
    };

    /**
     * Catches "SIGTERM" and "SIGINT" signals and shuts down the httpServer cleanly
     * before exiting. THe above two signals are intentional shutdown signals required
     * either by user interrupting the process or by OS (ie. not internal).
     * @private
     */
    var _shutdownApplicationCore = function () {
        utils.log("Received shutdown request");
        utils.log("ApplicationCore shutting down...");
        server.stop().then(function() {
            utils.log("ApplicationCore has shut down.");
        }).catch(function (e) {
            console.error("server stop failed: ", e.message);
        });
    };
    process.on("SIGTERM", _shutdownApplicationCore);
    process.on("SIGINT", _shutdownApplicationCore);

    /**
     * Start the Http Server
     * @private
     */
    var _startHttpServer = function () {
        utils.log('Worker #' + cluster.worker.id + " created.(pid:" + process.pid + ")");
        utils.log("ApplicationCore initing...");
        /**
         * Start Http Server
         */
        server = new HttpServer();
        server.start().then(function () {
            utils.log("ApplicationCore inited.");
        }).catch(function (e) {
            _killApplication(e);
        });
    };

    /**
     * Start Application Core
     */
    if(!cluster.isWorker) {
        throw new CustomError("ApplicationCore is the main worker module and cannot be executed directly!");
    }

    /**
     * Setup Configuration with config file path passed on command line
     */
    var configurationFile = process.argv[2];
    try {
        var config = JSON.parse(fs.readFileSync(configurationFile));
        Configuration.setConfiguration(config);
        /* These can be required only after Configuration has been set up*/
        var utils = require("./Utils");
        var HttpServer = require("./HttpServer");
        _startHttpServer();
    } catch (e) {
        throw new CustomError("Unable to read configuration file! " + e.message);
    }
})();