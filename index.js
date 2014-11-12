var cluster = require("cluster");
var clusterWorker = null;

if (cluster.isMaster) {
    var _respawnWorker = function() {
        console.log("Creating new worker...");
        clusterWorker = cluster.fork();
    };

    cluster.setupMaster({
        exec: "./core/ApplicationCore.js",
        args: [],
        silent: false
    });

    /**
     * If clusterWorker exits without any reason then it has probably encountered an uncaught
     * exception and it will be restarted.
     */
    cluster.on('exit', function(deadWorker) {
        if (!deadWorker.suicide) {
            console.log("Worker #" + deadWorker.id + " died unexpectedly. Respawning...");
            clusterWorker = null;
            _respawnWorker();
        }
    });

    /**
     * These are for when user interrupts this main process. This will allow the clusterWorker
     * to cleanly shut down all processes before getting killed.
     */
    var _shutdownClusterWorker = function() {
        if (clusterWorker!==null) {
            clusterWorker.kill();
        }
    };
    process.on("exit", _shutdownClusterWorker);
    process.on("SIGINT", _shutdownClusterWorker);
    process.on("SIGTERM", _shutdownClusterWorker);

    _respawnWorker();
}
