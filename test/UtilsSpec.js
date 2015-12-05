/**
 * Created by jackisback on 05/12/15.
 */
var expect = require("chai").expect;
var Utils = require("../lib/Utils.js");
var http = require("http");

describe("Utils", function(){


    describe("#getRequestIp()", function(){
        it("should return false if no remote ip", function() {
            var request = new http.IncomingMessage();
            var result = Utils.getRequestIp(request);
            expect(result).to.be.equal(false);
        });
        it("should return remote ip from header", function() {
            var ip = "127.0.0.1";
            var request = new http.IncomingMessage();
            request.headers = {'x-forwarded-for':ip};
            var result = Utils.getRequestIp(request);
            expect(result).to.be.equal(ip);
        });
        it("should return remote ip from connection", function() {
            var ip = "127.0.0.1";
            var request = new http.IncomingMessage();
            request.connection = {'remoteAddress':ip};
            var result = Utils.getRequestIp(request);
            expect(result).to.be.equal(ip);
            delete request.connection.remoteAddress;
            //
            request.connection.socket = {'remoteAddress':ip};
            result = Utils.getRequestIp(request);
            expect(result).to.be.equal(ip);
        });
        it("should return remote ip from socket", function() {
            var ip = "127.0.0.1";
            var request = new http.IncomingMessage();
            request.socket = {'remoteAddress':ip};
            var result = Utils.getRequestIp(request);
            expect(result).to.be.equal(ip);
        });
    });
});