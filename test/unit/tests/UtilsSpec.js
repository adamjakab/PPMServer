/**
 * Created by jackisback on 05/12/15.
 */
var expect = require("chai").expect;
var Utils = require("../../../lib/Utils.js");
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

    describe("#getRandomNumberInRange()", function () {
        it("should return a random number in range", function () {
            var max = 2 + Math.round(Math.random() * 128);
            var min = Math.round(max / 2);
            var result;
            for (var i = 0; i < 128; i++) {
                result = Utils.getRandomNumberInRange(min, max);
                expect(result).to.be.a("number");
                expect(result).to.be.at.least(min);
                expect(result).to.be.at.most(max);
            }
        });
        it("should return an exact number if min === max", function () {
            var max = 2 + Math.round(Math.random() * 128);
            var min = max;
            var result;
            for (var i = 0; i < 128; i++) {
                result = Utils.getRandomNumberInRange(min, max);
                expect(result).to.be.a("number");
                expect(result).to.be.equal(min);
                expect(result).to.be.equal(max);
            }
        });
    });


    describe("#decryptRawRequestWithUserData()", function () {
        it("should decrypt encrypted raw data", function () {
            var user = {
                username: "testuser",
                password: "testpassword"
            };
            var postData = {
                service: "login",
                test_message: Utils.getGibberish(128, 256)
            };
            var rawPost = Utils.encryptAES(JSON.stringify(postData), user.username);
            rawPost = Utils.encryptAES(rawPost, user.password);
            rawPost = Utils.leftRightPadString(rawPost, user.username.length, user.username.length);
            var RO = {rawPost: rawPost};
            var result = Utils.decryptRawRequestWithUserData(RO, user);
            expect(result).to.be.an("object");
            expect(result).to.be.deep.equal(postData);
        });
    });
});