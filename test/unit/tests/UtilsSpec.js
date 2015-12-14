/**
 * Created by jackisback on 05/12/15.
 */
var expect = require("chai").expect;
var http = require("http");
var path = require("path");
var Utils = require("../../../lib/Utils.js");
var Configuration = require("../../../lib/Configuration");
var Helper = require('../helper');

describe("Utils", function () {

    describe("#getRequestIp()", function () {
        it("should return false if no remote ip", function () {
            var request = new http.IncomingMessage();
            var result = Utils.getRequestIp(request);
            expect(result).to.be.equal(false);
        });
        it("should return remote ip from header", function () {
            var ip = "127.0.0.1";
            var request = new http.IncomingMessage();
            request.headers = {'x-forwarded-for': ip};
            var result = Utils.getRequestIp(request);
            expect(result).to.be.equal(ip);
        });
        it("should return remote ip from connection", function () {
            var ip = "127.0.0.1";
            var request = new http.IncomingMessage();
            request.connection = {'remoteAddress': ip};
            var result = Utils.getRequestIp(request);
            expect(result).to.be.equal(ip);
            delete request.connection.remoteAddress;
            //
            request.connection.socket = {'remoteAddress': ip};
            result = Utils.getRequestIp(request);
            expect(result).to.be.equal(ip);
        });
        it("should return remote ip from socket", function () {
            var ip = "127.0.0.1";
            var request = new http.IncomingMessage();
            request.socket = {'remoteAddress': ip};
            var result = Utils.getRequestIp(request);
            expect(result).to.be.equal(ip);
        });
    });


    describe("#decryptLoginRequest", function () {
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
            var result = Utils.decryptLoginRequest(RO, user);
            expect(result).to.be.an("object");
            expect(result).to.be.deep.equal(postData);
        });
    });

    describe("#decryptAES", function () {
        it("should return original string", function () {
            var input = Utils.getGibberish(32, 128, {"extra": true, "extraChars": " "});
            var key = Utils.getGibberish(32, 32, {"extra": true, "extraChars": " "});
            var cipherText = Utils.encryptAES(input, key);
            var result = Utils.decryptAES(cipherText, key);
            expect(result).to.be.equal(input);
        });
        it("should return original object", function () {
            var obj = {"a": 123, "b": "xyz", "c": ["alma", "retek", "uborka"]};
            var input = JSON.stringify(obj);
            var key = Utils.getGibberish(32, 32, {"extra": true, "extraChars": " "});
            var cipherText = Utils.encryptAES(input, key);
            var result = Utils.decryptAES(cipherText, key, true);
            expect(result).to.be.an("object");
            expect(result).to.be.deep.equal(obj);
        });
    });

    describe("#encryptAES", function () {
        it("should return a hex string", function () {
            var input = Utils.getGibberish(32, 128, {"extra": true, "extraChars": " "});
            var key = Utils.getGibberish(32, 128, {"extra": true, "extraChars": " "});
            var result = Utils.encryptAES(input, key);
            expect(result).to.be.a("string");
            expect(result).to.match(new RegExp("^[a-f0-9]*:[a-f0-9]{32}:[a-f0-9]{16}$"));
        });
        it("should never produce the same result", function () {
            var input = Utils.getGibberish(32, 128, {"extra": true, "extraChars": " "});
            var result1 = Utils.sha3Hash(input);
            var result2 = Utils.sha3Hash(input);
            expect(result1).to.be.equal(result2);
        });
    });

    describe("#sha3Hash", function () {
        it("should return a hex string(64)", function () {
            var input = Utils.getGibberish(32, 128, {"extra": true, "extraChars": " "});
            var key = Utils.getGibberish(32, 128, {"extra": true, "extraChars": " "});
            var result1 = Utils.encryptAES(input, key);
            var result2 = Utils.encryptAES(input, key);
            expect(result1).not.to.be.equal(result2);
        });
        it("should produce the same result", function () {
            var input = Utils.getGibberish(32, 128, {"extra": true, "extraChars": " "});
            var result1 = Utils.sha3Hash(input);
            var result2 = Utils.sha3Hash(input);
            expect(result1).to.be.equal(result2);
        });
    });

    describe("#md5Hash", function () {
        it("should return a hex string(32)", function () {
            var input = Utils.getGibberish(32, 128, {"extra": true, "extraChars": " "});
            var result = Utils.md5Hash(input);
            expect(result).to.be.a("string");
            expect(result).to.match(new RegExp("^[a-f0-9]{32}$"));
        });
        it("should produce the same result", function () {
            var input = Utils.getGibberish(32, 128, {"extra": true, "extraChars": " "});
            var result1 = Utils.md5Hash(input);
            var result2 = Utils.md5Hash(input);
            expect(result1).to.be.equal(result2);
        });
        it("should return a hex string(32) when key is provided", function () {
            var input = Utils.getGibberish(32, 128, {"extra": true, "extraChars": " "});
            var key = Utils.getGibberish(32, 128, {"extra": true, "extraChars": " "});
            var result = Utils.md5Hash(input, key);
            expect(result).to.be.a("string");
            expect(result).to.match(new RegExp("^[a-f0-9]{32}$"));
        });
        it("should produce the same result when key is provided", function () {
            var input = Utils.getGibberish(32, 128, {"extra": true, "extraChars": " "});
            var key = Utils.getGibberish(32, 128, {"extra": true, "extraChars": " "});
            var result1 = Utils.md5Hash(input, key);
            var result2 = Utils.md5Hash(input, key);
            expect(result1).to.be.equal(result2);
        });
    });

    describe("#getGibberish", function () {
        it("should return empty string if called without arguments", function () {
            var result = Utils.getGibberish();
            expect(result).to.be.empty;
        });
        it("should return exact length string if min == max", function () {
            var min = 16;
            var max = 16;
            var result = Utils.getGibberish(min, max);
            expect(result.length).to.be.equal(min);
        });
        it("should return a string with length between min and max", function () {
            var min = 16;
            var max = 64;
            var result = Utils.getGibberish(min, max);
            expect(result).to.have.length.of.at.least(min);
            expect(result).to.have.length.of.at.most(max);
        });
        it("should return empty string(no infinite loop) if no character classes are set", function () {
            var options = {
                "alphaUpper": false,
                "alphaLower": false,
                "numeric": false,
                "special": false,
                "extendedUpper": false,
                "extendedLower": false,
                "extra": false,
                "extraChars": ""
            };
            var min = 16;
            var max = 64;
            var result = Utils.getGibberish(min, max, options);
            expect(result).to.be.empty;
        });
        it("should return only uppercase letters", function () {
            var options = {
                "alphaUpper": true,
                "alphaLower": false,
                "numeric": false,
                "special": false,
                "extendedUpper": false,
                "extendedLower": false,
                "extra": false,
                "extraChars": ""
            };
            var min = 16;
            var max = 64;
            var result = Utils.getGibberish(min, max, options);
            expect(result).to.match(new RegExp("^[A-Z]{" + min + "," + max + "}$"));
        });
        it("should return only lowercase letters", function () {
            var options = {
                "alphaUpper": false,
                "alphaLower": true,
                "numeric": false,
                "special": false,
                "extendedUpper": false,
                "extendedLower": false,
                "extra": false,
                "extraChars": ""
            };
            var min = 16;
            var max = 64;
            var result = Utils.getGibberish(min, max, options);
            expect(result).to.match(new RegExp("^[a-z]{" + min + "," + max + "}$"));
        });
        it("should return only numbers", function () {
            var options = {
                "alphaUpper": false,
                "alphaLower": true,
                "numeric": false,
                "special": false,
                "extendedUpper": false,
                "extendedLower": false,
                "extra": false,
                "extraChars": ""
            };
            var min = 16;
            var max = 64;
            var result = Utils.getGibberish(min, max, options);
            expect(result).to.match(new RegExp("^[a-z]{" + min + "," + max + "}$"));
        });
        it("should return only extra characters", function () {
            var options = {
                "alphaUpper": false,
                "alphaLower": false,
                "numeric": false,
                "special": false,
                "extendedUpper": false,
                "extendedLower": false,
                "extra": true,
                "extraChars": "aAbCcC"
            };
            var min = 16;
            var max = 64;
            var result = Utils.getGibberish(min, max, options);
            expect(result).to.match(new RegExp("^[a-cA-C]{" + min + "," + max + "}$"));
        });
    });

    describe("#leftRightPadString", function () {
        it("should pad string only on the left", function () {
            var input = Utils.getGibberish(32, 128, {"special": false, "extendedUpper": false, "extendedLower": false});
            var lft = 7;
            var rgt = 0;
            var result = Utils.leftRightPadString(input, lft, rgt);
            expect(result).to.match(new RegExp("^[a-f0-9]{7}" + input + "$"));
            expect(result.length).to.be.equal(input.length + lft + rgt);
        });
        it("should pad string only on the right", function () {
            var input = Utils.getGibberish(32, 128, {"special": false, "extendedUpper": false, "extendedLower": false});
            var lft = 0;
            var rgt = 7;
            var result = Utils.leftRightPadString(input, lft, rgt);
            expect(result).to.match(new RegExp("^" + input + "[a-f0-9]{7}$"));
            expect(result.length).to.be.equal(input.length + lft + rgt);
        });
        it("should pad string only on both sides", function () {
            var input = Utils.getGibberish(32, 128, {"special": false, "extendedUpper": false, "extendedLower": false});
            var lft = 7;
            var rgt = 7;
            var result = Utils.leftRightPadString(input, lft, rgt);
            expect(result).to.match(new RegExp("^[a-f0-9]{7}" + input + "[a-f0-9]{7}$"));
            expect(result.length).to.be.equal(input.length + lft + rgt);
        });
    });

    describe("#leftRightTrimString", function () {
        it("should trim string only from the left", function () {
            var input = "abcdefghijklmnopqrstuvwxyz";
            var lft = 7;
            var rgt = 0;
            var expected = "hijklmnopqrstuvwxyz";
            var result = Utils.leftRightTrimString(input, lft, rgt);
            expect(result).to.be.equal(expected);
            expect(result.length).to.be.equal(input.length - lft - rgt);
        });
        it("should trim string only from the right", function () {
            var input = "abcdefghijklmnopqrstuvwxyz";
            var lft = 0;
            var rgt = 7;
            var expected = "abcdefghijklmnopqrs";
            var result = Utils.leftRightTrimString(input, lft, rgt);
            expect(result).to.be.equal(expected);
            expect(result.length).to.be.equal(input.length - lft - rgt);
        });
        it("should trim string on both sides", function () {
            var input = "abcdefghijklmnopqrstuvwxyz";
            var lft = 7;
            var rgt = 7;
            var expected = "hijklmnopqrs";
            var result = Utils.leftRightTrimString(input, lft, rgt);
            expect(result).to.be.equal(expected);
            expect(result.length).to.be.equal(input.length - lft - rgt);
        });
    });

    describe("#getRandomNumberInRange()", function () {
        it("should return a random number in range", function () {
            var max = 2 + Math.round(Math.random() * 128);
            var min = Math.round(max / 2);
            var result = Utils.getRandomNumberInRange(min, max);
            expect(result).to.be.a("number");
            expect(result).to.be.at.least(min);
            expect(result).to.be.at.most(max);
        });
        it("should return an exact number if min === max", function () {
            var max = 2 + Math.round(Math.random() * 128);
            var min = max;
            var result = Utils.getRandomNumberInRange(min, max);
            expect(result).to.be.a("number");
            expect(result).to.be.equal(min);
            expect(result).to.be.equal(max);
        });
    });

    describe("#log", function () {
        var hook;
        beforeEach(function () {
            hook = Helper.captureStream(process.stdout);
        });
        afterEach(function () {
            hook.unhook();
        });
        it("should log to console if enabled", function () {
            var cfg = {
                "main": {
                    "log_to_console": true
                }
            };
            Configuration.setConfiguration(cfg);
            var message = "Say Cheese!";
            Utils.log(message);
            expect(hook.captured()).to.be.equal(message + "\n");
        });
        it("should not log to console if disabled", function () {
            var cfg = {
                "main": {
                    "log_to_console": false
                }
            };
            Configuration.setConfiguration(cfg);
            var message = "Say Salami!";
            Utils.log(message);
            expect(hook.captured()).to.be.empty;
        });
    });
});