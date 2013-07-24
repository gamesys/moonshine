/**
 * @fileOverview Error class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
 */

var luajs = luajs || {};



/**
 * An error that occurs in the Lua code.
 * @constructor
 * @param {string} message Error message.
 */
luajs.Error = function (message) {
	//Error.call (this, message); //AS3 no likey
	//this.message = message;


	// The following is an ugly frigg to overcome Chromium bug: https://code.google.com/p/chromium/issues/detail?id=228909
	var err = new Error(message);

	err.constructor = this.constructor;
	err.__proto__ = this;    
	err.name = 'luajs.Error';

	return err;
};


luajs.Error.prototype = new Error ();
luajs.Error.prototype.constructor = luajs.Error;




/**
 * Handles error reporting in a consistent manner.
 * @static
 * @param {Error|luajs.Error} e Error that was thown.
 */
luajs.Error.catchExecutionError = function (e) {
	if (!e) return;
	//if ((e || {}) instanceof luajs.Error && console) throw new Error ('[luajs] ' + e.message + '\n    ' + (e.luaStack || []).join ('\n    '));
	if (e instanceof luajs.Error) e.message = e.message + '\n    ' + (e.luaStack || []).join('\n    ');
	
	throw e;
};




/**
 * Coerces the error to a string for logging.
 * @return {string} String representation of error.
 */
luajs.Error.prototype.toString = function () {
	return 'Luajs Error: ' + this.message;
};