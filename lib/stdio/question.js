'use strict';

/**     _      _ _
 *  ___| |_ __| (_) ___
 * / __| __/ _` | |/ _ \
 * \__ \ || (_| | | (_) |
 * |___/\__\__,_|_|\___/
 *
 * Standard input/output management for NodeJS
 *
 * Copyright (c) 2013- Sergio García <sgmonda@gmail.com>
 * Distributed under MIT License
 *
 * This is a modified version of the original stdio/lib/question.js
 * until we cannot create PR for original library
 * Mods: adding "predefined answer" option
 **/

var MAX_PROMPT_TRIES = 3;

/**
 * Shows a prompt question, letting the user to answer it.
 * @param {object}   _args  {"question","answer","options",...}
 * @param {function} callback Function to call with the results: function (err, answer) {...}
 **/
function askQuestion(_args, callback) {
    if (!_args.question) {
        throw new Error("No question to be asked!");
    }
    var question = _args.question;
    var answer = _args.answer || "";
    var options = _args.options || null;

    if (options && (!Array.isArray(options) || options.length < 2)) {
        throw new Error('Stdio prompt question is malformed. Provided options must be an array with two options at least.');
    }

    /**
     * Prints the question
     **/
    var performQuestion = function () {
        var str = question;
        if (options) {
            str += ' [' + options.join('/') + ']';
        }
        if (answer) {
            str += ' [' + answer + ']';
        }
        str += ': ';
        process.stdout.write(str);
    };

    var tries = MAX_PROMPT_TRIES;

    process.stdin.resume();

    var listener = function (data) {

        var response = data.toString().toLowerCase().trim();
        response = response || answer;
        console.log("A: '" + response + "'");

        if (options && options.indexOf(response) === -1) {
            console.log('Unexpected answer. %d retries left.', tries - 1);
            tries--;
            if (tries === 0) {
                process.stdin.removeListener('data', listener);
                process.stdin.pause();
                callback('Retries spent');
            } else {
                performQuestion();
            }
            return;
        }
        process.stdin.removeListener('data', listener);
        process.stdin.pause();
        callback(false, response);
    };

    process.stdin.addListener('data', listener);
    performQuestion();
}

// Exports
module.exports.question = askQuestion;
