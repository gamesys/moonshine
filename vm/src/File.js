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
	
	// TODO: Remove dependency on jQuery here!
	jQuery.get (this._url, function (data) { 
		me.data = JSON.parse (data);
		me._trigger ('loaded', data);
	});
};




/**
 * Retrieved the corresponding Lua file, if exists.
 * @todo
 */
luajs.File.prototype.loadLua = function () {
};

