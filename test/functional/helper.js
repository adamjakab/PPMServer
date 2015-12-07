/**
 * Created by jackisback on 07/12/15.
 */
var path = require('path');
var sleep = require('sleep');
var exec = require('child_process').exec;
var syncRequest = require("sync-request");
var config = require("../../configuration.json");

function Helper() {
    var serverProcess;
    var projectPath = path.resolve(__dirname, "../../");
    var indexJs = path.resolve(projectPath, "index.js");
    var command = 'node ' + indexJs;
    var cmdOpts = {
        cwd: projectPath
    };

    /**
     * @param {boolean} waitForReady
     * @return {*}
     */
    this.startServer = function (waitForReady) {
        serverProcess = exec(command, cmdOpts);
        if (waitForReady) {
            waitForResponsiveServer();
        }
    };

    /**
     * Wait until server becomes responsive
     */
    var waitForResponsiveServer = function () {
        var address = config.server.ip;
        address = (address ? address : "127.0.0.1");
        var port = config.server.port;
        var maxAttempts = 25;
        while (true) {
            maxAttempts--;
            var res = false;
            try {
                res = syncRequest("POST", 'http://' + address + ":" + port);
            } catch (e) {
                /**/
            }
            if (res || maxAttempts == 0) {
                break;
            }
            sleep.usleep(250);
        }
    };

    /**
     *
     * @param {string} signal
     */
    this.killServer = function (signal) {
        signal = signal || "SIGTERM";
        serverProcess.kill(signal);
        serverProcess = null;
    };

    /**
     * @return {*}
     */
    this.getServerProcess = function () {
        return serverProcess;
    };


}
module.exports = new Helper();