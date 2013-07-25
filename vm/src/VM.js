/**
 * @fileOverview Lua virtual machine class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
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
	this._globals = this._bindLib(luajs.lib);

	// Load standard lib into package.loaded:
	for (var i in this._globals) if (this._globals.hasOwnProperty(i) && this._globals[i] instanceof luajs.Table) this._globals['package'].loaded[i] = this._globals[i];
	this._globals['package'].loaded._G = this._globals;

	// Load environment vars
	for (var i in this._env) if (this._env.hasOwnProperty(i)) this._globals[i] = this._env[i];
};




/**
 * Returns a copy of an object, with all functions bound to the VM. (recursive)
 */
luajs.VM.prototype._bindLib = function (lib) {
	var result = {};

	for (var i in lib) {
		if (lib.hasOwnProperty(i)) {
			if (lib[i] && lib[i].constructor === Object) {
				result[i] = this._bindLib(lib[i]);

			} else if (typeof lib[i] == 'function') {
				result[i] = lib[i].bind(this);

			} else {
				result[i] = lib[i];
			}
		}
	}

	return new luajs.Table(result);
};




/**
 * Loads a file containing compiled Luac code, decompiled to JSON.
 * @param {string} url The url of the file to load.
 * @param {boolean} [execute = true] Whether or not to execute the file once loaded.
 * @param {object} [coConfig] Coroutine configuration. Only applicable if execute == true.
 */
luajs.VM.prototype.load = function (url, execute, coConfig) {
	var me = this,
		file;

	switch (typeof url) {

		case 'string':
			file = new luajs.File (url);
			
			this._files.push (file);

			file.bind ('loaded', function (data) {
				me._trigger ('loaded-file', file);
				if (execute || execute === undefined) me.execute (coConfig, file);
			});

			this._trigger ('loading-file', file);
			file.load ();

			break;


		case 'object':
			file = new luajs.File ();
			file.data = url;
			if (execute || execute === undefined) me.execute (coConfig, file);

			break


		default: 
			console.warn('Object of unknown type passed to luajs.VM.load()');
	}

};




/**
 * Executes the loaded Luac data.
 * @param {object} [coConfig] Coroutine configuration.
 * @param {luajs.File} [file] A specific file to execute. If not present, executes all files in the order loaded.
 */
luajs.VM.prototype.execute = function (coConfig, file) {
	var me = this,
		files = file? [file] : this._files,
		index,
		file;


	if (!files.length) throw new Error ('No files loaded.'); 
	
	for (index in files) {
		if (files.hasOwnProperty(index)) {

			file = files[index];		
			if (!file.data) throw new Error ('Tried to execute file before data loaded.');
		
		
			this._thread = new luajs.Function (this, file, file.data, this._globals);	
			this._trigger ('executing', [this._thread, coConfig]);
			
			try {
				if (!coConfig) {
					this._thread.call ();
					
				} else {
					var co = luajs.lib.coroutine.wrap (this._thread),
						resume = function () {
							co ();
							if (coConfig.uiOnly && co._coroutine.status != 'dead') window.setTimeout (resume, 1);
						};
		
					resume ();
				}
				
			} catch (e) {
				luajs.Error.catchExecutionError (e);
			}
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




/**
 * Dumps memory associated with the VM.
 */
luajs.VM.prototype.dispose = function () {
	var thread;

	for (var i in this._files) if (this._files.hasOwnProperty(i)) this._files[i].dispose ();

	if (thread = this._thread) thread.dispose ();

	delete this._files;
	delete this._thread;
	delete this._globals;
	delete this._env;
	delete this._coroutineStack;


	// Clear static stacks -- Very dangerous for environments that contain multiple VMs!
	while (luajs.Function._instances.length) luajs.Function._instances.pop().dispose(true);
	luajs.Closure._graveyard.splice(0, luajs.Closure._graveyard.length);
	luajs.Coroutine._graveyard.splice(0, luajs.Coroutine._graveyard.length);

};
