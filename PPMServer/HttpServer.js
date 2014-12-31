var config = require("../configuration.json")
    , http = require("http")
    , Promise = require("../node_modules/bluebird/js/browser/bluebird.min")
    , Communicator = require("./Communicator")
    , utils = require("./Utils")
    ;

function HttpServer(opt) {
    var options = opt;
    var httpServer = null;
    utils.log("HttpServer created: " + JSON.stringify(options));

    /**
     * Starts the Http Server
     */
    this.start = function() {
        return new Promise(function(fulfill, reject) {
            utils.log("HttpServer starting...");
            httpServer = http.createServer();
            httpServer.on("request", function(req, resp) {
                handleRequest(req, resp);
            });
            if(options.ip) {
                httpServer.listen(options.port, options.ip);
                utils.log("HttpServer is listening on: " + options.ip + ":" + options.port);
            } else {
                httpServer.listen(options.port);
                utils.log("HttpServer is listening on port: " + options.port);
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
            httpServer.close();/*this will normally be already shut down*/
            //this.COM.shutdown(); === SessionManager.stopGarbageCollector();
            utils.log("HttpServer stopped.");
            fulfill();
        });
    };

    /**
     * Delegate request handling to Communicator
     * @param {IncomingMessage} request
     * @param {ServerResponse} response
     */
    var handleRequest = function(request, response) {
        Communicator.elaborateRequest(request, response).then(function() {
            //utils.log("Request handling done.");
        }).catch(function (e) {
            utils.log("Failed to handle request: " + e.message);
        });
    };
}
module.exports = HttpServer;