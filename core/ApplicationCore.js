var config = require("../configuration.json")
    , HttpServer = require("./HttpServer")
    , utils = require("./Utils")
    , cluster = require("cluster")
    ;

(function() {
    /**
     * This should never happen(but eventually it will)!
     */
    var _killApplication = function(e) {
        console.log("ApplicationCore has caught an unhandled exception and will be killed!");
        console.log(e);
        console.trace();
        process.kill(process.pid, "SIGKILL");
    };
    process.on("uncaughtException", _killApplication);

    /**
     * Start Application Core
     */
    if(!cluster.isWorker) {
        throw("ApplicationCore is the main worker module and cannot be executed directly!");
    }

    var _shutdownApplicationCorefunction = function() {
        utils.log("ApplicationCore shutting down...");
        server.stop(function() {
            utils.log("ApplicationCore has shut down.");
        });
    };
    process.on("SIGTERM", _shutdownApplicationCorefunction);
    process.on("SIGINT", _shutdownApplicationCorefunction);

    utils.log('Worker #' + cluster.worker.id + " created.(pid:"+process.pid+")");
    utils.log("ApplicationCore initing...");
    var server = new HttpServer(config.server);
    server.start();
}).call();
