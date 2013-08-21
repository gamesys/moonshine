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

	this._url = url;
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
		me.data = JSON.parse(data);
		me._trigger('loaded', me.data);
	}

	function error (code) {
		me._trigger('error', code);
	}
	
	shine.utils.get(this._url, success, error);
};




/**
 * Retrieved the corresponding Lua file, if exists.
 * @todo
 */
shine.File.prototype.loadLua = function () {
};




/**
 * Dump memory associated with file.
 */
shine.File.prototype.dispose = function () {
	delete this._url;
	delete this.data;
};

