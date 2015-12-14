/**
 * Created by jackisback on 05/12/15.
 */
var fs = require("fs");
var expect = require("chai").expect;
var path = require("path");
/** @type Configuration */
var Configuration = require("../../../lib/Configuration");
var CustomError = require("../../../lib/CustomError");

describe("Configuration", function () {

    describe("#config setter", function () {
        it("should throw error on inaccessible file", function () {
            var fn = Configuration.setConfiguration;
            var cfg = "I am not an object ;)";
            expect(fn.bind(fn, cfg)).to.throw(CustomError, /must be an object/);
        });
    });


    describe("#config getter", function () {
        before(function () {
            var configFile = path.resolve("test/unit/resources/test_config.json");
            var configStr = fs.readFileSync(configFile, 'utf8');
            var configObject = JSON.parse(configStr);
            Configuration.setConfiguration(configObject);
        });

        describe("#inexistent elements", function () {
            it("should throw error #1", function () {
                var fn = Configuration.get;
                expect(fn.bind(fn, "inexistent")).to.throw(CustomError);
            });
            it("should throw error #2", function () {
                var fn = Configuration.get;
                expect(fn.bind(fn, "level1.inexistent")).to.throw(CustomError);
            });
            it("should throw error #2", function () {
                var fn = Configuration.get;
                expect(fn.bind(fn, "level1.level2.inexistent")).to.throw(CustomError);
            });
        });

        describe("#root level elements", function () {
            it("should return: string", function () {
                var result;
                var expected_type = "string";
                var expected_value = "This is my Test Sting";
                /* Key in string format*/
                result = Configuration.get("test_string");
                expect(result).to.be.a(expected_type);
                expect(result).to.be.equal(expected_value);
                /* Key in array format*/
                result = Configuration.get(["test_string"]);
                expect(result).to.be.a(expected_type);
                expect(result).to.be.equal(expected_value);
            });

            it("should return: number", function () {
                var result;
                var expected_type = "number";
                var expected_value = 1974;
                /* Key in string format*/
                result = Configuration.get("test_number");
                expect(result).to.be.a(expected_type);
                expect(result).to.be.equal(expected_value);
                /* Key in array format*/
                result = Configuration.get(["test_number"]);
                expect(result).to.be.a(expected_type);
                expect(result).to.be.equal(expected_value);
            });

            it("should return: array", function () {
                var result;
                var expected_type = "array";
                var expected_value = ["x", "y", "z"];
                /* Key in string format*/
                result = Configuration.get("test_array");
                expect(result).to.be.an(expected_type);
                expect(result).to.be.deep.equal(expected_value);
                /* Key in array format*/
                result = Configuration.get(["test_array"]);
                expect(result).to.be.a(expected_type);
                expect(result).to.be.deep.equal(expected_value);
            });

            it("should return: object", function () {
                var result;
                var expected_type = "object";
                var expected_value = {"x": "x", "y": "y", "z": "z"};
                /* Key in string format*/
                result = Configuration.get("test_object");
                expect(result).to.be.an(expected_type);
                expect(result).to.be.deep.equal(expected_value);
                /* Key in array format*/
                result = Configuration.get(["test_object"]);
                expect(result).to.be.a(expected_type);
                expect(result).to.be.deep.equal(expected_value);
            });

            it("should return: object from array", function () {
                var result;
                var expected_type = "object";
                var expected_value = {"x": "x"};
                /* Key in string format*/
                result = Configuration.get("test_array_of_objects.0");
                expect(result).to.be.an(expected_type);
                expect(result).to.be.deep.equal(expected_value);
                /* Key in array format*/
                result = Configuration.get(["test_array_of_objects", 0]);
                expect(result).to.be.a(expected_type);
                expect(result).to.be.deep.equal(expected_value);
            });
        });

        describe("#level 1 elements", function () {
            it("should return: string", function () {
                var result;
                var expected_type = "string";
                var expected_value = "This is my Test Sting";
                /* Key in string format*/
                result = Configuration.get("level1.test_string");
                expect(result).to.be.a(expected_type);
                expect(result).to.be.equal(expected_value);
                /* Key in array format*/
                result = Configuration.get(["level1", "test_string"]);
                expect(result).to.be.a(expected_type);
                expect(result).to.be.equal(expected_value);
            });

            it("should return: number", function () {
                var result;
                var expected_type = "number";
                var expected_value = 1974;
                /* Key in string format*/
                result = Configuration.get("level1.test_number");
                expect(result).to.be.a(expected_type);
                expect(result).to.be.equal(expected_value);
                /* Key in array format*/
                result = Configuration.get(["level1", "test_number"]);
                expect(result).to.be.a(expected_type);
                expect(result).to.be.equal(expected_value);
            });

            it("should return: array", function () {
                var result;
                var expected_type = "array";
                var expected_value = ["x", "y", "z"];
                /* Key in string format*/
                result = Configuration.get("level1.test_array");
                expect(result).to.be.an(expected_type);
                expect(result).to.be.deep.equal(expected_value);
                /* Key in array format*/
                result = Configuration.get(["level1", "test_array"]);
                expect(result).to.be.a(expected_type);
                expect(result).to.be.deep.equal(expected_value);
            });

            it("should return: object", function () {
                var result;
                var expected_type = "object";
                var expected_value = {"x": "x", "y": "y", "z": "z"};
                /* Key in string format*/
                result = Configuration.get("level1.test_object");
                expect(result).to.be.an(expected_type);
                expect(result).to.be.deep.equal(expected_value);
                /* Key in array format*/
                result = Configuration.get(["level1", "test_object"]);
                expect(result).to.be.a(expected_type);
                expect(result).to.be.deep.equal(expected_value);
            });

            it("should return: object from array", function () {
                var result;
                var expected_type = "object";
                var expected_value = {"x": "x"};
                /* Key in string format*/
                result = Configuration.get("level1.test_array_of_objects.0");
                expect(result).to.be.an(expected_type);
                expect(result).to.be.deep.equal(expected_value);
                /* Key in array format*/
                result = Configuration.get(["level1", "test_array_of_objects", 0]);
                expect(result).to.be.a(expected_type);
                expect(result).to.be.deep.equal(expected_value);
            });
        });

        describe("#level 2 elements", function () {
            it("should return: string", function () {
                var result;
                var expected_type = "string";
                var expected_value = "This is my Test Sting";
                /* Key in string format*/
                result = Configuration.get("level1.level2.test_string");
                expect(result).to.be.a(expected_type);
                expect(result).to.be.equal(expected_value);
                /* Key in array format*/
                result = Configuration.get(["level1", "level2", "test_string"]);
                expect(result).to.be.a(expected_type);
                expect(result).to.be.equal(expected_value);
            });

            it("should return: number", function () {
                var result;
                var expected_type = "number";
                var expected_value = 1974;
                /* Key in string format*/
                result = Configuration.get("level1.level2.test_number");
                expect(result).to.be.a(expected_type);
                expect(result).to.be.equal(expected_value);
                /* Key in array format*/
                result = Configuration.get(["level1", "level2", "test_number"]);
                expect(result).to.be.a(expected_type);
                expect(result).to.be.equal(expected_value);
            });

            it("should return: array", function () {
                var result;
                var expected_type = "array";
                var expected_value = ["x", "y", "z"];
                /* Key in string format*/
                result = Configuration.get("level1.level2.test_array");
                expect(result).to.be.an(expected_type);
                expect(result).to.be.deep.equal(expected_value);
                /* Key in array format*/
                result = Configuration.get(["level1", "level2", "test_array"]);
                expect(result).to.be.a(expected_type);
                expect(result).to.be.deep.equal(expected_value);
            });

            it("should return: object", function () {
                var result;
                var expected_type = "object";
                var expected_value = {"x": "x", "y": "y", "z": "z"};
                /* Key in string format*/
                result = Configuration.get("level1.level2.test_object");
                expect(result).to.be.an(expected_type);
                expect(result).to.be.deep.equal(expected_value);
                /* Key in array format*/
                result = Configuration.get(["level1", "level2", "test_object"]);
                expect(result).to.be.a(expected_type);
                expect(result).to.be.deep.equal(expected_value);
            });

            it("should return: object from array", function () {
                var result;
                var expected_type = "object";
                var expected_value = {"x": "x"};
                /* Key in string format*/
                result = Configuration.get("level1.level2.test_array_of_objects.0");
                expect(result).to.be.an(expected_type);
                expect(result).to.be.deep.equal(expected_value);
                /* Key in array format*/
                result = Configuration.get(["level1", "level2", "test_array_of_objects", 0]);
                expect(result).to.be.a(expected_type);
                expect(result).to.be.deep.equal(expected_value);
            });
        });

    });
});