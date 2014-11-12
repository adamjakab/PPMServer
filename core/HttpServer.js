//HTTP SERVER
var config = require("../configuration.json")
    , http = require("http")
    , Communicator = require("./Communicator")
    , utils = require("./Utils")
    ;


function HttpServer(options) {
    this.options = options;
    this.server = null;
    this.COM = new Communicator();
    utils.log("HttpServer created" + JSON.stringify(this.options));
}


HttpServer.prototype.handleRequest = function(request, response, self) {
    try {
        this.COM.elaborateRequest(request, response, self);
    } catch (e) {
        utils.log("HttpServer error while processing request: " + e);
        response.writeHead(500);
        response.end();
    }
};


HttpServer.prototype.start = function() {
    utils.log("HttpServer starting...");
    try {
        this.server = http.createServer();
        var self = this;
        this.server.on("request", function(req, resp) {
            self.handleRequest(req, resp, self);
        });

        if(this.options.ip) {
            this.server.listen(this.options.port, this.options.ip);
            utils.log("HttpServer is listening on: " + this.options.ip + ":" + this.options.port);
        } else {
            this.server.listen(this.options.port);
            utils.log("HttpServer is listening on port: " + this.options.port);
        }
    } catch(e) {
        utils.log("HttpServer has encountered an error: " + e);
    }
};

HttpServer.prototype.stop = function(cb) {
    utils.log("HttpServer stopping...");
    try{
        var self = this;
        this.COM.shutdown(function() {
            try{self.server.close();/*this will normally be already shut down*/} catch(e) {}
            cb();
        });
    } catch(e) {
        utils.log("HttpServer cannot be shut down: " + e);
        cb();
    }
};

//Exported Interface
module.exports = HttpServer;
