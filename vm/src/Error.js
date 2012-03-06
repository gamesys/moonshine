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
	Error.call (this, message);
	this.message = message;
};


luajs.Error.prototype = new Error ();




/**
 * Coerces the error to a string for logging.
 * @return {string} message Error message.
 */
luajs.Error.prototype.toString = function () {
	return 'Luajs Error: ' + this.message;
};




// The following may not be needed anymore, since errors are now caught in Function.apply()

//(function () {
//	// Wrap functions passed to setTimeout in order to display formatted debugging.
//	// (Not best practice, but practical in this case)
//	
//	var setTimeout = window.setTimeout;
//	
//	window.setTimeout = function (func, timeout) {
//		return setTimeout (function () {
//			try {
//				func ();
//			} catch (e) {
//				luajs.utils.catchExecutionError (e);
//			}
//		}, timeout);
//	}
//	
//	
//	var setInterval = window.setInterval;
//	
//	window.setInterval = function (func, interval) {
//		return setInterval (function () {
//			try {
//				func ();
//			} catch (e) {
//				luajs.utils.catchExecutionError (e);
//			}
//		}, interval);
//	}
//})();



