var Configuration = require("./Configuration")
    , cluster = require("cluster")
    ;

(function() {
    var server = null;

    /**
     * Kills the application by sending the SIGKILL signal to the precess
     * @param e
     * @private
     */
    var _killApplication = function(e) {
        console.log("ApplicationCore has caught an unhandled exception and will be killed!");
        console.log(e);
        console.trace();
        process.kill(process.pid, "SIGKILL");
    };
    /**
     * This should never happen(but eventually it will)!
     */
    process.on("uncaughtException", _killApplication);

    /**
     * Catches "SIGTERM" and "SIGINT" signals and shuts down the httpServer cleanly
     * before exiting. THe above two signals are intentional shutdown signals required
     * either by user interrupting the process or by OS (ie. not internal).
     * @private
     */
    var _shutdownApplicationCorefunction = function() {
        utils.log("Received shutdown request");
        utils.log("ApplicationCore shutting down...");
        server.stop().then(function() {
            utils.log("ApplicationCore has shut down.");
        }).catch(SyntaxError, function (e) {
            console.error("server stop failed: ", e.message);
        }).error(function (e) {
            console.error("server stop failed: ", e.message);
        });
    };
    process.on("SIGTERM", _shutdownApplicationCorefunction);
    process.on("SIGINT", _shutdownApplicationCorefunction);

    /**
     * Start Application Core
     */
    if(!cluster.isWorker) {
        throw new Error("ApplicationCore is the main worker module and cannot be executed directly!");
    }

    /**
     * Setup Configuration with config file path passed on command line
     */
    var configurationFile = process.argv[2];
    Configuration.setConfigurationFile(configurationFile);

    /* These can be required only after Configuration has been set up */
    var utils = require("./Utils");
    var HttpServer = require("./HttpServer");


    utils.log('Worker #' + cluster.worker.id + " created.(pid:"+process.pid+")");
    utils.log("ApplicationCore initing...");

    /**
     * Start Http Server
     */
    server = new HttpServer(Configuration.get("server"));
    server.start().then(function() {
        utils.log("ApplicationCore inited.");
    }).catch(SyntaxError, function (e) {
        console.error("server start failed: ", e.message);
    }).error(function (e) {
        console.error("server start failed: ", e.message);
    });
})();