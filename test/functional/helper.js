/**
 * Created by jackisback on 07/12/15.
 */
var path = require('path')
    , sleep = require('sleep')
    , exec = require('child_process').exec
    , syncRequest = require("sync-request")
    , config = require("./resources/ppm.json")
    ;

function Helper() {
    var serverProcess;
    var projectPath = path.resolve(__dirname, "../../");
    var ppmServerJs = path.resolve(projectPath, "ppm_server.js");
    var ppmTestConfigPath = path.resolve(projectPath, "test/functional/resources/ppm.json");
    var command = 'node ' + ppmServerJs + " -c " + ppmTestConfigPath;
    var cmdOpts = {
        cwd: projectPath
    };

    /**
     * @param {boolean} waitForReady
     * @return {*}
     */
    this.startServer = function (waitForReady) {
        serverProcess = exec(command, cmdOpts, function (error, stdout, stderr) {
            console.log("SRV: " + stdout);
        });
        if (waitForReady) {
            waitForResponsiveServer();
        }
    };

    /**
     * Wait until server becomes responsive
     */
    var waitForResponsiveServer = function () {
        var address = config.server.ip | "127.0.0.1";
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