/**
 * @fileOverview File class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
 */

var shine = shine || {};



/**
 * Represents a Luac data file.
 * @constructor
 * @extends shine.EventEmitter
 * @param {string} url Address of the decompiled Luac file.
 */
shine.File = function (url) {
	shine.EventEmitter.call(this);

	this.url = url;
	this.data = undefined;
};


shine.File.prototype = new shine.EventEmitter();
shine.File.prototype.constructor = shine.File;




/**
 * Retrieves the Luac file from the url.
 */
shine.File.prototype.load = function () {
	var me = this;

	function success (data) {
		me._onSuccess(data);
	}

	function error (code) {
		me._onError(code);
	}

	shine.utils.get(this.url, success, error);
};




/**
 * Handles a successful response from the server.
 * @param {String} data Response.
 */
shine.File.prototype._onSuccess = function (data) {
	this.data = JSON.parse(data);
	this._trigger('loaded', data);
};




/**
 * Handles an unsuccessful response from the server.
 * @param {Number} code HTTP resonse code.
 */
shine.File.prototype._onError = function (code) {
	this._trigger('error', code);
};




/**
 * Dump memory associated with file.
 */
shine.File.prototype.dispose = function () {
	delete this.url;
	delete this.data;
};

