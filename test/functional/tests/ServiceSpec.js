/**
 * Created by jackisback on 05/12/15.
 */
var expect = require("chai").expect
    , syncRequest = require("sync-request")
    , sleep = require('sleep')
    , helper = require('../helper')
    , config = require("../resources/ppm.json")
    ;


var serverAddress = config.server.ip | "127.0.0.1";
//serverAddress = (serverAddress ? serverAddress : "127.0.0.1");
var serverPort = config.server.port;

/**
 * Using sync-request(https://github.com/ForbesLindesay/sync-request) for testing
 */

describe("Service Tests", function () {
    describe("#start service", function () {
        this.timeout(5000);
        it("should be available withing 5 seconds", function () {
            helper.startServer(false);
            var attempts = 0;
            while (true) {
                attempts++;
                var res = false;
                try {
                    res = syncRequest("POST", 'http://' + serverAddress + ":" + serverPort);
                } catch (e) {
                    /**/
                }
                if (res || attempts > 20) {
                    break;
                }
                sleep.usleep(250);
            }
            //console.log("RES: " + JSON.stringify(res));
            expect(res).not.to.be.equal(false);
            helper.killServer('SIGTERM');
        });
    });

    describe("#test request url validity", function () {
        it("should not allow paths different than '/'", function () {
            helper.startServer(true);
            var url = 'http://' + serverAddress + ":" + serverPort + "/sub";
            res = syncRequest("POST", url);
            expect(res).to.have.property('statusCode', 404);
        });
    });

    describe("#test request method validity", function () {
        it("should not allow 'OPTIONS' method", function () {
            var url = 'http://' + serverAddress + ":" + serverPort;
            res = syncRequest("OPTIONS", url);
            expect(res).to.have.property('statusCode', 405);
        });
        it("should not allow 'GET' method", function () {
            var url = 'http://' + serverAddress + ":" + serverPort;
            res = syncRequest("GET", url);
            expect(res).to.have.property('statusCode', 405);
        });
        it("should not allow 'HEAD' method", function () {
            var url = 'http://' + serverAddress + ":" + serverPort;
            res = syncRequest("HEAD", url);
            expect(res).to.have.property('statusCode', 405);
        });
        it("should not allow 'PUT' method", function () {
            var url = 'http://' + serverAddress + ":" + serverPort;
            res = syncRequest("PUT", url);
            expect(res).to.have.property('statusCode', 405);
        });
        it("should not allow 'DELETE' method", function () {
            var url = 'http://' + serverAddress + ":" + serverPort;
            res = syncRequest("DELETE", url);
            expect(res).to.have.property('statusCode', 405);
        });
        it("should not allow 'TRACE' method", function () {
            var url = 'http://' + serverAddress + ":" + serverPort;
            res = syncRequest("TRACE", url);
            expect(res).to.have.property('statusCode', 405);
        });
        it("should not allow 'PATCH' method", function () {
            var url = 'http://' + serverAddress + ":" + serverPort;
            res = syncRequest("PATCH", url);
            expect(res).to.have.property('statusCode', 405);
        });
    });

    describe("#test request params validity", function () {
        it("should not allow any query params", function () {
            var url = 'http://' + serverAddress + ":" + serverPort + "?a=1";
            res = syncRequest("POST", url);
            expect(res).to.have.property('statusCode', 414);
        });
    });

    describe("#test request data validity", function () {
        it("should not allow empty data", function () {
            var url = 'http://' + serverAddress + ":" + serverPort;
            var opt = {body: ""};
            res = syncRequest("POST", url, opt);
            expect(res).to.have.property('statusCode', 406);
        });
        it("should not allow excessive post data", function () {
            //413
        });
    });

    describe("#BEDTIME", function () {
        it("i should go to bed", function () {
            helper.killServer("SIGTERM");
        });
    });


});


