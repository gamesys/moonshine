/**
 * @fileOverview Error class.
 * @author <a href="http://paulcuth.me.uk">Paul Cuthbertson</a>
 */

var luajs = luajs || {};



/**
 * An error that occurs in the Lua code.
 * @constructor
 * @param {string} message Error message.
 */
luajs.Error = function (message) {
	//Error.call (this, message); //AS3 no likey
	this.message = message;
};


luajs.Error.prototype = new Error ();

luajs.Error.catchExecutionError = function (e) {
	if ((e || {}) instanceof luajs.Error && console) throw new Error ('[luajs] ' + e.message + '\n    ' + (e.luaStack || []).join ('\n    '));
	throw e;
};




/**
 * Coerces the error to a string for logging.
 * @return {string} message Error message.
 */
luajs.Error.prototype.toString = function () {
	return 'Luajs Error: ' + this.message;
};



