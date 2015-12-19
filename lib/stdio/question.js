'use strict';

var Promise = require("../../node_modules/bluebird/js/browser/bluebird.min")
    , _ = require("underscore")
    ;

/**     _      _ _
 *  ___| |_ __| (_) ___
 * / __| __/ _` | |/ _ \
 * \__ \ || (_| | | (_) |
 * |___/\__\__,_|_|\___/modded
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
 * @param {{question,answer,options,retries}}   opts
 * @return Promise
 **/
function askQuestion(opts) {
    return new Promise(function (fulfill, reject) {
        if (!_.isObject(opts)) {
            reject(new Error("Argument is not an object!"));
        }
        if (_.isUndefined(opts.question)) {
            reject(new Error("No question to be asked!"));
        }
        if (opts.hasOwnProperty(opts.options) && (!_.isArray(opts.options) || opts.options.length < 2)) {
            reject(new Error("Provided options must be an array with at least two options!"));
        }

        var question = opts.question;
        var answer = opts.answer || "";
        var options = opts.options || null;
        var maxRetries = opts.retries || MAX_PROMPT_TRIES;

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

        /**
         * Listen to user input
         * @param data
         */
        var listener = function (data) {
            var response = data.toString().trim();//why toLowerCase()?
            response = response || answer;
            console.log("A: '" + response + "'");

            if (options && options.indexOf(response) === -1) {
                console.log('Unexpected answer. %d retries left.', maxRetries - 1);
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
            fulfill(response);
        };

        process.stdin.resume();
        process.stdin.addListener('data', listener);
        performQuestion();
    });
}

//Exports
module.exports.question = askQuestion;
