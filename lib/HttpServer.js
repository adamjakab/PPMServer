var Configuration = require("./Configuration")
    , http = require("http")
    , events = require("events")
    , Promise = require("../node_modules/bluebird/js/browser/bluebird.min")
    , Communicator = require("./Communicator")
    , utils = require("./Utils")
    ;

function HttpServer() {
    var httpServer = null;
    utils.log("HttpServer created");

    /**
     * Starts the Http Server
     */
    this.start = function() {
        return new Promise(function(fulfill, reject) {
            var serverIp = Configuration.get("server.ip");
            var serverPort = Configuration.get("server.port");
            var serverName = Configuration.get("main.server_name");
            utils.log("HttpServer(" + serverName + ") starting...");

            httpServer = http.createServer();
            httpServer.on("request", function(req, resp) {
                handleRequest(req, resp);
            });

            if (serverIp) {
                httpServer.listen(serverPort, serverIp);
                utils.log("HttpServer is listening on: " + serverIp + ":" + serverPort);
            } else {
                httpServer.listen(serverPort);
                utils.log("HttpServer is listening on all interfaces on port: " + serverPort);
            }
            fulfill();
        });
    };

    /**
     * Stops the Http Server
     */
    this.stop = function() {
        return new Promise(function(fulfill, reject) {
            utils.log("HttpServer stopping...");
            try{httpServer.close();} catch(e){/*Not running.*/}
            var shutdownListenersCount = events.EventEmitter.listenerCount(process,"PpmSrv_SHUTDOWN");
            var shutdownCounts = 0;
            process.emit('PpmSrv_SHUTDOWN', function(err) {
                shutdownCounts++;
                if(shutdownCounts >= shutdownListenersCount) {
                    utils.log("HttpServer stopped.");
                    fulfill();
                }
            });
        });
    };

    /**
     * Delegate request handling to Communicator
     * @param {IncomingMessage} request
     * @param {ServerResponse} response
     */
    var handleRequest = function(request, response) {
        Communicator.elaborateRequest(request, response).then(function() {
        }).catch(function (e) {
            utils.log("Failed to handle request: " + e.message);
        });
    };
}
module.exports = HttpServer;