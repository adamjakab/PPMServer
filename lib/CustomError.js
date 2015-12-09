/**
 * CustomError
 * This CustomError will be used throughout the entire application.
 * Before returning a response to the client, the errorNumber parameter will be
 * checked and will be used as the http response statusCode.
 *
 * @param {String} message
 * @param {Number} [errorNumber]
 * @constructor
 */
function CustomError(message, errorNumber) {
    this.name = 'CustomError';
    this.message = message || 'Default Message';
    this.errorNumber = errorNumber || 500;
}

//inherit from Error
CustomError.prototype = new Error();
CustomError.prototype.constructor = CustomError;

module.exports = CustomError;