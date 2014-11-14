/**
 * Main thread
 */
var cluster = require("cluster");
var clusterWorker = null;
var maxRespawns = 100;

if (cluster.isMaster) {
    /**
     * start/restart worker
     * @private
     */
    var _respawnWorker = function() {
        console.log("CLUSTER: Creating new worker...");
        clusterWorker = cluster.fork();
        console.log("CLUSTER: New worker(#"+clusterWorker.id+") has been spawned.");
    };

    cluster.setupMaster({
        exec: "./core/ApplicationCore.js",
        args: [],
        silent: false
    });

    /**
     * If clusterWorker exits (probably encountered an uncaught exception)
     * it will be restarted.
     */
    cluster.on('exit', function(deadWorker) {
        if (!deadWorker.suicide) {
            clusterWorker = null;
            if(parseInt(deadWorker.id) < maxRespawns) {
                console.log("CLUSTER: Worker #" + deadWorker.id + " died unexpectedly. Respawning...");
                _respawnWorker();
            } else {
                console.log("CLUSTER: Reached maximum number of respawns("+maxRespawns+"). Application halted.");
            }
        }
    });

    /**
     * Clean shutdown on: exit, SIGINT, SIGTERM
     * This will allow the clusterWorker
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

    //spin it up
    _respawnWorker();
} else {
    console.log("CLUSTER: Not master cluster! Exiting.");
}
