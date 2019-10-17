/**
 * Main thread
 */
let cluster = require("cluster");

/**
 *
 * @type {Worker}
 */
let clusterWorker = null;

/**
 * @todo: this should be over a period of time like n/1min because absolute number makes no sense
 * @type {number}
 */
let maxRespawns = 1;

if (cluster.isMaster) {
    /**
     * start/restart worker
     * @private
     */
    let _respawnWorker = function() {
        console.log("CLUSTER: Creating new worker...");
        clusterWorker = cluster.fork();
        console.log("CLUSTER: New worker(#"+clusterWorker.id+") has been spawned.");
    };

    cluster.setupMaster({
        exec: "./PPMServer/ApplicationCore.js",
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
    let _shutdownClusterWorker = function() {
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
    console.log("CLUSTER: Not a master cluster! Exiting.");
}
