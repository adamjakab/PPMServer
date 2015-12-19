/**
 * Main thread
 */
var cluster = require("cluster");
var stdio = require("stdio");

var opts = stdio.getopt({
    'setup': {mandatory: false, description: 'Setup a configuration file.'},
    'configuration': {key: 'c', mandatory: true, args: 1, description: 'Full path to configuration file (.json)'}
});

if (opts.setup) {
    var configMaker = require('./lib/ConfigMaker');
    configMaker.setupConfigurationFile(opts);
    return;
}

var clusterWorker = null;
/**
 * @todo: this should be over a period of time like n/1min because absolute number makes no sense
 * @type {number}
 */
var maxRespawns = 1;

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
        exec: "./lib/ApplicationCore.js",
        args: [opts.configuration],
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
    console.log("CLUSTER: Not a master cluster! Exiting.");
}
