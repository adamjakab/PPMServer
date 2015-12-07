/**
 * Created by jackisback on 05/12/15.
 */
var expect = require("chai").expect;
var http = require("http");
var syncRequest = require("sync-request");
var querystring = require("querystring");
var path = require('path');
var exec = require('child_process').exec;
var sleep = require('sleep');
var config = require("../../../configuration.json");

var projectPath = path.resolve(__dirname, "../../../");
var indexJs = path.resolve(projectPath, "index.js");
var command = 'node ' + indexJs;
var cmdOpts = {
    cwd: projectPath
};

var address = config.server.ip;
address = (address ? address : "127.0.0.1");
var port = config.server.port;

/**
 * Using sync-request(https://github.com/ForbesLindesay/sync-request) for testing
 */



describe("Service Tests", function () {
    describe("#start service", function () {
        this.timeout(5000);
        it("should be available withing 5 seconds", function () {
            var child = exec(command, cmdOpts);
            //console.log("Command started with pid: " + child.pid);
            var attempts = 0;
            while (true) {
                attempts++;
                var res = false;
                try {
                    res = syncRequest("POST", 'http://' + address + ":" + port);
                } catch (e) {/**/
                }
                if (res || attempts > 20) {
                    break;
                }
                sleep.usleep(250);
            }
            //console.log("RES: " + JSON.stringify(res));
            expect(res).not.to.be.equal(false);
            expect(res).to.have.property('statusCode', 500);
            child.kill('SIGTERM');
        });
    });


});


