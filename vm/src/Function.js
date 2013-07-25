/**
 * @fileOverview Function definition class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
*/

var luajs = luajs || {};

/**
 * Represents a function definition.
 * @constructor
 * @extends luajs.EventEmitter
 * @param {luajs.File} file The file in which the function is declared.
 * @param {object} data Object containing the Luac data for the function.
 * @param {object} globals The global variables for the environment in which the function is declared.
 * @param {object} [upvalues] The upvalues passed from the parent closure.
 */
luajs.Function = function (vm, file, data, globals, upvalues) {
	luajs.EventEmitter.call (this);

	this._vm = vm;
	this._file = file;
	this._data = data;
	this._globals = globals;
	this._upvalues = upvalues || {};
	this._index = luajs.Function._index++;
	this.instances = [];
	this._retainCount = 0;

	this.constructor._instances.push(this);
};


luajs.Function.prototype = new luajs.EventEmitter ();
luajs.Function.prototype.constructor = luajs.Function;


/**
 * Keeps a count of the number of functions created, in order to index them uniquely.
 * @type Number
 * @static
 */
luajs.Function._index = 0;




/**
 * Keeps track of active functions in order to clean up on dispose.
 * @type Array
 * @static
 */
luajs.Function._instances = [];




/**
 * Creates a new function instance from the definition.
 * @returns {luajs.Closure} An instance of the function definition.
 */
luajs.Function.prototype.getInstance = function () {
	return luajs.Closure.create (this._vm, this._file, this._data, this._globals, this._upvalues); //new luajs.Closure (this._vm, this._file, this._data, this._globals, this._upvalues);
};




/**
 * Calls the function, implicitly creating a new instance and passing on the arguments provided.
 * @returns {Array} Array of the return values from the call.
 */
luajs.Function.prototype.call = function () {
	var args = [],
		l = arguments.length,
		i;
		
	for (i = 1; i < l; i++) args.push (arguments[i]);
	return this.apply (args);
};




/**
 * Calls the function, implicitly creating a new instance and using items of an array as arguments.
 * @param {object} [obj = {}] The object on which to apply the function. Included for compatibility with JavaScript's Function.apply().
 * @param {Array} args Array containing arguments to use.
 * @returns {Array} Array of the return values from the call.
 */
luajs.Function.prototype.apply = function (obj, args, internal) {
	if ((obj || {}) instanceof Array && !args) {
		args = obj;
		obj = undefined;
	}

	var func = internal? this.getInstance () : luajs.lib.coroutine.wrap (this);
	
	try {
		return func.apply (obj, args);
//		return this.getInstance ().apply (obj, args);

	} catch (e) {
		luajs.Error.catchExecutionError (e);
	}
};




/**
 * Creates a unique description of the function.
 * @returns {string} Description.
 */
luajs.Function.prototype.toString = function () {
	return 'function: 0x' + this._index.toString (16);
};




/**
 * Saves this function from disposal.
 */
luajs.Function.prototype.retain = function () {
	this._retainCount++;
};




/**
 * Releases this function to be disposed.
 */
luajs.Function.prototype.release = function () {
	if (!--this._retainCount && this._readyToDispose) this.dispose();
};




/**
 * Test if the function has been marked as retained.
 * @returns {boolean} Whether or not the function is marked as retained.
 */
luajs.Function.prototype.isRetained = function () {
	if (this._retainCount) return true;
	
	for (var i in this.instances) {
		if (this.instances[i].hasRetainedScope()) return true;
	}
	
	return false;
};




/**
 * Dump memory associated with function.
 */
luajs.Function.prototype.dispose = function (force) {
	this._readyToDispose = true;
	
	if (force) {
		for (var i in this.instances) this.instances[i].dispose(true);
		
	} else if (this.isRetained()) {
		return false;
	}

	delete this._vm;
	delete this._file;
	delete this._data;
	delete this._globals;
	delete this._upvalues;
	delete this._listeners;
	delete this.instances;	
	delete this._readyToDispose;
	
	this.constructor._instances.splice (this.constructor._instances.indexOf(this), 1);
	
	return true;
};




