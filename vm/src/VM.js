/**
 * @fileOverview Lua virtual machine class.
 * @author <a href="http://paulcuth.me.uk">Paul Cuthbertson</a>
 */

var luajs = luajs || {};



/**
 * A Lua virtual machine.
 * @constructor
 * @extends luajs.EventEmitter
 * @param {object} env Object containing global variables and methods from the host.
 */
luajs.VM = function (env) {
	luajs.EventEmitter.call (this);
	
	this._files = [];
	this._env = env || {};
	this._coroutineStack = [];
	
	this._resetGlobals ();
};

luajs.VM.prototype = new luajs.EventEmitter ();
luajs.VM.prototype.constructor = luajs.VM;



	
/**
 * Resets all global variables to their original values.
 */
luajs.VM.prototype._resetGlobals = function () {
	this._globals = {};
	for (var i in luajs.lib) this._globals[i] = luajs.lib[i];
	for (var i in this._env) this._globals[i] = this._env[i];
};




/**
 * Loads a file containing compiled Luac code, decompiled to JSON.
 * @param {string} url The url of the file to load.
 * @param {boolean} [execute = true] Whether or not to execute the file once loaded.
 * @param {boolean} [asCoroutine] Whether or not to run the file as a coroutine. Only applicable if execute == true.
 */
luajs.VM.prototype.load = function (url, execute, asCoroutine) {
	var me = this,
		file = new luajs.File (url);
	
	this._files.push (file);

	file.bind ('loaded', function (data) {
		me._trigger ('loaded-file', file);
		if (execute || execute === undefined) me.execute (asCoroutine, file);
	});

	this._trigger ('loading-file', file);
	file.load ();	
};




/**
 * Executes the loaded Luac data.
 * @param {boolean} [asCoroutine] Whether or not to run as a coroutine.
 * @param {luajs.File} [file] A specific file to execute. If not present, executes all files in the order loaded.
 */
luajs.VM.prototype.execute = function (asCoroutine, file) {
	var files = file? [file] : this._files,
		index,
		file;
		
	if (!files.length) throw new Error ('No files loaded.'); 
	
	for (index in files) {
		file = files[index];		
		if (!file.data) throw new Error ('Tried to execute file before data loaded.');
	
	
		this._thread = new luajs.Function (this, file, file.data, this._globals);	
		this._trigger ('executing', [this._thread, asCoroutine]);
		
		try {
			if (!asCoroutine) {
				this._thread.call ();
				
			} else {
				var co = luajs.lib.coroutine.wrap (this._thread),
					resume = function () {
						co ();
						if (co._coroutine.status != 'dead') window.setTimeout (resume, 1);
					};
	
				resume ();
			}
			
		} catch (e) {
			luajs.Error.catchExecutionError (e);
		}
	}
};




/**
 * Creates or updates a global object in the guest environment.
 * @param {string} name Name of the global variable.
 * @param {object} value Value.
 */
luajs.VM.prototype.setGlobal = function (name, value) {
	this._globals[name] = value;
};



