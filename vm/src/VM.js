/**
 * @fileOverview Lua virtual machine class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
 */

var shine = shine || {};



/**
 * A Lua virtual machine.
 * @constructor
 * @extends shine.EventEmitter
 * @param {object} env Object containing global variables and methods from the host.
 */
shine.VM = function (env) {
	shine.EventEmitter.call(this);
	
	this._files = [];
	this._env = env || {};
	this._coroutineStack = [];
	
	this._resetGlobals();
};

shine.VM.prototype = new shine.EventEmitter ();
shine.VM.prototype.constructor = shine.VM;



	
/**
 * Resets all global variables to their original values.
 */
shine.VM.prototype._resetGlobals = function () {
	this._globals = this._bindLib(shine.lib);

	// Load standard lib into package.loaded:
	for (var i in this._globals) if (this._globals.hasOwnProperty(i) && this._globals[i] instanceof shine.Table) this._globals['package'].loaded[i] = this._globals[i];
	this._globals['package'].loaded._G = this._globals;

	// Load environment vars
	for (var i in this._env) if (this._env.hasOwnProperty(i)) this._globals[i] = this._env[i];
};




/**
 * Returns a copy of an object, with all functions bound to the VM. (recursive)
 */
shine.VM.prototype._bindLib = function (lib) {
	var result = shine.gc.createObject();

	for (var i in lib) {
		if (lib.hasOwnProperty(i)) {
			if (lib[i] && lib[i].constructor === Object) {
				result[i] = this._bindLib(lib[i]);

			} else if (typeof lib[i] == 'function') {
				result[i] = (function (func, context) {
					return function () { return func.apply(context, arguments); };
				})(lib[i], this);

			} else {
				result[i] = lib[i];
			}
		}
	}

	return new shine.Table(result);
};




/**
 * Loads a file containing compiled Luac code, decompiled to JSON.
 * @param {string} url The url of the file to load.
 * @param {boolean} [execute = true] Whether or not to execute the file once loaded.
 * @param {object} [coConfig] Coroutine configuration. Only applicable if execute == true.
 */
shine.VM.prototype.load = function (url, execute, coConfig) {
	var me = this,
		file;

	switch (typeof url) {

		case 'string':
			file = new shine.File(url);
			
			this._files.push(file);

			file.bind('loaded', function (data) {
				me._trigger('loaded-file', file);
				if (execute || execute === undefined) me.execute(coConfig, file);
			});

			this._trigger('loading-file', file);
			file.load();

			break;


		case 'object':
			file = new shine.File();
			file.data = url;
			if (execute || execute === undefined) me.execute(coConfig, file);

			break


		default: 
			console.warn('Object of unknown type passed to shine.VM.load()');
	}

};




/**
 * Executes the loaded Luac data.
 * @param {object} [coConfig] Coroutine configuration.
 * @param {shine.File} [file] A specific file to execute. If not present, executes all files in the order loaded.
 */
shine.VM.prototype.execute = function (coConfig, file) {
	var me = this,
		files = file? [file] : this._files,
		index,
		file,
		thread;


	if (!files.length) throw new Error ('No files loaded.'); 
	
	for (index in files) {
		if (files.hasOwnProperty(index)) {

			file = files[index];		
			if (!file.data) throw new Error('Tried to execute file before data loaded.');
		
		
			thread = this._thread = new shine.Function(this, file, file.data, this._globals);
			this._trigger('executing', [thread, coConfig]);
			
			try {
				if (!coConfig) {
					thread.call ();
					
				} else {
					var co = shine.lib.coroutine.wrap(thread),
						resume = function () {
							co();
							if (coConfig.uiOnly && co._coroutine.status != 'dead') window.setTimeout(resume, 1);
						};
		
					resume();
				}
				
			} catch (e) {
				shine.Error.catchExecutionError(e);
			}
		}
	}
};




/**
 * Creates or updates a global in the guest environment.
 * @param {String} name Name of the global variable.
 * @param {Object} value Value.
 */
shine.VM.prototype.setGlobal = function (name, value) {
	this._globals[name] = value;
};




/**
 * Retrieves a global from the guest environment.
 * @param {String} name Name of the global variable.
 * @returns {Object} Value of the global variable.
 */
shine.VM.prototype.getGlobal = function (name) {
	return this._globals[name];
};




/**
 * Dumps memory associated with the VM.
 */
shine.VM.prototype.dispose = function () {
	var thread;

	for (var i in this._files) if (this._files.hasOwnProperty(i)) this._files[i].dispose();

	if (thread = this._thread) thread.dispose();

	delete this._files;
	delete this._thread;
	delete this._globals;
	delete this._env;
	delete this._coroutineStack;


	// Clear static stacks -- Very dangerous for environments that contain multiple VMs!
	while (shine.Function._instances.length) shine.Function._instances.dispose(true);
	shine.Closure._graveyard.splice(0, shine.Closure._graveyard.length);
	shine.Coroutine._graveyard.splice(0, shine.Coroutine._graveyard.length);

};
