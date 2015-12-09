/**
 * Created by jackisback on 05/12/15.
 */
var expect = require("chai").expect;
/** @type Configuration */
var Configuration = require("../../../lib/Configuration.js");

describe("Configuration", function () {

    describe("#by default", function () {
        it("should have an empty config file", function () {
            var result = Configuration.getConfigurationFile();
            expect(result).to.be.equal(undefined);
        });
    });

});