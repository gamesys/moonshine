/**
 * @fileOverview File class.
 * @author <a href="http://paulcuth.me.uk">Paul Cuthbertson</a>
 */

var luajs = luajs || {};



/**
 * Represents a Luac data file.
 * @constructor
 * @extends luajs.EventEmitter
 * @param {string} url Address of the decompiled Luac file.
 */
luajs.File = function (url) {
	luajs.EventEmitter.call (this);

	this._url = url;
	this.data = undefined;
};


luajs.File.prototype = new luajs.EventEmitter ();
luajs.File.prototype.constructor = luajs.File;




/**
 * Retrieves the Luac file from the url.
 */
luajs.File.prototype.load = function () {
	var me = this;

	function success (data) {
		me.data = JSON.parse(data);
		me._trigger ('loaded', me.data);
	}

	function error (code) {
		//throw new luajs.Error('Unable to load file: ' + me._url + ' (' + code + ')');
		me._trigger ('error', code);
	}
	
	luajs.utils.get(this._url, success, error);
};




/**
 * Retrieved the corresponding Lua file, if exists.
 * @todo
 */
luajs.File.prototype.loadLua = function () {
};




/**
 * Dump memory associated with file.
 */
luajs.File.prototype.dispose = function () {
	delete this._url;
	delete this.data;
};

