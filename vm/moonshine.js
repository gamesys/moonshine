/*
 * Moonshine - a Lua virtual machine.
 *
 * Email: moonshine@gamesys.co.uk
 * http://moonshinejs.org
 *
 * Copyright (c) 2013-2015 Gamesys Limited. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

(function () {
	if (typeof window != 'undefined') {
		var originalValue = window.shine;

		window.shine = {
			noConflict: function () {
				window.shine = originalValue;
				return this;
			}
		};
	}
})();




// vm/src/gc.js:



'use strict';


var shine = shine || {};


(function (shine) {


	/**
	 * Constant empty object for use in comparisons, etc to avoid creating an object needlessly
	 * @type Object
	 * @constant
	 */
	shine.EMPTY_OBJ = {};


	/**
	 * Constant empty array for use in comparisons, etc to avoid creating an object needlessly
	 * @type Object
	 * @constant
	 */
	shine.EMPTY_ARR = [];




	/**
	 * Moonshine GC functions.
	 * @namespace
	 */
	shine.gc = { 


		/**
		 * Collected objects, empty and ready for reuse.
		 * @type Array
		 * @static
		 */
		objects: [],


		/**
		 * Collected objects, empty and ready for reuse.
		 * @type Array
		 * @static
		 */
		arrays: [],


		/**
		 * Number of objects and array that have been collected. Use for debugging.
		 * @type Number
		 * @static
		 */
		collected: 0,


		/**
		 * Number of objects and array that have been reused. Use for debugging.
		 * @type Number
		 * @static
		 */
		reused: 0,




		/**
		 * Prepare an array for reuse.
		 * @param {Array} arr Array to be used.
		 */
		cacheArray: function (arr) {
			arr.length = 0;
			this.arrays.push(arr);
			// this.collected++;
		},




		/**
		 * Prepare an object for reuse.
		 * @param {Object} obj Object to be used.
		 */
		cacheObject: function (obj) {
			for (var i in obj) if (obj.hasOwnProperty(i)) delete obj[i];
			this.objects.push(obj);
			// this.collected++;
		},




		/**
		 * Returns a clean array from the cache or creates a new one if cache is empty.
		 * @returns {Array} An empty array.
		 */
		createArray: function () {
			if (this.arrays.length) this.reused++;
			return this.arrays.pop() || [];
		},




		/**
		 * Returns a clean object from the cache or creates a new one if cache is empty.
		 * @returns {Object} An empty object.
		 */
		createObject: function () { 
			if (this.objects.length) this.reused++;
			return this.objects.pop() || {};
		},




		/**
		 * Reduces the number of references associated with an object by one and collect it if necessary.
		 * @param {Object} Any object.
		 */
		decrRef: function (val) {
			if (!val || !(val instanceof shine.Table) || val.__shine.refCount === undefined) return;
			if (--val.__shine.refCount == 0) this.collect(val);
		},




		/**
		 * Increases the number of references associated with an object by one.
		 * @param {Object} Any object.
		 */
		incrRef: function (val) {
			if (!val || !(val instanceof shine.Table) || val.__shine.refCount === undefined) return;
			val.__shine.refCount++;
		},




		/**
		 * Collect an object.
		 * @param {Object} Any object.
		 */
		collect: function (val) {
			if (val === undefined || val === null) return;
			if (val instanceof Array) return this.cacheArray(val);
			if (typeof val == 'object' && val.constructor == Object) return this.cacheObject(val);

			if (!(val instanceof shine.Table) || val.__shine.refCount === undefined) return;

			var i, l, 
				meta = val.__shine;

			for (i = 0, l = meta.keys.length; i < l; i++) this.decrRef(meta.keys[i]);
			for (i = 0, l = meta.values.length; i < l; i++) this.decrRef(meta.values[i]);
			for (i = 0, l = meta.numValues.length; i < l; i++) this.decrRef(meta.numValues[i]);

			this.cacheArray(meta.keys);
			this.cacheArray(meta.values);

			delete meta.keys;
			delete meta.values;

			this.cacheObject(meta);
			delete val.__shine;

			for (i in val) if (val.hasOwnProperty(i)) this.decrRef(val[i]);
		}


	};




})(shine || {});



// vm/src/EventEmitter.js:



'use strict';


var shine = shine || {};


/**
 * Abstract object that fires events.
 * @constructor
 */
shine.EventEmitter = function () {
	this._listeners = {};
};




/**
 * Triggers an event.
 * @param {string} name Name of the event.
 * @param {Array} [data = []] Array containing any associated data.
 */
shine.EventEmitter.prototype._trigger = function (name, data) {
	var listeners = this._listeners[name],
		result,
		i;
		
	if (!listeners) return;
	if (!((data || shine.EMPTY_OBJ) instanceof Array)) data = [data];
	
	for (i in listeners) {
		if (listeners.hasOwnProperty(i)) {
			result = listeners[i].apply(this, data);
			if (result !== undefined && !result) break;
		}
	}
};




/**
 * Adds an event listener.
 * @param {string} name Name of the event.
 * @param {Function} Callback Listener function.
 */
shine.EventEmitter.prototype.on = function (name, callback) {
	if (!this._listeners[name]) this._listeners[name] = [];
	this._listeners[name].push(callback);
}




/**
 * Removes an event listener.
 * @param {string} name Name of the event.
 * @param {Function} Callback Listener function to be removed.
 */
shine.EventEmitter.prototype.unbind = function (name, callback) {
	for (var i in this._listeners[name]) {
		if (this._listeners[name].hasOwnProperty(i) && this._listeners[name][i] === callback) this._listeners[name].splice(i, 1);
	}
}




if (typeof module == 'object' && module.exports) module.exports.EventEmitter = shine.EventEmitter;





// vm/src/FileManager.js:



'use strict';


var shine = shine || {};


/**
 * Handles loading packages and distilled scripts.
 * @constructor
 * @extends shine.EventEmitter
 */
shine.FileManager = function () {
	shine.EventEmitter.call(this);
	this._cache = {};
};


shine.FileManager.prototype = new shine.EventEmitter();
shine.FileManager.prototype.constructor = shine.FileManager;




/**
 * Loads a file or package.
 * @param {String|Object} url Url of distilled json file or luac byte code file, or the json or byte code itself, or an object tree.
 * @param {Function} callback Load successful callback.
 */
shine.FileManager.prototype.load = function (url, callback) {
	var me = this,
		data;


	function parse (data, url) {
		var tree;

		if (me.constructor._isJson(data)) {
			// JSON
			tree = JSON.parse(data);

		} else if (me.constructor._isLuac(data)) {
			// Raw Lua 5.1 byte code
			tree = me.constructor._parseLuac(data);
		}

		if (tree) {
			window.setTimeout(function () {		// Make sure all calls are async.
				if (url) me._cache[url] = tree;
				me._onSuccess(url || '', tree, callback);
			}, 1);
		}

		return !!tree;
	}


	function success (data) {
		if (!parse(data, url)) throw new Error('File contains non-parsable content: ' + url);
	}


	function error (code) {
		me._onError(code, callback);
	}


	switch (typeof url) {
		case 'string':

			if (!parse(url)) {
				// If not parseable, treat as filename
				if (data = this._cache[url]) {
					window.setTimeout(function () { me._onSuccess(url, data, callback); }, 1);
				} else {
					shine.utils.get(url, success, error);
				}
			}

			break;

	
		case 'object':
			this._onSuccess('', url, callback);
			break;


		default: 
			throw new TypeError('Can\'t load object of unknown type');
	}
};




/**
 * Handles a successful response from the server.
 * @param {String} data Response.
 */
shine.FileManager.prototype._onSuccess = function (url, data, callback) {
	var file, i;

	if (data.format == 'moonshine.package') {
		for (i in data.files) this._cache[i] = data.files[i];
		this._trigger('loaded-package', data);

		if (!(url = data.main)) return;
		if (!(data = data.files[url])) throw new ReferenceError("The package's main reference does not point to a filename within the package");
	}

	file = new shine.File(url, data);
	
	this._onFileLoaded(file, function () {
		callback(null, file);
	});
};




/**
 * Hook called when a distilled file is loaded successfully. Overridden by debug engine.
 * @param {String} data Response.
 */
shine.FileManager.prototype._onFileLoaded = function (file, callback) {
	callback();
};




/**
 * Handles an unsuccessful response from the server. Overridden by debug engine.
 * @param {Number} code HTTP resonse code.
 */
shine.FileManager.prototype._onError = function (code, callback) {
	callback(code);
};




/**
 * Checks if a value represents a JSON string.
 * @param {String} val String to be checked.
 * @returns {Boolean} Is a JSON string?
 */
shine.FileManager._isJson = function (val) {
	return /^({.*}|\[.*\])$/.test(val);
};




/**
 * Checks if a value represents a Lua 5.1 byte code.
 * @param {String} val String to be checked.
 * @returns {Boolean} Is byte code?
 */
shine.FileManager._isLuac = function (val) {
	return val.substr(0, 5) == String.fromCharCode(27, 76, 117, 97, 81);
};




/**
 * Parses a string containing valid Lua 5.1 byte code into a tree.
 * Note: Requires Moonshine Distillery and could return unexpected results if ArrayBuffer is not supported.
 * @param {String} data Byte code string.
 * @returns {Object} Tree repesenting the Lua script.
 * @throws {Error} If Moonshine's distillery is not available.
 */
shine.FileManager._parseLuac = function (data) {
	if (!shine.distillery) throw new Error('Moonshine needs the distillery to parse Lua byte code. Please include "distillery.moonshine.js" in the page.');
	if (!('ArrayBuffer' in window)) console.warn('Browser does not support ArrayBuffers, this could cause unexpected results when loading binary files.');
	return new shine.distillery.Parser().parse(data);
};




/**
 * Dump memory associated with FileManager.
 */
shine.FileManager.prototype.dispose = function () {
	delete this._cache;
};





// vm/src/VM.js:



'use strict';


(function (shine) {


	/**
	 * A Lua virtual machine.
	 * @constructor
	 * @extends shine.EventEmitter
	 * @param {object} env Object containing global variables and methods from the host.
	 */
	shine.VM = function (env) {
		shine.EventEmitter.call(this);
		
		// this._files = [];
		// this._packagedFiles = {};
		this.fileManager = new shine.FileManager();
		this._env = env || {};
		this._coroutineStack = [];

		this._status = shine.RUNNING;
		this._resumeStack = [];
		this._callbackQueue = [];
		this._coroutineStack = [];

		this._resetGlobals();
	};

	shine.VM.prototype = new shine.EventEmitter();
	shine.VM.prototype.constructor = shine.VM;


	shine.RUNNING = 0;
	shine.SUSPENDING = 1;
	shine.SUSPENDED = 2;
	shine.RESUMING = 3;
	shine.DEAD = 4;



		
	/**
	 * Resets all global variables to their original values.
	 */
	shine.VM.prototype._resetGlobals = function () {
		var arg = new shine.Table();
		arg.setMember(-1, 'moonshine');

		this._globals = this._bindLib(shine.lib);
		this._globals.arg = arg;

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

				// if (lib[i] && lib[i].constructor === shine.Table) {
				// 	result[i] = lib[i];//new shine.Table(shine.utils.toObject(lib[i]));

				// } else if (lib[i] && lib[i].constructor === Object) {
				// 	result[i] = this._bindLib(lib[i]);

				// } else if (typeof lib[i] == 'function') {
				// 	result[i] = (function (func, context) {
				// 		return function () { return func.apply(context, arguments); };
				// 	})(lib[i], this);

				// } else {
					result[i] = lib[i];
				// }
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
		var me = this;

		this.fileManager.load(url, function (err, file) {
			if (err) throw new URIError('Failed to load file: ' + url + ' (' + err + ')');

			me._trigger('file-loaded', file);
			if (execute || execute === undefined) me.execute(coConfig, file);
		});
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
						var co = shine.lib.coroutine.wrap.call(this, thread),
							resume = function () {
								co();
								if (coConfig.uiOnly && co._coroutine.status != shine.DEAD) window.setTimeout(resume, 1);
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
	 * Suspends any execution in the VM.
	 */
	shine.VM.prototype.suspend = function () {
		if (this._status !== shine.RUNNING) throw new Error('attempt to suspend a non-running VM');

		var vm = this;

		this._status = shine.SUSPENDING;
		this._resumeVars = undefined;

		window.setTimeout(function () {
			if (vm._status == shine.SUSPENDING) vm._status = shine.SUSPENDED;
		}, 1);
	};




	/**
	 * Resumes execution in the VM from the point at which it was suspended.
	 */
	shine.VM.prototype.resume = function (retvals) {
		if (this._status !== shine.SUSPENDED && this._status !== shine.SUSPENDING) throw new Error('attempt to resume a non-suspended VM');

		if (!arguments.length || retvals !== undefined) retvals = retvals || this._resumeVars;

		if (retvals && !(retvals instanceof Array)) {
			var arr = shine.gc.createArray();
			arr.push(retvals);
			retvals = arr;
		}

		this._status = shine.RESUMING;
		this._resumeVars = retvals;

		var f = this._resumeStack.pop();

		if (f) {
			try {
				if (f instanceof shine.Coroutine) {
					f.resume();
				} else if (f instanceof shine.Closure) {
					f._run();
				} else {
					f();
				}
				
			} catch (e) {
				if (!((e || shine.EMPTY_OBJ) instanceof shine.Error)) {
					var stack = (e.stack || '');

					e = new shine.Error ('Error in host call: ' + e.message);
					e.stack = stack;
					e.luaStack = stack.split ('\n');
				}

				if (!e.luaStack) e.luaStack = shine.gc.createArray();
				e.luaStack.push([f, f._pc - 1]);

				shine.Error.catchExecutionError(e);
			}
		}
	
		if (this._status == shine.RUNNING) {
			while (this._callbackQueue[0]) this._callbackQueue.shift()();
		}
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

		this.fileManager.dispose();
		delete this.fileManager;


		// Clear static stacks -- Very dangerous for environments that contain multiple VMs!
		shine.Closure._graveyard.length = 0;
		shine.Closure._current = undefined;
		shine.Coroutine._graveyard.length = 0;
	};




	/**
	 * Returns a reference to the VM that is currently executing.
	 * @returns {shine.VM} Current VM
	 */
	shine.getCurrentVM = function () {
		var closure;
		return (closure = this.Closure._current) && closure._vm;
	};




})(shine || {});




// vm/src/Register.js:



'use strict';


(function (shine) {


	/**
	 * Represents a register.
	 * @constructor
	 */
	shine.Register = function () {
		this._items = shine.gc.createArray();
	};


	/**
	 * Array of disposed registers, ready to be reused.
	 * @type Array
	 * @static
	 */
	shine.Register._graveyard = [];




	/**
	 * Returns a new, empty register.
	 * @returns {shine.Register} An empty register
	 */
	shine.Register.create = function () {
		var o = shine.Register._graveyard.pop();
		return o || new shine.Register(arguments);
	};




	/**
	 * Returns the number of items in the register.
	 * @returns {Number} Number of items.
	 */
	shine.Register.prototype.getLength = function () {
		return this._items.length;
	};




	/**
	 * Retrieves an item from the register.
	 * @param {Number} index Index of the item.
	 * @returns {Object} Value of the item.
	 */
	shine.Register.prototype.getItem = function (index) {
		return this._items[index];
	};




	/**
	 * Sets the value an item in the register.
	 * @param {Number} index Index of the item.
	 * @param {Object} value Value of the item.
	 */
	shine.Register.prototype.setItem = function (index, value) {
		var item = this._items[index];

		shine.gc.incrRef(value);
		shine.gc.decrRef(item);

		this._items[index] = value;
	};




	/**
	 * Rewrites the values of all the items in the register.
	 * @param {Array} arr The entire register.
	 */
	shine.Register.prototype.set = function (arr) {
		var i, 
			l = Math.max(arr.length, this._items.length);

		for (i = 0; i < l; i++) this.setItem(i, arr[i]);
	};




	/**
	 * Inserts new items at the end of the register.
	 * @param {...Object} One or more items to be inserted.
	 */
	shine.Register.prototype.push = function () {
		this._items.push.apply(this._items, arguments);
	};




	/**
	 * Removes an item from the register.
	 * @param {Number} index Index of the item to remove.
	 */
	shine.Register.prototype.clearItem = function (index) {
		delete this._items[index];
	};




	/**
	 * Splices the register.
	 * @param {Number} index Index of the first item to remove.
	 * @param {Number} length Number of items to remove.
	 * @param {...Object} One or more items to be inserted.
	 */
	shine.Register.prototype.splice = function (index, length) {
		this._items.splice.apply(this._items, arguments);
	};




	/**
	 * Empties the register.
	 */
	shine.Register.prototype.reset = function () {
		for (var i = 0, l = this._items.length; i < l; i++) shine.gc.decrRef(this._items[i]);
		this._items.length = 0;
	};




	/**
	 * Cleans up the register and caches it for reuse.
	 */
	shine.Register.prototype.dispose = function () {
		this._items.reset();
		this.constructor._graveyard.push(this);
	};


})(shine || {});



// vm/src/Closure.js:



'use strict';


var shine = shine || {};


/**
 * Represents an instance of a function and its related closure.
 * @constructor
 * @extends shine.EventEmitter
 * @param {shine.File} file The file in which the function is declared.
 * @param {object} data Object containing the Luac data for the function.
 * @param {object} globals The global variables for the environment in which the function is declared.
 * @param {object} [upvalues] The upvalues passed from the parent closure.
 */
shine.Closure = function (vm, file, data, globals, upvalues) {
	var me = this;
	
	this._vm = vm;
	this._globals = globals;
	this._file = file;
	this._data = data;

	this._upvalues = upvalues || shine.gc.createArray();
	this._constants = data.constants;
	this._functions = data.functions;
	this._instructions = data.instructions;

	this._register = this._register || shine.Register.create();
	this._pc = 0;
	this._localsUsedAsUpvalues = this._localsUsedAsUpvalues || shine.gc.createArray();
	this._funcInstances = this._funcInstances || shine.gc.createArray();
	this._localFunctions = shine.gc.createObject();
	
	var me = this,
		result = function () { 
			var args = shine.gc.createArray();
			for (var i = 0, l = arguments.length; i < l; i++) args.push(arguments[i]);
			return me.execute(args);
		};
		
	result._instance = this;

	result.dispose = function () {
		me.dispose.apply(me, arguments);
		delete this.dispose;
	};

	return result;
};


shine.Closure.prototype = {};
shine.Closure.prototype.constructor = shine.Closure;

shine.Closure._graveyard = [];
shine.Closure._current = undefined;




shine.Closure.create = function (vm, file, data, globals, upvalues) {
	var instance = shine.Closure._graveyard.pop();
	//console.log(instance? 'reusing' : 'creating');
	
	if (instance) {
		return shine.Closure.apply(instance, arguments);
	} else {
		return new shine.Closure(vm, file, data, globals, upvalues);
	}
};




/**
 * Starts execution of the function instance from the beginning.
 * @param {Array} args Array containing arguments to use.
 * @returns {Array} Array of return values.
 */
shine.Closure.prototype.execute = function (args) {
	var me = this;

	if (this._vm._status != shine.RUNNING) {
		this._vm._callbackQueue.push(function () {
			me.execute.call(me, args);
		});

		return;		
	}


	this._pc = 0;

	//if (this._data && this._data.sourceName) shine.stddebug.write('Executing ' + this._data.sourceName + '...'); //? ' ' + this._data.sourceName : ' function') + '...<br><br>');
	//shine.stddebug.write('\n');

	// ASSUMPTION: Parameter values are automatically copied to R(0) onwards of the function on initialisation. This is based on observation and is neither confirmed nor denied in any documentation. (Different rules apply to v5.0-style VARARG functions)
	this._params = shine.gc.createArray().concat(args);
	this._register.set(args.splice(0, this._data.paramCount));

	if (this._data.is_vararg == 7) {	// v5.0 compatibility (LUA_COMPAT_VARARG)
		var arg = shine.gc.createArray().concat(args),
			length = arg.length;
					
		arg = new shine.Table(arg);
		arg.setMember('n', length);
		
		this._register.push(arg);
	}
	
	try {
		return this._run();

	} catch (e) {
		if (!((e || shine.EMPTY_OBJ) instanceof shine.Error)) {
			var stack = (e.stack || '');

			e = new shine.Error('Error in host call: ' + e.message);
			e.stack = stack;
			e.luaStack = stack.split('\n');
		}

		if (!e.luaStack) e.luaStack = shine.gc.createArray();
		e.luaStack.push([this, this._pc - 1]);
	
		throw e;
	}
};




/**
 * Continues execution of the function instance from its current position.
 * @returns {Array} Array of return values.
 */
shine.Closure.prototype._run = function () {
	var instruction,
		line,
		retval,
		yieldVars,
		running;

	this.terminated = false;
	
	
	if (this._vm._status == shine.RESUMING) {
	 	if (this._vm._resumeStack.length) {
			this._pc--;
			
		} else {
			this._vm._status = shine.RUNNING;

			yieldVars = this._vm._resumeVars;
			delete this._vm._resumeVars;
		}

	} else if (shine.debug && shine.debug._status == shine.RESUMING) {
	 	if (shine.debug._resumeStack.length) {
			this._pc--;
			
		} else {
			shine.debug._setStatus(shine.RUNNING);
		}

	} else if ((running = this._vm._coroutineRunning) && running.status == shine.RESUMING) {
	 	if (running._resumeStack.length) {
			this._pc--;
			
		} else {
			running.status = shine.RUNNING;
			//shine.stddebug.write('[coroutine resumed]\n');
	
			yieldVars = running._yieldVars;
		}
	}	
	

	if (yieldVars) {
		// instruction = this._instructions[this._pc - 1];

		var offset = (this._pc - 1) * 4,
			a = this._instructions[offset + 1],
			b = this._instructions[offset + 2],
			c = this._instructions[offset + 3],
			retvals = shine.gc.createArray();

		for (var i = 0, l = yieldVars.length; i < l; i++) retvals.push(yieldVars[i]);

		if (c === 0) {
			l = retvals.length;
		
			for (i = 0; i < l; i++) {
				this._register.setItem(a + i, retvals[i]);
			}

			this._register.splice(a + l);
		
		} else {
			for (i = 0; i < c - 1; i++) {
				this._register.setItem(a + i, retvals[i]);
			}
		}

		shine.gc.collect(retvals);
	}


	while (this._instructions[this._pc * 4] !== undefined) {
		line = this._data.linePositions && this._data.linePositions[this._pc];
		retval = this._executeInstruction(this._pc++, line);

		if ((running = this._vm._coroutineRunning) && running.status == shine.SUSPENDING) {
			running._resumeStack.push(this);

			if (running._func._instance == this) {
				retval = running._yieldVars;

				running.status = shine.SUSPENDED;
				shine.Coroutine._remove();

				//shine.stddebug.write('[coroutine suspended]\n');
				
				return retval;
			}
			
			return;
		}

		if (this._vm._status == shine.SUSPENDING && !retval) {
			this._vm._resumeStack.push(this);
			return;
		}
		
		if (shine.debug && shine.debug._status == shine.SUSPENDING && !retval) {
			shine.debug._resumeStack.push(this);
			return;
		}
		
		
		if (retval !== undefined) {
			this.terminated = true;
			this.dispose();
			
			return retval;
		}
	}
	
	this.terminated = true;
	this.dispose();
};




/**
 * Executes a single instruction.
 * @param {object} instruction Information about the instruction.
 * @param {number} line The line number on which to find the instruction (for debugging).
 * @returns {Array} Array of the values that make be returned from executing the instruction.
 */
shine.Closure.prototype._executeInstruction = function (pc, line) {
	this.constructor._current = this;

	var offset = pc * 4,
		opcode = this._instructions[offset],
		op = shine.operations.HANDLERS[opcode],
		A = this._instructions[offset + 1],
		B = this._instructions[offset + 2],
		C = this._instructions[offset + 3];

	// if (!op) throw new Error('Operation not implemented! (' + opcode + ')');
	return op.call(this, A, B, C);
};
	



/**
 * Returns the value of the constant registered at a given index.
 * @param {number} index Array containing arguments to use.
 * @returns {object} Value of the constant.
 */
shine.Closure.prototype.getConstant = function (index) {
	if (this._constants[index] === null) return;
	return this._constants[index];
};

	


/**
 * Returns whether or not the closure has retained child scopes.
 * @returns {boolean} Has retained child scopes.
 */
shine.Closure.prototype.hasRetainedScope = function () {

	if (this._localsUsedAsUpvalues.length) return true;
	if (this._upvalues.length) return true;

	// for (var i in this._upvalues) {
	// 	if (this._funcInstances.hasOwnProperty(i) && this._upvalues[i].open) return true;
	// }

	for (var i in this._funcInstances) {
		if (this._funcInstances.hasOwnProperty(i) && this._funcInstances[i].isRetained()) return true;
	}

	return false;
};




/**
 * Dump memory associtated with closure.
 */
shine.Closure.prototype.dispose = function (force) {

	if (force || !this.hasRetainedScope()) {
		delete this._vm;
		delete this._globals;
		delete this._file;
		delete this._data;
	
		delete this._functions;
		delete this._instructions;
	
		delete this._pc;
		// delete this._funcInstances;
	
		shine.gc.collect(this._params);
		shine.gc.collect(this._localFunctions);

		delete this._params;
	
		delete this._constants;

//		delete this._localsUsedAsUpvalues;
		delete this._upvalues;

		this._register.reset();
		this._funcInstances.length = 0;
		this._localsUsedAsUpvalues.length = 0;

		shine.Closure._graveyard.push(this);
	}
	
};





// vm/src/Function.js:



'use strict';


var shine = shine || {};


/**
 * Represents a function definition.
 * @constructor
 * @extends shine.EventEmitter
 * @param {shine.File} file The file in which the function is declared.
 * @param {object} data Object containing the Luac data for the function.
 * @param {object} globals The global variables for the environment in which the function is declared.
 * @param {object} [upvalues] The upvalues passed from the parent closure.
 * @see Hooks into this function in jit.js.
 */
shine.Function = function (vm, file, data, globals, upvalues) {
	var me, compiled, closure, runner;

	this._vm = vm;
	this._file = file;
	this._data = data || shine.gc.createObject();
	this._globals = globals;
	this._upvalues = upvalues || shine.gc.createArray();
	this._index = shine.Function._index++;
	this.instances = shine.gc.createArray();
	this._retainCount = 0;

 	this._convertInstructions();
};


shine.Function.prototype = {};
shine.Function.prototype.constructor = shine.Function;


/**
 * Keeps a count of the number of functions created, in order to index them uniquely.
 * @type Number
 * @static
 */
shine.Function._index = 0;




/**
 * Creates a new function instance from the definition.
 * @returns {shine.Closure} An instance of the function definition.
 */
shine.Function.prototype.getInstance = function () {
	return shine.Closure.create(this._vm, this._file, this._data, this._globals, this._upvalues);
};





/**
 * Compiles the function to JavaScript.
 * @see Implemented in jit.js.
 */
shine.Function.prototype._compile = function () {};




/**
 * Converts the function's instructions from the format in file into ArrayBuffer or Array in place.
 */
shine.Function.prototype._convertInstructions = function () {
	var instructions = this._data.instructions || shine.gc.createArray(),
		buffer,
		result,
		i, l,
		instruction,
		offset;
	
	if ('ArrayBuffer' in window) {
		if (instructions instanceof Int32Array) return;

		if (instructions.length == 0 || instructions[0].op === undefined) {
			buffer = new ArrayBuffer(instructions.length * 4);
			result = new Int32Array(buffer);

			result.set(instructions);
			this._data.instructions = result;
			return;
		}

		buffer = new ArrayBuffer(instructions.length * 4 * 4);
		result = new Int32Array(buffer);
		
	} else {
		if (instructions.length == 0 || typeof instructions[0] == 'number') return;
		result = [];
	}

	for (i = 0, l = instructions.length; i < l; i++) {
		instruction = instructions[i];
		offset = i * 4;

		result[offset] = instruction.op;
		result[offset + 1] = instruction.A;
		result[offset + 2] = instruction.B;
		result[offset + 3] = instruction.C;
	}

	this._data.instructions = result;
};




/**
 * Calls the function, implicitly creating a new instance and passing on the arguments provided.
 * @returns {Array} Array of the return values from the call.
 */
shine.Function.prototype.call = function (context) {
	var args = shine.gc.createArray(),
		l = arguments.length,
		i;
		
	for (i = 1; i < l; i++) args.push(arguments[i]);
	return this.apply(context, args);
};




/**
 * Calls the function, implicitly creating a new instance and using items of an array as arguments.
 * @param {object} [obj = {}] The object on which to apply the function. Included for compatibility with JavaScript's Function.apply().
 * @param {Array} args Array containing arguments to use.
 * @see Hooks into this function in jit.js.
 * @returns {Array} Array of the return values from the call.
 */
shine.Function.prototype.apply = function (obj, args, internal) {
	if (obj && obj instanceof Array && !args) {
		args = obj;
		obj = undefined;
	}

	try {
		return this.getInstance().apply(obj, args);
	} catch (e) {
		shine.Error.catchExecutionError(e);
	}
};



/**
 * Creates a unique description of the function.
 * @returns {string} Description.
 */
shine.Function.prototype.toString = function () {
	return 'function: 0x' + this._index.toString(16);
};




/**
 * Saves this function from disposal.
 */
shine.Function.prototype.retain = function () {
	this._retainCount++;
};




/**
 * Releases this function to be disposed.
 */
shine.Function.prototype.release = function () {
	if (!--this._retainCount && this._readyToDispose) this.dispose();
};




/**
 * Test if the function has been marked as retained.
 * @returns {boolean} Whether or not the function is marked as retained.
 */
shine.Function.prototype.isRetained = function () {
	if (this._retainCount) return true;
	
	for (var i in this.instances) {
		if (this.instances.hasOwnProperty(i) && this.instances[i].hasRetainedScope()) return true;
	}
	
	return false;
};




/**
 * Dump memory associated with function.
 * returns {Boolean} Whether or not the function was dumped successfully.
 */
shine.Function.prototype.dispose = function (force) {
	this._readyToDispose = true;
	
	if (force) {
		for (var i = 0, l = this.instances.length; i < l; i++) {
			this.instances[i].dispose(true);
		}
		
	} else if (this.isRetained()) {
		return false;
	}

	delete this._vm;
	delete this._file;
	delete this._data;
	delete this._globals;
	delete this._upvalues;

	delete this.instances;	
	delete this._readyToDispose;

	return true;
};





// vm/src/Coroutine.js:



'use strict';


var shine = shine || {};


/**
 * Represents a single coroutine (thread).
 * @constructor
 * @extends shine.EventEmitter
 * @param {shine.Closure} closure The closure that is to be executed in the thread.
 */
shine.Coroutine = function (closure) {
	shine.EventEmitter.call(this);

	this._func = closure.getInstance();
	this._index = shine.Coroutine._index++;
	this._started = false;
	this._yieldVars = undefined;
	this._resumeStack = this._resumeStack || shine.gc.createArray();
	this.status = shine.SUSPENDED;

	shine.stddebug.write ('[coroutine created]\n');
};


shine.Coroutine.prototype = new shine.EventEmitter();
shine.Coroutine.prototype.constructor = shine.Function;


shine.Coroutine._index = 0;
shine.Coroutine._graveyard = [];


shine.Coroutine.create = function (closure) {
	var instance = shine.Coroutine._graveyard.pop();
	
	if (instance) {
		shine.Coroutine.apply(instance, arguments);
		return instance;
		
	} else {
		return new shine.Coroutine(closure);
	}
};




/**
 * Adds a new coroutine to the top of the run stack.
 * @static
 * @param {shine.Coroutine} co A running coroutine.
 */
shine.Coroutine._add = function (co) {
	var vm = shine.getCurrentVM();
	vm._coroutineStack.push(vm._coroutineRunning);
	vm._coroutineRunning = co;
};




/**
 * Removes a coroutine from the run stack.
 * @static
 */
shine.Coroutine._remove = function () {
	var vm = shine.getCurrentVM();
	vm._coroutineRunning = vm._coroutineStack.pop();
};




/**
 * Rusumes a suspended coroutine.
 * @returns {Array} Return values, either after terminating or from a yield.
 */
shine.Coroutine.prototype.resume = function () {
	var retval,
		funcToResume,
		vm = this._func._instance._vm;

	try {
		if (this.status == shine.DEAD) throw new shine.Error ('cannot resume dead coroutine');

		shine.Coroutine._add(this);
		
		if (vm && vm._status == shine.RESUMING) {
			funcToResume = vm._resumeStack.pop();

		} else if (shine.debug && shine.debug._status == shine.RESUMING) {
			funcToResume = shine.debug._resumeStack.pop();
		}

		if (funcToResume) {
			if (funcToResume instanceof shine.Coroutine) {
				retval = funcToResume.resume();

			} else if (funcToResume instanceof Function) {
				retval = funcToResume();

			} else {
				retval = this._func._instance._run();
			}

		} else if (!this._started) {
			this.status = shine.RUNNING;
			shine.stddebug.write('[coroutine started]\n');

			this._started = true;
			retval = this._func.apply(null, arguments);

		} else {
			this.status = shine.RESUMING;
			shine.stddebug.write('[coroutine resuming]\n');

			if (!arguments.length) {
				this._yieldVars = undefined;

			} else {
				var args = shine.gc.createArray();
				for (var i = 0, l = arguments.length; i < l; i++) args.push(arguments[i]);	

				this._yieldVars = args;
			}

			retval = this._resumeStack.pop()._run();
		}	
	
		if (shine.debug && shine.debug._status == shine.SUSPENDING) {
			shine.debug._resumeStack.push(this);
			return;
		}
		
		this.status = this._func._instance.terminated? shine.DEAD : shine.SUSPENDED;

		if (retval) retval.unshift(true);

	} catch (e) {
		if (!e.luaStack) e.luaStack = shine.gc.createArray();
		e.luaStack.push([this._func._instance, this._func._instance._pc - 1]);

		retval = [false, e];
		this.status = shine.DEAD;
	}

	if (this.status == shine.DEAD) {
		shine.Coroutine._remove();
		shine.stddebug.write('[coroutine terminated]\n');
		this._dispose();
	}

	return retval;
};




/**
 * Returns a unique identifier for the thread.
 * @returns {string} Description.
 */
shine.Coroutine.prototype.toString = function () {
	return 'thread:' + (this._index? '0x' + this._index.toString(16) : '[dead]');
};




/**
 * Dumps memory used by the coroutine.
 */
shine.Coroutine.prototype._dispose = function () {

	delete this._func;
	delete this._index;
	delete this._listeners;
	// delete this._resumeStack;
	delete this._started;
	delete this._yieldVars
	delete this.status

	this._resumeStack.length = 0;

	shine.Coroutine._graveyard.push(this);
};







// vm/src/Table.js:



'use strict';


(function (shine) {


	/**
	 * Represents a table in Lua.
	 * @param {Object} obj Initial values to set up in the new table.
	 */
	shine.Table = function (obj) {

		var isArr = ((obj || shine.EMPTY_OBJ) instanceof Array),
			meta,
			key,
			value,
			i;

		obj = obj || shine.gc.createObject();

		this.__shine = meta = shine.gc.createObject();
		meta.type = 'table';
		meta.index = ++shine.Table.count;
		meta.keys = shine.gc.createArray();
		meta.values = shine.gc.createArray();
		meta.numValues = [undefined];


		for (i in obj) {
			if (obj.hasOwnProperty(i)) {
				var iterate;

				key = isArr? parseInt(i, 10) + 1: i;
				value = obj[i];
				if (value === null) value = undefined;

				if (typeof getQualifiedClassName !== 'undefined') {
					// ActionScript
					iterate = (getQualifiedClassName(value) == 'Object' && !(value instanceof shine.Table) && !(value instanceof shine.Coroutine) && !(value instanceof shine.Function) && !(value instanceof shine.Closure)) || getQualifiedClassName(value) == 'Array';
				} else {
					// JavaScript
					iterate = (typeof value == 'object' && value.constructor === Object) || value instanceof Array;
				}
				
				this.setMember(key, iterate? new shine.Table(value) : value);
			}
		}
		
	};


	/**
	 * Keeps a count of the number of tables created, in order to index them uniquely.
	 * @type Number
	 * @static
	 */
	shine.Table.count = 0;




	/**
	 * Gets a member of this table. If not found, search the metatable chain.
	 * @param {Object} key The member's key.
	 * @returns {Object} The value of the member sought.
	 */
	shine.Table.prototype.getMember = function (key) {
		var typ = typeof key,
			index, value, mt, mm;

		if (typ == 'string' && (key == 'getMember' || key == 'setMember')) typ = 'object';

		switch (typ) {
			case 'string':
				if (this.hasOwnProperty(key) && this[key] !== undefined) return this[key];
				break;

			case 'number':
				if (key > 0 && key == key >> 0) {
					value = this.__shine.numValues[key];
					if (value !== undefined) return value;
					break
				}

			default:
				index = this.__shine.keys.indexOf(key);
				if (index >= 0) return this.__shine.values[index];
		}
		
		if ((mt = this.__shine.metatable) && (mm = mt.__index)) {
			switch (mm.constructor) {
				case shine.Table: return mm.getMember(key);
				// case Function: return mm(this, key);
				// case shine.Function: return mm.apply(this, [this, key])[0];
				case Function:
				case shine.Function:
					value = mm.apply(this, [this, key]);
					return (value instanceof Array)? value[0] : value;
			}
		}
	};




	/**
	 * Sets a member of this table.
	 * @param {Object} key The member's key.
	 * @param {Object} value The new value of the member.
	 */
	shine.Table.prototype.setMember = function (key, value) {
		var mt = this.__shine.metatable,
			typ = typeof key,
			positiveIntegerKey = key > 0 && key == key >> 0,
			oldValue,
			keys,
			index;

		if (typ == 'string' && (key == 'getMember' || key == 'setMember')) typ = 'object';

		switch (typ) {
			case 'string':
				oldValue = this[key];
				break;

			case 'number':
				if (positiveIntegerKey) {
					oldValue = this.__shine.numValues[key];
					break;
				}

			default:
				keys = this.__shine.keys;
				index = keys.indexOf(key);

				oldValue = index == -1? undefined : this.__shine.values[index];
				if (oldValue === undefined) shine.gc.incrRef(key);
		}

		if (oldValue === undefined && mt && mt.__newindex) {
			switch (mt.__newindex.constructor) {
				case shine.Table: return mt.__newindex.setMember(key, value);
				case Function: return mt.__newindex(this, key, value);
				case shine.Function: return mt.__newindex.apply(this, [this, key, value])[0];
			}
		}

		switch (typ) {
			case 'string':
				this[key] = value;
				break;

			case 'number':
				if (positiveIntegerKey) {
					this.__shine.numValues[key] = value;
					break;
				}

			default:
				if (index < 0) {
					index = keys.length;
					keys[index] = key;
				}
				
				this.__shine.values[index] = value;
		}

		shine.gc.incrRef(value);
		shine.gc.decrRef(oldValue);
	};




	/**
	 * Returns a unique identifier for the table.
	 * @returns {string} Description.
	 */
	shine.Table.prototype.toString = function () {
		var mt;
		
		if (this.constructor != shine.Table) return 'userdata';
		if (this.__shine && (mt = this.__shine.metatable) && mt.__tostring) return mt.__tostring.call(undefined, this)[0];

		return 'table: 0x' + this.__shine.index.toString(16);
	};



})(shine || {});




// vm/src/Error.js:



'use strict';


var shine = shine || {};


/**
 * An error that occurs in the Lua code.
 * @constructor
 * @param {string} message Error message.
 */
shine.Error = function (message) {
	this.message = message;
};


shine.Error.prototype = Object['create']? Object['create'](Error.prototype) : new Error();	// Overcomes Chromium bug: https://code.google.com/p/chromium/issues/detail?id=228909
shine.Error.prototype.constructor = shine.Error;




/**
 * Handles error reporting in a consistent manner.
 * @static
 * @param {Error|shine.Error} e Error that was thown.
 */
shine.Error.catchExecutionError = function (e) {
	if (!e) return;

	if ((e || shine.EMPTY_OBJ) instanceof shine.Error) {
		if (!e.luaMessage) e.luaMessage = e.message;
		// e.message = e.luaMessage + '\n    ' + (e.luaStack || shine.gc.createArray()).join('\n    ');
		e.message = e.luaMessage + '\n    ' + e._stackToString();
	}

	throw e;
};




/**
 * Coerces the error to a string for logging.
 * @return {string} String representation of error.
 */
shine.Error.prototype._stackToString = function () {
	var result = [],
		closure, pc, 
		funcName, parent, up,
		filename, path,
		i, j, l;

	this.luaStack = this.luaStack || [];

	for (i = 0, l = this.luaStack.length; i < l; i++) {
		if (this.luaStack[i - 1] 
			&& this.luaStack[i][0] === this.luaStack[i - 1][0] 
			&& this.luaStack[i][1] === this.luaStack[i - 1][1]
		) {
			continue;	// Filter out repeated items (due to lib.require).
		}


		if (typeof this.luaStack[i] == 'string') {
			result.push(this.luaStack[i]);

		} else {
			closure = this.luaStack[i][0];
			pc = this.luaStack[i][1];

			if (!(funcName = closure._data.sourceName)) {

				if (parent = this.luaStack[i + 1] && this.luaStack[i + 1][0]) {
					// Search locals
					for (j in parent._localFunctions) {
						if (parent._localFunctions[j]._data === closure._data) {
							funcName = j;
							break;
						} 
					}

					// Search upvalues
					if (!funcName) {
						for (j in parent._upvalues) {
							up = parent._upvalues[j].getValue();

							if ((up || shine.EMPTY_OBJ) instanceof shine.Function && up._data === closure._data) {
								funcName = parent._upvalues[j].name;
								break;
							} 
						}
					}
				}

				// Search globals
				if (!funcName) {
					for (j in closure._globals) {
						if ((closure._globals[j] || shine.EMPTY_OBJ) instanceof shine.Function && closure._globals[j]._data === closure._data) {
							funcName = j;
							break;
						} 
					}
				}
			}


			if (closure._file && closure._file.url) {
				if (filename = closure._file.data.sourcePath) {
					filename = closure._file.url.match('^(.*)\/.*?$');
					filename = (filename === null? '.' : filename[1] || '') + '/' + filename;
					filename = filename.replace(/\/\.\//g, '/').replace(/\/.*?\/\.\.\//g, '/');
				} else {
					filename = closure._file.url;
				}
			} else {
				filename = '(compiled code)';
			}

			result.push ((funcName || 'function') + ' [' + (filename || 'file') + ':' + (closure._data.linePositions? closure._data.linePositions[pc] : '?') + ']')
		}
	}
	
	return result.join('\n    ');
};




/**
 * Coerces the error to a string for logging.
 * @return {string} String representation of error.
 */
shine.Error.prototype.toString = function () {
	return 'Lua run-time error: ' + this.message;
};



// vm/src/File.js:



'use strict';


var shine = shine || {};


/**
 * Represents a Luac data file.
 * @constructor
 * @extends shine.EventEmitter
 * @param {String} url Url of the distilled JSON file.
 */
shine.File = function (url, data) {
	this.url = url;
	this.data = data;
};




/**
 * Dump memory associated with file.
 */
shine.File.prototype.dispose = function () {
	delete this.url;
	delete this.data;
};





// vm/src/operations.js:


/*
	** Notes: 
	1. A shine.Closure instance is passed in as the context for the operation handlers.
	2. The main operation functions are the entry point for the interpretor.
	3. The internal functions are used by the JIT compiler where the main functions use registers.
*/


(function (shine) {
	shine.operations = {};
	

	/******************************************************************
	*  Operations
	******************************************************************/




	/******************************************************************/
	// move

	function move (a, b) {
		var val = this._register.getItem(b),
			local,
			i;

		this._register.setItem(a, val);

		if (this._data.locals && val && val instanceof shine.Function) {
			for (i = this._data.locals.length - 1; i >= 0; i--) {
				local = this._data.locals[i];
				if (local.startpc == this._pc - 1) this._localFunctions[local.varname] = val;
			}
		}
	}

			


	/******************************************************************/
	// loadk

	function loadk (a, bx) {
		this._register.setItem(a, this.getConstant(bx));
	}




	/******************************************************************/
	// loadbool

	function loadbool (a, b, c) {
		this._register.setItem(a, !!b);
		if (c) this._pc++;
	}
		



	/******************************************************************/
	// loadnil

	function loadnil (a, b) {
		for (var i = a; i <= b; i++) this._register.setItem(i, undefined);
	}




	/******************************************************************/
	// getupval

	function getupval (a, b) {
		// if (this._upvalues[b] === undefined) return;
		var value = (this._upvalues[b] === undefined)? undefined : this._upvalues[b].getValue();
		this._register.setItem(a, value);
	}




	/******************************************************************/
	// getglobal

	function getglobal (a, b) {
		b = this.getConstant(b);
		this._register.setItem(a, getglobal_internal.call(this, b));
	}

		


	function getglobal_internal (key) {
		return (key == '_G')? this._globals : this._globals[key];
	}

		


	/******************************************************************/
	// gettable

	function gettable (a, b, c) {
		b = this._register.getItem(b);
		c = (c >= 256)? this.getConstant(c - 256) : this._register.getItem(c);

		this._register.setItem(a, gettable_internal.call(this, b, c));
	}




	function gettable_internal (b, c) {
		var result,
			local,
			i;

		if (b === undefined) throw new shine.Error('Attempt to index a nil value (' + c + ' not present in nil)');

		if (b instanceof shine.Table) {
			result = b.getMember(c);

		} else if (typeof b == 'string' && shine.lib.string[c]) {
			result = shine.lib.string[c];

		} else {
			result = b[c];
		}

		if (this && this._localFunctions && result && result instanceof shine.Function) this._localFunctions[c] = result;

		return result;
	}




	/******************************************************************/
	// setglobal

	function setglobal(a, b) {
		var key = this.getConstant(b),
			value = this._register.getItem(a);

		setglobal_internal.call(this, key, value);
	}




	function setglobal_internal(key, value) {
		var oldValue = this._globals[key];

		shine.gc.incrRef(value);
		shine.gc.decrRef(oldValue);

		this._globals[key] = value;
	}




	/******************************************************************/
	// setupval

	function setupval (a, b) {
		this._upvalues[b].setValue(this._register.getItem(a));
	}




	/******************************************************************/
	// settable

	function settable (a, b, c) {
		a = this._register.getItem(a);
		b = (b >= 256)? this.getConstant(b - 256) : this._register.getItem(b);
		c = (c >= 256)? this.getConstant(c - 256) : this._register.getItem(c);

		settable_internal.call(this, a, b, c);
	}




	function settable_internal (a, b, c) {
		if (a === undefined) throw new shine.Error('Attempt to index a missing field (can\'t set "' + b + '" on a nil value)');

		if (a instanceof shine.Table) {
			a.setMember(b, c);		

		} else {
			a[b] = c;
		}
	}




	/******************************************************************/
	// newtable

	function newtable (a, b, c) {
		this._register.setItem(a, newtable_internal());
	}




	function newtable_internal () {
		var t = new shine.Table();
		t.__shine.refCount = 0;
		return t;
	}




	/******************************************************************/
	// self

	function self (a, b, c) {
		b = this._register.getItem(b);
		c = (c >= 256)? this.getConstant(c - 256) : this._register.getItem(c);

		this._register.setItem(a + 1, b);
		this._register.setItem(a, self_internal(b, c));
	}




	function self_internal (b, c) {
		if (b === undefined) throw new shine.Error('Attempt to index a nil value (' + c + ' not present in nil)');
		if (b instanceof shine.Table) return b.getMember(c);
		if (typeof b == 'string' && shine.lib.string[c]) return shine.lib.string[c];

		return b[c];
	}




	/******************************************************************/
	// add, sub, mul, div, mod, pow

	function binary_arithmetic (a, b, c, mm, f) {
		b = (b >= 256)? this.getConstant(b - 256) : this._register.getItem(b);
		c = (c >= 256)? this.getConstant(c - 256) : this._register.getItem(c);

		var result = binary_arithmetic_internal.call(this, b, c, mm, f);
		this._register.setItem(a, result);
	}




	function binary_arithmetic_internal (b, c, mm, f) {
		var coerceToNumber = shine.utils.coerceToNumber,
			mt, f;

		if ((b && b instanceof shine.Table && (mt = b.__shine.metatable) && (f = mt.getMember(mm)))
		|| (c && c instanceof shine.Table && (mt = c.__shine.metatable) && (f = mt.getMember(mm)))) {
			return f.apply(null, [b, c], true)[0];
		} 

		if (typeof b != 'number') b = coerceToNumber(b, 'attempt to perform arithmetic on a %type value');
		if (typeof c != 'number') c = coerceToNumber(c, 'attempt to perform arithmetic on a %type value');

		return f(b, c);
	}




	/*****************/
	// add

	function add (a, b, c) {
		binary_arithmetic.call(this, a, b, c, '__add', add_internal);
	}




	function add_internal (x, y) {
		return x + y;
	}




	/*****************/
	// sub

	function sub (a, b, c) {
		binary_arithmetic.call(this, a, b, c, '__sub', sub_internal);
	}




	function sub_internal (x, y) {
		return x - y;
	}




	/*****************/
	// mul

	function mul (a, b, c) {
		binary_arithmetic.call(this, a, b, c, '__mul', mul_internal);
	}




	function mul_internal (x, y) {
		return x * y;
	}




	/*****************/
	// div

	function div (a, b, c) {
		binary_arithmetic.call(this, a, b, c, '__div', div_internal);
	}




	function div_internal (x, y) {
		if (y === undefined) throw new shine.Error('attempt to perform arithmetic on a nil value');
		return x / y;
	}




	/*****************/
	// mod

	function mod (a, b, c) {
		binary_arithmetic.call(this, a, b, c, '__mod', mod_internal);
	}



	function mod_internal (b, c) {
		var result, absC;

		if (c === 0 || c === -Infinity || c === Infinity || window.isNaN(b) || window.isNaN(c)) return NaN;

		result = Math.abs(b) % (absC = Math.abs(c));
		if (b * c < 0) result = absC - result;
		if (c < 0) result *= -1;

		return result;
	}




	/*****************/
	// pow

	function pow (a, b, c) {
		binary_arithmetic.call(this, a, b, c, '__pow', Math.pow);
	}




	/******************************************************************/
	// unm

	function unm (a, b) {
		b = this._register.getItem(b);
		this._register.setItem(a, unm_internal(b));
	}




	function unm_internal (b) {
		var mt, f, result;

		if (b && b instanceof shine.Table && (mt = b.__shine.metatable) && (f = mt.getMember('__unm'))) {
			result = shine.gc.createArray();
			result.push(b);
			return f.apply(null, result, true)[0];
		}

		if (typeof b != 'number') b = shine.utils.coerceToNumber(b, 'attempt to perform arithmetic on a %type value');
		return -b;
	}




	/******************************************************************/
	// not

	function not (a, b) {
		this._register.setItem(a, !this._register.getItem(b));
	}




	/******************************************************************/
	// len

	function len (a, b) {
		b = this._register.getItem(b);
		this._register.setItem(a, len_internal(b));
	}




	function len_internal (b) {
		var length,
			i;

		if (b == undefined) throw new shine.Error('attempt to get length of a nil value');
		if (b instanceof shine.Table) return shine.lib.table.getn(b);
		
		if (typeof b == 'object') {
			length = 0;
			for (i in b) if (b.hasOwnProperty(i)) length++;
			return length;
		} 

		return b.length;
	}




	/******************************************************************/
	// concat

	function concat (a, b, c) {
		var text = this._register.getItem(c),
			items = [],
			i;

		for (i = c - 1; i >= b; i--) {
			items.push(this._register.getItem(i));
		}

		this._register.setItem(a, concat_internal(text, items));
	}




	function concat_internal (text, additions) {
		var textMetaTable = text && text instanceof shine.Table && (mt = text.__shine.metatable) && (f = mt.getMember('__concat')),
			coerceToString = shine.utils.coerceToString,
			item, i, l, mt, f, args;

		for (i = 0, l = additions.length; i < l; i++) {
			item = additions[i];

			if ((item !== undefined && item instanceof shine.Table && (mt = item.__shine.metatable) && (f = mt.getMember('__concat')))
			|| (f = textMetaTable)) {
				args = shine.gc.createArray();
				args.push(item, text);

				text = f.apply(null, args, true)[0];

			} else {
				text = coerceToString(text, 'attempt to concatenate a %type value');
				item = coerceToString(item, 'attempt to concatenate a %type value');
				text = item + text;
			}
		}

		return text;
	}




	/******************************************************************/
	// jmp

	function jmp (a, sbx) {
		this._pc += sbx;
	}




	/******************************************************************/
	// eq

	function eq (a, b, c) {
		b = (b >= 256)? this.getConstant(b - 256) : this._register.getItem(b);
		c = (c >= 256)? this.getConstant(c - 256) : this._register.getItem(c);
		
		if (eq_internal(b, c) != a) this._pc++;
	}




	function eq_internal (b, c) {
		var mtb, mtc, f, result;

		if (b !== c && b && b instanceof shine.Table && (c || shine.EMPTY_OBJ) instanceof shine.Table && (mtb = b.__shine.metatable) && (mtc = c.__shine.metatable) && mtb === mtc && (f = mtb.getMember('__eq'))) {
			result = shine.gc.createArray();
			result.push(b, c);
			return !!f.apply(null, result, true)[0];
		}

		return (b === c);
	}




	/******************************************************************/
	// lt, le

	function compare (a, b, c, mm, f) {
		b = (b >= 256)? this.getConstant(b - 256) : this._register.getItem(b);
		c = (c >= 256)? this.getConstant(c - 256) : this._register.getItem(c);

		if (compare_internal(b, c, mm, f) != a) this._pc++;
	}




	function compare_internal (b, c, mm, compare) {
		var typeB = (typeof b != 'object' && typeof b) || (b instanceof shine.Table && 'table') || 'userdata',
			typeC = (typeof c != 'object' && typeof c) || (c instanceof shine.Table && 'table') || 'userdata',
			f, result, mtb, mtc;

		if (typeB !== typeC) {
			throw new shine.Error ('attempt to compare ' + typeB + ' with ' + typeC);
			
		} else if (typeB == 'table') {
			if ((mtb = b.__shine.metatable) && (mtc = c.__shine.metatable) && mtb === mtc && (f = mtb.getMember(mm))) {
				result = shine.gc.createArray();
				result.push(b, c);
				return f.apply(null, result, true)[0];

			} else {
				throw new shine.Error('attempt to compare two table values');
			}

		} else {
			return compare(b, c);
		}
	}




	/*****************/
	// lt

	function lt (a, b, c) {
		compare.call(this, a, b, c, '__lt', lt_func);
	}




	function lt_func (b, c) {
		return b < c;
	}




	/*****************/
	// le

	function le (a, b, c) {
		compare.call(this, a, b, c, '__le', le_func);
	}




	function le_func (b, c) {
		return b <= c;
	}




	/******************************************************************/
	// test

	function test (a, b, c) {
		a = this._register.getItem(a);
		if (shine.utils.coerceToBoolean(a) !== !!c) this._pc++;
	}




	/******************************************************************/
	// testset

	function testset (a, b, c) {
		b = this._register.getItem(b);

		if (shine.utils.coerceToBoolean(b) === !!c) {
			this._register.setItem(a, b);
		} else {
			this._pc++;
		}
	}




	/******************************************************************/
	// call

	function call (a, b, c) {

		var args = shine.gc.createArray(), 
			i, l,
			retvals,
			funcToResume,
			running,
			f, o;


		if (this._vm._status == shine.RESUMING) {
			// If we're resuming from the VM being suspended.
			funcToResume = this._vm._resumeStack.pop();
		
		} else if (shine.debug && shine.debug._status == shine.RESUMING) {
			// If we're resuming from a breakpoint/stepping, resume call stack first.
			funcToResume = shine.debug._resumeStack.pop();
		}	

		if (funcToResume) {		
			if (funcToResume instanceof shine.Coroutine) {
				retvals = funcToResume.resume();
				if (retvals) retvals.shift();

			} else if (funcToResume instanceof shine.Closure) {
				retvals = funcToResume._run();

			} else {
				retvals = funcToResume();
			}
			
		} else if ((running = this._vm._coroutineRunning) && running.status == shine.RESUMING) {
			// If we're resuming a coroutine function...
			
			funcToResume = running._resumeStack.pop();
			retvals = funcToResume._run();
			
		} else {
			// Prepare to run this function as usual
			args = call_prep.call(this, a, b);
		}


		if (!funcToResume) {
			f = this._register.getItem(a);
			retvals = call_internal.call(this, f, args);
		}
		
		shine.gc.collect(args);


		if (this._vm._status == shine.SUSPENDING) {
			if (retvals !== undefined && this._vm._resumeVars === undefined) {
				this._vm._resumeVars = (retvals instanceof Array)? retvals : [retvals];
			}

			return;
		}

		if (!(retvals && retvals instanceof Array)) retvals = [retvals];

		if ((running = this._vm._coroutineRunning) && running.status == shine.SUSPENDING) return;


		if (c === 0) {
			l = retvals.length;
			
			for (i = 0; i < l; i++) {
				this._register.setItem(a + i, (o = retvals[i]) == null? undefined : o);		// null comparison for Flash API calls
			}

			this._register.splice(a + l);
			
		} else {
			for (i = 0; i < c - 1; i++) {
				this._register.setItem(a + i, (o = retvals[i]) == null? undefined : o);		// null comparison for Flash API calls
			}
		}
		
	}




	function call_prep (a, b) {
		//TODO: Try splitting this into two functions and chose at jit-time depending on value of b

		var i, l, args = [];

		if (b === 0) {
			l = this._register.getLength();
		
			for (i = a + 1; i < l; i++) {
				args.push(this._register.getItem(i));
			}

		} else {
			for (i = 0; i < b - 1; i++) {
				args.push(this._register.getItem(a + i + 1));
			}
		}
		return args;
	}




	function call_internal (f, args) {
		var retvals, mt, c;

		if (f !== undefined) {
			if (f.apply) {
				retvals = f.apply(null, args);

			} else if (f instanceof shine.Table && (mt = f.__shine.metatable) && (c = mt.getMember('__call')) && c.apply) {
				args.unshift(f);
				retvals = c.apply(null, args, true);

			} else {
	 			throw new shine.Error('Attempt to call non-function');
			}

		} else {
 			throw new shine.Error('Attempt to call a nil value');
		}

		return retvals;
	}




	/******************************************************************/
	// tailcall

	function tailcall (a, b) {	
		return call.call(this, a, b, 0);
		
		// NOTE: Currently not replacing stack, so infinately recursive calls WOULD drain memory, unlike how tail calls were intended.
		// TODO: For non-external function calls, replace this stack with that of the new function. Possibly return the Function and handle the call in the RETURN section (for the calling function).
	}




	/******************************************************************/
	// return

	function return_ (a, b) {
		var retvals = shine.gc.createArray(),
			val,
			i, l;

		if (b === 0) {
			l = this._register.getLength();
			
			for (i = a; i < l; i++) {
				retvals.push(this._register.getItem(i));
			}

		} else {
			for (i = 0; i < b - 1; i++) {
				retvals.push(val = this._register.getItem(a + i));
				shine.gc.incrRef(val);
			}
		}

		close.call(this, 0);
		
//		this._register.reset();
		this.dead = true;
		
		return retvals;
	}	




	/******************************************************************/
	// forloop

	function forloop (a, sbx) {
		var step = this._register.getItem(a + 2),
			limit = this._register.getItem(a + 1),
			index = this._register.getItem(a) + step,
			parity = step / Math.abs(step);
		
		this._register.setItem(a, index);
		
		if ((parity === 1 && index <= limit) || (parity !== 1 && index >= limit)) {
			this._register.setItem(a + 3, index);
			this._pc += sbx;
		}
	}




	/******************************************************************/
	// forprep

	function forprep (a, sbx) {
		this._register.setItem(a, this._register.getItem(a) - this._register.getItem(a + 2));
		this._pc += sbx; 
	}




	/******************************************************************/
	// tforloop

	function tforloop (a, b, c) {
		var args = shine.gc.createArray(),
			retvals,
			val,
			i;

		args.push(this._register.getItem(a + 1), this._register.getItem(a + 2));
		retvals = tforloop_internal(this._register.getItem(a), args);

		for (i = 0; i < c; i++) this._register.setItem(a + i + 3, retvals[i]);

		if ((val = retvals[0]) !== undefined) {
			this._register.setItem(a + 2, val);
		} else {
			this._pc++;
		}
	}




	function tforloop_internal (f, args) {
		var retvals = f.apply(undefined, args),
			val;

		if (!(retvals && retvals instanceof Array)) {
			val = shine.gc.createArray();
			val.push(retvals);
			retvals = val;
		}

		return retvals;
	}




	/******************************************************************/
	// setlist

	function setlist (a, b, c) {
		var length = b || this._register.getLength() - a - 1,
		i;
		
		for (i = 0; i < length; i++) {
			this._register.getItem(a).setMember(50 * (c - 1) + i + 1, this._register.getItem(a + i + 1));
		}
	}




	/******************************************************************/
	// close

	function close (a, b, c) {
		close_internal.call(this, a, close_getValue, close_clearItem);
	}




	function close_getValue (index) {
		return this._register.getItem(index);
	}




	function close_clearItem (index) {
		this._register.clearItem(index);
	}

				


	function close_internal (a, getValue, clearItem) {
		
		for (var i = 0, l = this._localsUsedAsUpvalues.length; i < l; i++) {
			var local = this._localsUsedAsUpvalues[i];

			if (local && local.registerIndex >= a) {
				local.upvalue.value = getValue.call(this, local.registerIndex);
				local.upvalue.open = false;

				this._localsUsedAsUpvalues.splice(i--, 1);
				l--;

				if (clearItem) clearItem.call(this, local.registerIndex);
			}
		}
	}




	/******************************************************************/
	// closure

	function closure (a, bx) {
		var upvalueData = shine.gc.createArray(),
			instructions = this._instructions,
			slice = instructions.slice || instructions.subarray,
			opcode, f;

		while ((opcode = instructions[this._pc * 4]) !== undefined && (opcode === 0 || opcode === 4) && this._instructions[this._pc * 4 + 1] === 0) {	// move, getupval
			upvalueData.push.apply(upvalueData, slice.call(instructions, this._pc * 4, this._pc * 4 + 4));
			this._pc++;
		}

		f = new shine.Function(this._vm, this._file, this._functions[bx], this._globals, closure_upvalues.call(this, bx, upvalueData, closure_getUpval, closure_setUpval));
		this._register.setItem(a, f);
	}




	function closure_upvalues (bx, upvalueData, getUpval, setUpval) {
		var upvalues = shine.gc.createArray(),
			opcode, A, B, C, i, l;

		for (i = 0, l = upvalueData.length; i < l; i += 4) {
			opcode = upvalueData[i];
			A = upvalueData[i + 1];
			B = upvalueData[i + 2];
			C = upvalueData[i + 3];

			upvalues.push((opcode? closure_getupval : closure_move).call(this, bx, i / 4, A, B, C, getUpval, setUpval));
		}

		return upvalues;
	}




	function closure_getUpval (b) {
		return this._register.getItem(b);
	}




	function closure_setUpval (b, val) {
		this._register.setItem(b, val);
	}




	function closure_move (funcIndex, index, a, b, c, getUpval, setUpval) {
		var me = this,
			updata, upvalue;

		// move
		for (var j = 0, l = this._localsUsedAsUpvalues.length; j < l; j++) {
			updata = this._localsUsedAsUpvalues[j];
			if (updata.registerIndex === b) {
				upvalue = updata.upvalue;
				break;
			}
		}

		if (!upvalue) {
			upvalue = {
				open: true,
				getValue: function () {
					// return this.open? me._register.getItem(b) : this.value;
					return this.open? getUpval.call(me, b) : this.value;
				},
				setValue: function (val) {
					if (this.open) {
						// me._register.setItem(b, val);
						setUpval.call(me, b, val);
					} else {
						shine.gc.incrRef(val);
						shine.gc.decrRef(this.value);
						this.value = val;
					}
				},
				name: this._functions[funcIndex].upvalues? this._functions[funcIndex].upvalues[index] : '(upvalue)'
			};

			this._localsUsedAsUpvalues.push({
				registerIndex: b,
				upvalue: upvalue
			});
		}

		return upvalue;		
	}




	function closure_getupval (funcIndex, index, a, b, c) {
		var me = this;

		return {
			getValue: function () {
				return me._upvalues[b].getValue();
			},
			setValue: function (val) {
				me._upvalues[b].setValue(val);
			},
			name: this._upvalues[b].name
		};
	}




	/******************************************************************/
	// vararg

	function vararg (a, b) {
		var i, l,
			limit = b === 0? Math.max(0, this._params.length - this._data.paramCount) : b - 1;

		for (i = 0; i < limit; i++) {
			this._register.setItem(a + i, this._params[this._data.paramCount + i]);			
		}

		// Assumption: Clear the remaining items in the register.
		for (i = a + limit, l = this._register.getLength(); i < l; i++) {
			this._register.clearItem(i);
		}
	}




	/*****************************************************************/


	var // GC
		incr = shine.gc.incrRef,
		decr = shine.gc.decrRef.bind(shine.gc),
		collect = shine.gc.collect.bind(shine.gc),
		createArray = shine.gc.createArray.bind(shine.gc),
		cacheArray = shine.gc.cacheArray.bind(shine.gc),

		// Constants
		EMPTY_ARR = shine.EMPTY_ARR;


	function get_upv (x) {
		return this[x]
	}


	function set_upv (x,y) {
		setR(this,x,y)
	};


	function setR (register, index, value) {
		incr(value);
		decr(register[index]);
		register[index] = value;
	}


	function clearR (register, index) {
		for (var i = index, l = register.length; i < l; i++) decr(register[i]);
		register.length = index - 1;
	}


	function setRArr (register, index, limit, arr) {
		var toDecr = register.splice(index, Infinity),
			i, l;
 
		if (!(arr instanceof Array)) {
			i = createArray();
			i.push(arr);
			arr = i;
		}
 
		for (i = 0, l = limit || arr.length; i < l; i++) {
			incr(register[index + i] = arr[i]);
		}
 
		for (i = 0, l = toDecr.length; i < l; i++) {
			decr(register.shift());
		}

		cacheArray(arr);
	}
 

	function callR (register, index, c, argStart, argEnd) {
		var args = createArray(),
			result, i, limit, toDecr;
 
 
		if (argStart) {
			limit = argEnd? argEnd : register.length;
 
			for (i = argStart; i < limit; i++) {
				args.push(register[i]);
			}
		}
 
		result = call_internal(register[index],args);
		toDecr = register.splice(index, Infinity);
 
		if (c == 1) {
			// NOOP
		 
		} else if (!(result instanceof Array)) {
			setR(register, index, result);
		 
		} else {
			for (i = 0, limit = result.length; i < limit; i++) incr(result[i]);
		 
			result.unshift(index, 0);
			Array.prototype.splice.apply(register, result);
			 
			cacheArray(result);
		}

		for (i = 0, limit = toDecr.length; i < limit; i++) {
			decr(toDecr.shift());
		}

 		cacheArray(args);
	}
 
 
	function setlistT (R, t, index, keyStart, length) {
		t.setMember(keyStart, R[index]);
		if (--length) setlistT(R, t, index + 1, keyStart + 1, length);
	}
 
 
	function create_func (def, upvals, cl) {
		return new shine.Function(cl._vm,cl._file,def,cl._globals,upvals);
	}
 



	/*****************************************************************/


	/**
	 * Array of operation handlers indexed by opcode.
	 * @type Array
	 * @constant
	 */
	shine.operations.HANDLERS = [move, loadk, loadbool, loadnil, getupval, getglobal, gettable, setglobal, setupval, settable, newtable, self, add, sub, mul, div, mod, pow, unm, not, len, concat, jmp, eq, lt, le, test, testset, call, tailcall, return_, forloop, forprep, tforloop, setlist, close, closure, vararg];


	/**
	 * Array of instruction names indexed by opcode.
	 * @type Array
	 * @constant
	 */
	shine.operations.NAMES = ['move', 'loadk', 'loadbool', 'loadnil', 'getupval', 'getglobal', 'gettable', 'setglobal', 'setupval', 'settable', 'newtable', 'self', 'add', 'sub', 'mul', 'div', 'mod', 'pow', 'unm', 'not', 'len', 'concat', 'jmp', 'eq', 'lt', 'le', 'test', 'testset', 'call', 'tailcall', 'return', 'forloop', 'forprep', 'tforloop', 'setlist', 'close', 'closure', 'vararg'];




	/**
	 * Creates a new JavaScript function in the current scope. 
	 * Can be used by the JIT compiler to make use of the operation handlers.
	 * @param {string} funcDef String containing a JavaScript function definition.
	 * @returns {function} Resulting JavaScript function.
	 */
	shine.operations.evaluateInScope = function (funcDef, vm) {
		var func,
			shine_g = (vm || shine.getCurrentVM())._globals;


		eval('func=' + funcDef);

		return func;
	};




	shine.operations.internal = {
		getglobal: getglobal_internal,
		gettable: gettable_internal,
		setglobal: setglobal_internal,
		settable: settable_internal,
		newtable: newtable_internal,
		self: self_internal,
		binary_arithmetic: binary_arithmetic_internal,
		add: add_internal,
		sub: sub_internal,
		mul: mul_internal,
		div: div_internal,
		mod: mod_internal,
		unm: unm_internal,
		len: len_internal,
		concat: concat_internal,
		eq: eq_internal,
		compare: compare_internal,
		call: call_internal,
		tforloop: tforloop_internal,
		close: close_internal,
		closure_upvalues: closure_upvalues,
		lt_func: lt_func,
		le_func: le_func
	};

})(shine || {});





// vm/src/jit.js:



'use strict';



(function (shine) {
	

	/**
	 * Namespace for functions related to the just-in-time compiler.
	 * @namespace
	 */
	shine.jit = shine.jit || {};




	/**
	 * Flag with which to switch JIT compiler on and off.
	 * @type boolean
	 */
	shine.jit.enabled = shine.jit.enabled || false;




	/**
	 * The number of times that a function is interpreted before it is set to be compiled.
	 * @type number
	 */
	shine.jit.INVOCATION_TOLERANCE = 2;




	/**
	 * The minimum FPS required before the compiler will kick in.
	 * Set to zero for synchronous compile.
	 * @type number
	 */
	shine.jit.MIN_FPS_TO_COMPILE = 59;




	/**
	 * The length of interval between checks on FPS before compile, in ms.
	 * @type number
	 */
	shine.jit.COMPILE_INTERVAL = 500;




	var SET_REG_PATTERN = /^setR\(R,(\d+),([^;]*?)\);$/,
		gc = shine.gc,
		Function_apply = shine.Function.prototype.apply,
		compileQueue = gc.createArray(),
		frameCounter = 0,
		waitingToCompile = false,
		getNow = Date['now']? Date['now'] : function () { return new Date().getTime(); },
		waitTimerStarted;




	/******************************************************************
	*  Hooks to elsewhere
	******************************************************************/

	shine.Function.prototype.apply = function () {
		var data,
			compiled;

		if (shine.jit.enabled) {
			data = this._data;

			// If function has already been compiled...
			if (compiled = data._compiled) {
				this.apply = createRunner(this, data, compiled);
				return this.apply.apply(this, arguments);
			}

			this._runCount = this._runCount || 0;

			if (!this._compiling && ++this._runCount == shine.jit.INVOCATION_TOLERANCE) {
				this._compile();
			}
		}

		return Function_apply.apply(this, arguments);
	};




	/**
	 * Compiles the function to JavaScript.
	 */
	shine.Function.prototype._compile = function () {
		var me = this,
			data = this._data;

		if (!data._compiling) {
			data._compiling = true;

			shine.jit.compile(this, function (compiled) {
				if (data._compiled = compiled) {
					data._compiling = false;
					me.apply = createRunner(me, data, compiled);
				}
			});
		}
	};




	function createRunner (instance, data, compiled) {
		return function (context, args) {
			var closure = gc.createObject(),
				retvals;

			closure._vm = instance._vm;
			closure._globals = instance._globals;
			closure._upvalues = instance._upvalues;
			closure._constants = data.constants;
			closure._functions = data.functions;
			closure._localsUsedAsUpvalues = gc.createArray();

			return compiled.apply(closure, args); 
		};
	}


	/******************************************************************
	*  Hooks from elsewhere (event handlers)
	******************************************************************/


	shine.jit.onCompile = function () {};   // Overwrite to monitor jit compiler activity.




	/******************************************************************
	*  Compile Queue
	******************************************************************/


	function enableCompileTimer () {
		if (!waitingToCompile) {
			waitingToCompile = true;
			waitTimerStarted = getNow();
			frameCounter = 0;

			window.setTimeout(onWaitTimerTick, shine.jit.COMPILE_INTERVAL);
			window.requestAnimationFrame(onAnimationFrame);
		}
	}




	function onAnimationFrame () {
		if (waitingToCompile) {
			frameCounter++;
			window.requestAnimationFrame(onAnimationFrame);
		}
	}




	function onWaitTimerTick () {
		if (!shine || !shine.jit) return;
		
		var now = getNow(),
			fps = 1000 * frameCounter / (now - waitTimerStarted);

		if (fps >= shine.jit.MIN_FPS_TO_COMPILE) { 
			processQueue();

		} else {
			frameCounter = 0;
			waitTimerStarted = now;
			window.setTimeout(onWaitTimerTick, shine.jit.COMPILE_INTERVAL);
		}
	}




	function processQueue () {
		waitingToCompile = false;
		shine.jit.onCompile();

		while (compileQueue.length) {
			var item = compileQueue.shift()
			compile(item[0], item[1]);
			gc.collect(item);
		}
	}




	function compile (func, callback) {
		var js = shine.jit.toJS(func);
		callback(shine.operations.evaluateInScope(js, func._vm));
	}




	/******************************************************************
	*  Helpers
	******************************************************************/


	var NEWLINE_PATTERN = /\n/g,
		APOS_PATTERN = /'/g;


	/**
	 * Returns a parsable string representation of a primative value.
	 * @param {object} value The input value.
	 * @returns {string} A string-encoded representation.
	 */
	function formatValue (value) {
		if (typeof value == 'string') {
			value = value.replace(NEWLINE_PATTERN, '\\n');
			value = value.replace(APOS_PATTERN, '\\\'');
			return "'" + value + "'";
		}

		return value;
	}




	/**
	 * Adds a new unique variable to the scope of a function.
	 * @this {object} The state of the function object being compiled.
	 * @param {string} prefix The prefix to the resulting variable name.
	 * @returns {string} The name of the new variable.
	 */
	function createVar (prefix) {
		var key = prefix + this.pc;
		this.vars.push(key);
		return key;
	}




	/******************************************************************
	*  Translators
	******************************************************************/


	function translate_move (a, b) {
		return 'setR(R,' + a + ',R[' + b + ']);';
	}




	function translate_loadk (a, bx) {
		return 'setR(R,' + a + ',' + formatValue(this.getConstant(bx)) + ');';
	}




	function translate_loadbool (a, b, c) {
		var result = 'setR(R,' + a + ',' + !!b + ');',
			pc;

		if (c) {
			this.jumpDestinations[pc = this.pc + 2] = 1;
			result += 'pc=' + pc + ';break;';
		}

		return result;
	}
		



	function translate_loadnil (a, b) {
		var nils = gc.createArray(),
			result;

		for (var i = a; i <= b; i++) nils.push('setR(R,' + i + ');');
		result = nils.join('');

		gc.collect(nils);

		return result;
	}




	function translate_getupval (a, b) {
		return 'setR(R,' + a + ',cl._upvalues[' + b + ']===void 0?void 0:cl._upvalues[' + b + '].getValue());';
	}




	function translate_getglobal (a, b) {
		var key = this.getConstant(b);
		return 'setR(R,' + a + ',shine_g' + ((key == '_G')? '' : '[' + formatValue(key) + ']') + ');';
	}




	function translate_gettable (a, b, c) {
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R[' + c + ']';
		return 'setR(R,' + a + ',gettable_internal(R[' + b + '],' + c + '));';
	}




	function translate_setglobal(a, b) {
		var key = formatValue(this.getConstant(b));
		return 'setglobal_internal.call(cl,' + key + ',R[' + a + ']);';
	}




	function translate_setupval (a, b) {
		return 'cl._upvalues[' + b + '].setValue(R[' + a + ']);';
	}




	function translate_settable (a, b, c) {
		b = (b >= 256)? formatValue(this.getConstant(b - 256)) : 'R[' + b + ']';
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R[' + c + ']';

		return 'settable_internal(R[' + a + '],' + b + ',' + c + ');';
	}



	function translate_newtable (a, b, c) {
		return 'setR(R,' + a + ',newtable_internal());';
	}




	function translate_self (a, b, c) {
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R[' + c + ']';
		return 'setR(R,' + (a + 1) + ',R[' + b + ']);setR(R,' + a + ',self_internal(R[' + b + '],' + c + '));';
	}




	function translate_binary_arithmetic (a, b, c, name) {
		b = (b >= 256)? formatValue(this.getConstant(b - 256)) : 'R[' + b + ']';
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R[' + c + ']';

		return 'setR(R,' + a + ',' + 'binary_arithmetic_internal(' + b + ',' + c + ",'__" + name + "'," + name + '_internal));';
	}




	function translate_add (a, b, c) {
		return translate_binary_arithmetic.call(this, a, b, c, 'add');
	}




	function translate_sub (a, b, c) {
		return translate_binary_arithmetic.call(this, a, b, c, 'sub');
	}




	function translate_mul (a, b, c) {
		return translate_binary_arithmetic.call(this, a, b, c, 'mul');
	}




	function translate_div (a, b, c) {
		return translate_binary_arithmetic.call(this, a, b, c, 'div');
	}




	function translate_mod (a, b, c) {
		return translate_binary_arithmetic.call(this, a, b, c, 'mod');
	}




	function translate_pow (a, b, c) {
		b = (b >= 256)? formatValue(this.getConstant(b - 256)) : 'R[' + b + ']';
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R[' + c + ']';

		return 'setR(R,' + a + ',binary_arithmetic_internal(' + b + ',' + c + ",'__pow',Math.pow));";
	}




	function translate_unm (a, b) {
		return 'setR(R,' + a + ',unm_internal(R[' + b + ']));';
	}




	function translate_not (a, b) {
		return 'setR(R,' + a + ',!R[' + b + ']);';
	}




	function translate_len (a, b) {
		return 'setR(R,' + a + ',len_internal(R[' + b + ']));';
	}




	function translate_concat (a, b, c) {
		return 'setR(R,' + a + ',concat_internal(R[' + c + '],R.slice(' + b + ',' + c + ').reverse()));';
	}




	function translate_jmp (a, sbx) {
		var i = this.pc + sbx + 1;
		this.jumpDestinations[i] = 1;
		return 'pc=' + i + ';break;';
	}




	function translate_eq (a, b, c) {
		var pc = this.pc + 2;
		this.jumpDestinations[pc] = 1;

		a = a? '!' : '';
		b = (b >= 256)? formatValue(this.getConstant(b - 256)) : 'R[' + b + ']';
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R[' + c + ']';

		return 'if(' + a + 'eq_internal(' + b + ',' + c + ')){pc=' + pc + ';break}';
	}




	function translate_compare (a, b, c, mm, f) {
		var pc = this.pc + 2;
		this.jumpDestinations[pc] = 1;

		b = (b >= 256)? formatValue(this.getConstant(b - 256)) : 'R[' + b + ']';
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R[' + c + ']';

		return 'if(compare_internal(' + b + ',' + c + ",'" + mm + "'," + f +')!=' + a + '){pc=' + pc + ';break;}';
	}




	function translate_lt (a, b, c) {
		return translate_compare.call(this, a, b, c, '__lt', 'lt_func');
	}




	function translate_le (a, b, c) {
		return translate_compare.call(this, a, b, c, '__le', 'le_func');
	}




	function translate_test (a, b, c) {
		var pc = this.pc + 2;
		this.jumpDestinations[pc] = 1;

		return 'if(shine.utils.coerceToBoolean(R[' + a + '])!=' + c + '){pc=' + pc + ';break}';
	}




	function translate_testset (a, b, c) {
		var pc = this.pc + 2;
		this.jumpDestinations[pc] = 1;

		return 'if(shine.utils.coerceToBoolean(R[' + b + '])==' + c + '){R[' + a + ']=R[' + b + ']}else{pc=' + pc + ';break}'
	}




	function translate_call (a, b, c) {
		var argLimits,
			result;

		if (b === 0) { // Arguments from R(A+1) to top
			argLimits = (a + 1) + ',void 0';
 
		} else if (b === 1) { // No arguments
			argLimits = 'void 0,void 0';
 
		} else { // Arguments from R(A+1) to R(A+B-1)
			argLimits = (a + 1) + ',' + (a + b);

			var canRestructure = true,
				i, l,
				params = gc.createArray(),
				match, func;

			for (i = 1; i < b; i++) {
				if (!((match = this.code[this.pc - i]) && match.match(SET_REG_PATTERN)) || match[1] != "" + (a + b - i)) {
					canRestructure = false;
					break;
				// } else if (match[2].indexOf('setR(') >= 0) {
				//  canRestructure = false;
				//  break;
				} else {
					params.unshift(match[2]);
				}
			}

			if (canRestructure) {
				match = this.code[this.pc - b].match(SET_REG_PATTERN);

				if (match && match[1] == '' + a) {
					func = match[2];
					for (i = 1; i <= b; i++) this.code[this.pc - i] = '';

					if (c == 1) {
						result = func + '.call(void 0,' + params.join(',') + ');';
					} else {
						result = 'setRArr(R,' + a + ',' + (c? c - 1 : 'void 0') + ',' + func + '.call(void 0,' + params.join(',') + '));';
					}
				}
			} 
		}
 
		gc.collect(params);
		return result || 'callR(R,' + a + ',' + c + ',' + argLimits + ');';
	}





	function translate_tailcall (a, b) {
		// TODO
		return translate_call.call(this, a, b, 0);
	}




	function translate_return (a, b) {
		var close = translate_close.call(this, 0),
			i;

		if (b === 0) {
			i = createVar.call(this, 'i');
			return '_=R.slice(' + a + ');' + close + 'return _;';

		} else if (b == 1) {
			return close + 'return createArray();';
 
		} else {
			return '_=R.slice(' + a + ',' + (a + b - 1) + ');' + close + 'return _;';
		}
	}   



	function translate_forloop (a, sbx) {
		var step = 'R[' + (a + 2) + ']',
			limit = 'R[' + (a + 1) + ']',
			index = 'R[' + a + ']+' + step,
			forward = step + '>0',
			limitVar = createVar.call(this, 'limit'),
			pc = this.pc + sbx + 1;

		// Try to reconstruct the for loop
		var canLoop = true,
			loopVar, i;

		for (i = pc; i < this.pc; i++) {
			if (this.jumpDestinations[i] || (this.code[i] && this.code[i].indexOf('pc=') >= 0)) {
				canLoop = false;
				break;
			}
		}

		if (canLoop) {
			loopVar = 'R[' + (a + 3) + ']';
			this.code[pc - 1] = 'for(' + loopVar + '=R[' + a + '],' + limitVar + '=' + limit + ';' + forward + '?' + loopVar  + '<=' + limitVar + ':' + loopVar  + '>=' + limitVar + ';' + loopVar + '+=' + step +'){';
			delete this.jumpDestinations[this.pc];
			return '}';
		}


		// Can't reconstruct due to internal jumps, fallback to jumps...
		this.jumpDestinations[pc] = 1;
		return 'setR(R,' + a + ',' + index + ');_=' + forward + ';if((_&&R[' + a + ']<=' + limit + ')||(!_&&R[' + a + ']>=' + limit + ')){setR(R,' + (a + 3) + ',R[' + a + ']);pc=' + pc + ';break}';
	}




	function translate_forprep (a, sbx) {
		var pc = this.pc + sbx + 1;
		this.jumpDestinations[pc] = 1;

		return 'setR(R,' + a + ',R[' + a + ']-R[' + (a + 2) + ']);pc=' + pc + ';break;';
	}




	function translate_tforloop (a, b, c) {
		var fvar = createVar.call(this, 'tfor'),
			pc = this.pc + 2,
			result,
			i;

		// Try to reconstruct the for loop
		var startpc = this.pc + this._instructions[this.pc * 4 + 6] + 1,
			canLoop = true,
			loopVar, i;

		for (i = startpc + 1; i < this.pc; i++) {
			if (this.jumpDestinations[i] || (this.code[i] && this.code[i].indexOf('pc=') >= 0)) {
				canLoop = false;
				break;
			}
		}

		if (canLoop) {
			delete this.jumpDestinations[this.pc];
			this.code[this.pc + 1] = '/* noop */'

			result = 'while(1){';
			result += fvar + '=tforloop_internal(R[' + a + '],R.slice(' + (a + 1) + ',' + (a + 3) + '));';
			for (i = 0; i < c; i++) result += 'setR(R,' + (a + i + 3) + ',' + fvar + '[' + i + ']);';
			result += 'if(' + fvar + '[0]!==void 0){setR(R,' + (a + 2) + ',' + fvar + '[0])}else{break}';

			this.code[startpc] = result;
			return '}';
		}


		// Can't reconstruct due to internal jumps, fallback to jumps...
		this.jumpDestinations[pc] = 1;

		result = fvar + '=tforloop_internal(R[' + a + '],R.slice(' + (a + 1) + ',' + (a + 3) + '));';
		for (i = 0; i < c; i++) result += 'setR(R,' + (a + i + 3) + ',' + fvar + '[' + i + ']);';
		result += 'if(' + fvar + '[0]!==void 0){setR(R,' + (a + 2) + ',' + fvar + '[0])}else{pc=' + pc + ';break}';

		return result;
	}




	function translate_setlist (a, b, c) {
		return 'setlistT(R,R[' + a + '],' + (a + 1) + ',' + (50 * (c - 1) + 1) + ',' + (b == 0? 'R.length-1' : b) + ');';
	}




	function translate_close (a, b, c) {
		if (this.vars.indexOf('getupval') < 0) this.vars.push('getupval');
		return 'close_internal.call(cl,' + a + ',getupval);';
	}




	function translate_closure (a, bx) {
		var upvalueData = gc.createArray(),
			instructions = this._instructions,
			process = process,
			slice = instructions.slice || instructions.subarray,
			opcode, result;

		this.pc++;
		if (this.vars.indexOf('getupval') < 0) this.vars.push('getupval');
		if (this.vars.indexOf('setupval') < 0) this.vars.push('setupval');

		while ((opcode = instructions[this.pc * 4]) !== undefined && (opcode === 0 || opcode === 4) && this._instructions[this.pc * 4 + 1] === 0) { // move, getupval
			upvalueData.push.apply(upvalueData, slice.call(instructions, this.pc * 4, this.pc * 4 + 4));
			this.pc++;
		}

		this.pc--;

		if (upvalueData.length || typeof process == 'undefined') {
			result = 'setR(R,' + a + ',create_func(cl._functions[' + bx + '],closure_upvalues.call(cl,' + bx + ',' + JSON.stringify(upvalueData) + ',getupval,setupval),cl));';
		} else {
			result = 'setR(R,' + a + ',cl._functions[' + bx + ']);';
		}

		gc.collect(upvalueData);
		return result;
	}




	function translate_vararg (a, b) {
		var result = 'R.length=' + a + ';',
			i, l;

		if (b === 0) {
			result = 'for(_=' + this.paramCount + ';_<arguments.length;_++)setR(R,_+' + (a - this.paramCount) + ',arguments[_]);';

		} else {
			for (i = 0, l = b - 1; i < l; i++) {
				result += 'setR(R,' + (a + i) + ',arguments[' + (this.paramCount + i) + ']);';
			}
		}

		return result;
	}




	shine.jit.TRANSLATORS = [translate_move, translate_loadk, translate_loadbool, translate_loadnil, translate_getupval, translate_getglobal, translate_gettable, translate_setglobal, translate_setupval, translate_settable, translate_newtable, translate_self, translate_add, translate_sub, translate_mul, translate_div, translate_mod, translate_pow, translate_unm, translate_not, translate_len, translate_concat, translate_jmp, translate_eq, translate_lt, translate_le, translate_test, translate_testset, translate_call, translate_tailcall, translate_return, translate_forloop, translate_forprep, translate_tforloop, translate_setlist, translate_close, translate_closure, translate_vararg];




	/******************************************************************
	*  Compiler
	******************************************************************/


	/**
	 * Compiles a Moonshine function definition to a JavaScript function.
	 * @param {shine.Function} func The input Moonshine function definition.
	 * @returns {function} A JavaScript representation of the function.
	 */
	shine.jit.compile = function (func, callback) {
		if (shine.jit.MIN_FPS_TO_COMPILE) {
			var args = gc.createArray();
			args.push(func, callback);

			compileQueue.push(args);
			enableCompileTimer();

		} else {
			compile(func, callback);
		}
	};


	/**
	 * Translates a Moonshine function definition to a JavaScript function definition.
	 * @param {shine.Function} func The input Moonshine function definition.
	 * @returns {string} JavaScript source of the function.
	 */
	shine.jit.toJS = function (func) {

		var instructions = func._data.instructions,
			paramCount = func._data.paramCount,
			isVararg = func._data.is_vararg > 0,

			code = gc.createArray(),
			pc = 0,

			state,
			opcode, a, b, c,
			offset,
			compatibility,
			upvalCode = '',
			paramNames = gc.createArray(),
			func,
			result,
			i, l, v;


		// Setup state
		state = {
			paramCount: paramCount,
			isVararg: isVararg,
			stackSize: func._data.maxStackSize,

			pc: pc,
			code: gc.createArray(),
			vars: gc.createArray(),
			jumpDestinations: gc.createArray(),

			_constants: func._data.constants,
			_instructions: func._data.instructions,

			getConstant: function (index) {
				var val = this._constants[index];
				return this._constants[index] === null? void 0 : val;
			}           
		};

		state.jumpDestinations.push(1);

		// Get code representation of instructions
		l = instructions.length / 4;

		while (pc < l) {
			offset = pc * 4;
			opcode = instructions[offset];
			a = instructions[offset + 1];
			b = instructions[offset + 2];
			c = instructions[offset + 3];

			if (!state.code[pc]) state.code[pc] = shine.jit.TRANSLATORS[opcode].call(state, a, b, c);
			pc = ++state.pc;
		}


		// Insert jump entry points
		for (pc in state.jumpDestinations) {
			i = parseInt(pc, 10);
			state.code[i] = 'case ' + pc + ':' + state.code[i];
		}


		// v5.0 compatibility (LUA_COMPAT_VARARG)
		if (func._data.is_vararg == 7) {    
			compatibility =  'setR(R,' + paramCount + ',new shine.Table(Array.prototype.slice.call(arguments,' + paramCount + ')));R[' + paramCount + '].setMember("n", arguments.length-' + paramCount + ');';
		}


		// Upvalue optimisation
		if (state.vars.indexOf('getupval') >= 0) upvalCode += 'getupval=get_upv.bind(R);';
		if (state.vars.indexOf('setupval') >= 0) upvalCode += 'setupval=set_upv.bind(R);';


		// Add boilerplate
		code = ['/* ' + (func._file && func._file.url) + ":" + func._data.lineDefined + ' */', 'var cl=this,R=createArray(),pc=0,_' + (state.vars.length? ',' + state.vars.join(',') : '') + ';'];
		// for (i = 0; i < paramCount; i++) code.push('setR(R,' + i + ',arguments[' + i + ']);');
		for (i = 0; i < paramCount; i++) {
			code.push('setR(R,' + i + ',A' + i + ');');
			paramNames.push('A' + i);
		}

		if (compatibility) code.push(compatibility);
		code.push(upvalCode);
		code.push('shine.Closure._current=cl;while(1){switch(pc){');
		code = code.concat(state.code);
		code.push('}}');



		// Output JS function
		// return 'function(){' + code.join('\n') + '}';
		result = 'function(' + paramNames.join() + '){' + code.join('\n') + '}';

		gc.collect(code);
		gc.collect(paramNames);

		gc.collect(state.code);
		gc.collect(state.vars);
		gc.collect(state.jumpDestinations);

		gc.collect(state);

		return result;
	};


})(shine || {});

if (typeof module != 'undefined') module.exports = shine.jit;




// vm/src/lib.js:



'use strict';


(function (shine) {

	var RANDOM_MULTIPLIER = 16807,
		RANDOM_MODULUS = 2147483647,

		ROSETTA_STONE = {
			'([^a-zA-Z0-9%(])-': '$1*?',
	        '(.)-([^a-zA-Z0-9?])': '$1*?$2',
			'(.)-$': '$1*?',
			'%a': '[a-zA-Z]',
			'%A': '[^a-zA-Z]',
			'%c': '[\x00-\x1f]',
			'%C': '[^\x00-\x1f]',
			'%d': '\\d',
			'%D': '[^\d]',
			'%l': '[a-z]',
			'%L': '[^a-z]',
			'%p': '[\.\,\"\'\?\!\;\:\#\$\%\&\(\)\*\+\-\/\<\>\=\@\[\]\\\^\_\{\}\|\~]',
			'%P': '[^\.\,\"\'\?\!\;\:\#\$\%\&\(\)\*\+\-\/\<\>\=\@\[\]\\\^\_\{\}\|\~]',
			'%s': '[ \\t\\n\\f\\v\\r]',
			'%S': '[^ \t\n\f\v\r]',
			'%u': '[A-Z]',
			'%U': '[^A-Z]',
			'%w': '[a-zA-Z0-9]',
			'%W': '[^a-zA-Z0-9]',
			'%x': '[a-fA-F0-9]',
			'%X': '[^a-fA-F0-9]',
			'%([^a-zA-Z])': '\\$1'
		},

		DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
		
		MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
		
		DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
				
		DATE_FORMAT_HANDLERS = {
			'%a': function (d, utc) { return DAYS[d['get' + (utc? 'UTC' : '') + 'Day']()].substr(0, 3); },
			'%A': function (d, utc) { return DAYS[d['get' + (utc? 'UTC' : '') + 'Day']()]; },
			'%b': function (d, utc) { return MONTHS[d['get' + (utc? 'UTC' : '') + 'Month']()].substr(0, 3); },
			'%B': function (d, utc) { return MONTHS[d['get' + (utc? 'UTC' : '') + 'Month']()]; },
			'%c': function (d, utc) { return d['to' + (utc? 'UTC' : '') + 'LocaleString'](); },
			'%d': function (d, utc) { return ('0' + d['get' + (utc? 'UTC' : '') + 'Date']()).substr(-2); },
			'%H': function (d, utc) { return ('0' + d['get' + (utc? 'UTC' : '') + 'Hours']()).substr(-2); },
			'%I': function (d, utc) { return ('0' + ((d['get' + (utc? 'UTC' : '') + 'Hours']() + 11) % 12 + 1)).substr(-2); },
			'%j': function (d, utc) {
				var result = d['get' + (utc? 'UTC' : '') + 'Date'](),
					m = d['get' + (utc? 'UTC' : '') + 'Month']();
					
				for (var i = 0; i < m; i++) result += DAYS_IN_MONTH[i];
				if (m > 1 && d['get' + (utc? 'UTC' : '') + 'FullYear']() % 4 === 0) result +=1;

				return ('00' + result).substr(-3);
			},
			'%m': function (d, utc) { return ('0' + (d['get' + (utc? 'UTC' : '') + 'Month']() + 1)).substr(-2); },
			'%M': function (d, utc) { return ('0' + d['get' + (utc? 'UTC' : '') + 'Minutes']()).substr(-2); },
			'%p': function (d, utc) { return (d['get' + (utc? 'UTC' : '') + 'Hours']() < 12)? 'AM' : 'PM'; },
			'%S': function (d, utc) { return ('0' + d['get' + (utc? 'UTC' : '') + 'Seconds']()).substr(-2); },
			'%U': function (d, utc) { return getWeekOfYear(d, 0, utc); },
			'%w': function (d, utc) { return '' + (d['get' + (utc? 'UTC' : '') + 'Day']()); },
			'%W': function (d, utc) { return getWeekOfYear(d, 1, utc); },
			'%x': function (d, utc) { return DATE_FORMAT_HANDLERS['%m'](d, utc) + '/' + DATE_FORMAT_HANDLERS['%d'](d, utc) + '/' + DATE_FORMAT_HANDLERS['%y'](d, utc); },
			'%X': function (d, utc) { return DATE_FORMAT_HANDLERS['%H'](d, utc) + ':' + DATE_FORMAT_HANDLERS['%M'](d, utc) + ':' + DATE_FORMAT_HANDLERS['%S'](d, utc); },
			'%y': function (d, utc) { return DATE_FORMAT_HANDLERS['%Y'](d, utc).substr (-2); },
			'%Y': function (d, utc) { return '' + d['get' + (utc? 'UTC' : '') + 'FullYear'](); },
			'%Z': function (d, utc) { var m; return (utc && 'UTC') || ((m = d.toString().match(/[A-Z][A-Z][A-Z]/)) && m[0]); },
			'%%': function () { return '%' }
		},


		randomSeed = 1,
		stringMetatable;




	function getRandom () {
		randomSeed = (RANDOM_MULTIPLIER * randomSeed) % RANDOM_MODULUS;
		return randomSeed / RANDOM_MODULUS;
	}




	function getVM (context) {
		if (context && context instanceof shine.VM) return context;

		var vm = shine.getCurrentVM();
		if (!vm) throw new shine.Error("Can't call library function without passing a VM object as the context");

		return vm;
	}




	function ipairsIterator (table, index) {
		if (index === undefined) throw new shine.Error('Bad argument #2 to ipairs() iterator');

		var nextIndex = index + 1,
			numValues = table.__shine.numValues;

		if (!numValues.hasOwnProperty(nextIndex) || numValues[nextIndex] === void 0) return void 0;
		return [nextIndex, numValues[nextIndex]];
	}
	



	function getWeekOfYear (d, firstDay, utc) { 
		var dayOfYear = parseInt(DATE_FORMAT_HANDLERS['%j'](d), 10),
			jan1 = new Date(d.getFullYear (), 0, 1, 12),
			offset = (8 - jan1['get' + (utc? 'UTC' : '') + 'Day']() + firstDay) % 7;

		return ('0' + (Math.floor((dayOfYear - offset) / 7) + 1)).substr(-2);
	}




	function translatePattern (pattern) {
		// TODO Add support for balanced character matching (not sure this is easily achieveable).
		pattern = '' + pattern;

		var n = 0,
			i, l, character, addSlash;
					
		for (i in ROSETTA_STONE) if (ROSETTA_STONE.hasOwnProperty(i)) pattern = pattern.replace(new RegExp(i, 'g'), ROSETTA_STONE[i]);
		l = pattern.length;

		for (i = 0; i < l; i++) {
			character = pattern.substr(i, 1);
			addSlash = false;

			if (character == '[') {
				if (n) addSlash = true;
				n++;

			} else if (character == ']') {
				n--;
				if (n) addSlash = true;
			}

			if (addSlash) {
				// pattern = pattern.substr(0, i) + '\\' + pattern.substr(i++);
				pattern = pattern.substr(0, i) + pattern.substr(i++ + 1);
				l++;
			}
		}			

		return pattern;	
	}
	



	function loadfile (filename, callback) {
		var vm = getVM(this),
			file,
			pathData;

		vm.fileManager.load(filename, function (err, file) {
			if (err) {
				vm._trigger('module-load-error', [file, err]);

				if (err == 404 && /\.lua$/.test(filename)) {
					loadfile.call(vm, filename + '.json', callback);
				} else {
					callback();
				}

				return;
			}

			var func = new shine.Function(vm, file, file.data, vm._globals);
			vm._trigger('module-loaded', [file, func]);
			
			callback(func);
		});

		vm._trigger('loading-module', filename);
	}




	shine.lib = {
	
		
		assert: function (v, m) {
			if (v === false || v === undefined) throw new shine.Error(m || 'Assertion failed!');
			return [v, m];
		},
	
	
	
	
		collectgarbage: function (opt, arg) {
			// Unimplemented
		},
	
	
	
	
		dofile: function (filename) {
			// Unimplemented
		},
		
		
		
		
		error: function (message) {	
			throw new shine.Error(message);
		},
	
	
	
		
		getfenv: function (f) {
			// Unimplemented
		},
		
		
		
		
		/**
		 * Implementation of Lua's getmetatable function.
		 * @param {object} table The table from which to obtain the metatable.
		 */
		getmetatable: function (table) {
			var mt;

			if (table instanceof shine.Table) {
				if ((mt = table.__shine.metatable) && (mt = mt.__metatable)) return mt;
				return table.__shine.metatable;

			} else if (typeof table == 'string') {
				return stringMetatable;
			}
		},
		
	
	
	
		ipairs: function (table) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in ipairs(). Table expected');
			return [ipairsIterator, table, 0];
		},
	
	
	
		
		load: function (func, chunkname) {
			var vm = getVM(this),
				chunk = '', piece, lastPiece;

			while ((piece = func.apply(func)) && (piece = piece[0])) {
				chunk += (lastPiece = piece);
			}

			return shine.lib.loadstring.call(vm, chunk);
		},
	
	
	
		
		loadfile: function (filename) {
			var vm = getVM(this),
				callback = function (result) {
					vm.resume(result || []);
				};

			vm.suspend();
			loadfile.call(vm, filename, callback);
		},
	
	
	
		
		loadstring: function (string, chunkname) {
			var vm = getVM(this);
			
			if (typeof string != 'string') throw new shine.Error('bad argument #1 to \'loadstring\' (string expected, got ' + shine.utils.coerce(string, 'string') + ')');
			if (!string) return new shine.Function(vm);

			vm.suspend();

			vm.fileManager.load(string, function (err, file) {
				if (err) {
					vm.resume([]);
					return;
				}

				var func = new shine.Function(vm, file, file.data, vm._globals, shine.gc.createArray());
				vm.resume([func]);
			});
		},
	
	
			
	
		/**
		 * Implementation of Lua's next function.
		 * @param {object} table The table that will receive the metatable.
		 * @param {object} index Index of the item to return.
		 */
		next: function (table, index) {	
			// SLOOOOOOOW...
			var found = (index === undefined),
				numValues = table.__shine.numValues,
				keys,
				key, value,
				i, l;

			if (found || (typeof index == 'number' && index > 0 && index == index >> 0)) {
				if ('keys' in Object) {
					// Use Object.keys, if available.
					keys = Object['keys'](numValues);
					
					if (found) {
						// First pass
						i = 1;

					} else if (i = keys.indexOf('' + index) + 1) {
						found = true;
					} 

					if (found) {
						while ((key = keys[i]) !== void 0 && (value = numValues[key]) === void 0) i++;
						if (value !== void 0) return [key >>= 0, value];
					}

				} else {
					// Else use for-in (faster than for loop on tables with large holes)

					for (l in numValues) {	
						i = l >> 0;

						if (!found) {
							if (i === index) found = true;
			
						} else if (numValues[i] !== undefined) {
							return [i, numValues[i]];
						}
					}
				}
			}
			
			for (i in table) {
				if (table.hasOwnProperty(i) && !(i in shine.Table.prototype) && i !== '__shine') {
					if (!found) {
						if (i == index) found = true;
	
					} else if (table.hasOwnProperty(i) && table[i] !== undefined && ('' + i).substr(0, 2) != '__') {
						return [i, table[i]];
					}
				}
			}
	
			for (i in table.__shine.keys) {
				if (table.__shine.keys.hasOwnProperty(i)) {
					var key = table.__shine.keys[i];
	
					if (!found) {
						if (key === index) found = true;
		
					} else if (table.__shine.values[i] !== undefined) {
						return [key, table.__shine.values[i]];
					}
				}
			}
		
			return shine.gc.createArray();
		},
	
	
	
	
		/**
		 * Implementation of Lua's pairs function.
		 * @param {object} table The table to be iterated over.
		 */
		pairs: function (table) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in pairs(). Table expected');
			return [shine.lib.next, table];
		},
	
		
	
	
		pcall: function (func) {
			var args = shine.gc.createArray(),
				result;
				
			for (var i = 1, l = arguments.length; i < l; i++) args.push (arguments[i]);
	
			try {			
				if (typeof func == 'function') {
					result = func.apply(null, args);
					
				} else if ((func || shine.EMPTY_OBJ) instanceof shine.Function) {
					result = func.apply(null, args, true);

				} else {
					throw new shine.Error('Attempt to call non-function');
				}
	
			} catch (e) {
				return [false, e && e.message || e];
			}
			
			if (!((result || shine.EMPTY_OBJ) instanceof Array)) result = [result];
			result.unshift(true);
			
			return result;
		},
	

		
	
		print: function () {
			var output = shine.gc.createArray(),
				item;
			
			for (var i = 0, l = arguments.length; i< l; i++) {
				output.push(shine.lib.tostring(arguments[i]));
			}
	
			return shine.stdout.write(output.join('\t'));
		},
	
	
	
	
		rawequal: function (v1, v2) {
			return (v1 === v2);
		},
	
	
	
	
		rawget: function (table, index) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in rawget(). Table expected');
			return table[index];
		},
	
	
	
	
		rawset: function (table, index, value) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in rawset(). Table expected');
			if (index == undefined) throw new shine.Error('Bad argument #2 in rawset(). Nil not allowed');
	
			table[index] = value;
			return table;
		},
	



		require: function (modname) {
			var vm = getVM(this),
				packageLib = vm._globals['package'],
				current = shine.Closure._current,
				module,
				preload,
				paths,
				path,
				filename, 
				data,
				failedPaths = shine.gc.createArray();


			function curryLoad (func) {
				return function () {
					return load(func);
				}
			};


			function load (preloadFunc) {
				var result;

				if (vm._resumeStack.length) {
					result = vm._resumeStack.pop()._run();

				} else if (shine.debug && shine.debug._resumeStack && shine.debug._resumeStack.length) {
					result = shine.debug._resumeStack.pop()._run();

				} else {
					packageLib.loaded[modname] = true;
					result = preloadFunc.call(null, modname);
				}

				if (vm._status == shine.SUSPENDING && !result) {
					current._pc--;
					vm._resumeStack.push(curryLoad(preloadFunc));
					return;

				} else if (shine.debug && shine.debug._status == shine.SUSPENDING && !result) {
					current._pc--;
					shine.debug._resumeStack.push(curryLoad(preloadFunc));
					return;
				}
		

				if (!result) return;
				module = result[0];

				if (module !== undefined) packageLib.loaded.setMember(modname, module);
				return packageLib.loaded[modname];
			}

			modname = shine.utils.coerceToString(modname);
			if (module = packageLib.loaded[modname]) return module;
			if (preload = packageLib.preload[modname]) return load(preload);

			filename = modname.replace(/\./g, "/") + '.lua.json';
			data = vm.fileManager._cache[filename];

			if (data) {
				var file = new shine.File(filename, data);
				preload = new shine.Function(vm, file, file.data, vm._globals);
				packageLib.preload[modname] = preload;
				return load(preload);
			}

			paths = packageLib.path.replace(/;;/g, ';').split(';');
			vm.suspend();


			function loadNextPath () {
				path = paths.shift();

				if (!path) {
					throw new shine.Error('module \'' + modname + '\' not found:' + '\n	no field package.preload[\'' + modname + '\']\n' + failedPaths.join('\n'));
			
				} else {
					path = path.replace(/\?/g, modname.replace(/\./g, '/'));

					loadfile.call(vm, path, function (preload) {

						if (preload) {
							packageLib.preload[modname] = preload;
							shine.Closure._current._pc--;
							vm.resume();

						} else {
							failedPaths.push('	no file \'' + path + '\'');
							loadNextPath();
						}
					});
				}
			}

			loadNextPath();
		},	
	


	
		select: function (index) {
			var args = shine.gc.createArray();
			
			if (index == '#') {
				return arguments.length - 1;
				
			} else if (index = parseInt(index, 10)) {
				return arguments.constructor === Array? arguments.slice(index) : Array.prototype.slice.call(arguments, index);
				
			} else {
				throw new shine.Error('bad argument #1 in select(). Number or "#" expected');
			}
		},
		
	
		
		
		/**
		 * Implementation of Lua's setmetatable function.
		 * @param {object} table The table that will receive the metatable.
		 * @param {object} metatable The metatable to attach.
		 */
		setmetatable: function (table, metatable) {
			var mt;

			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in setmetatable(). Table expected');	
			if (!(metatable === undefined || (metatable || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #2 in setmetatable(). Nil or table expected');	
			if ((mt = table.__shine.metatable) && (mt = mt.__metatable)) throw new shine.Error('cannot change a protected metatable');

			shine.gc.incrRef(metatable);
			shine.gc.decrRef(table.__shine.metatable);

			table.__shine.metatable = metatable;

			return table;
		},
		
	
	
		
		tonumber: function (e, base) {
			var match, chars, pattern;

			if (e === '') return;
             
            base = base || 10;

			if (base < 2 || base > 36) throw new shine.Error('bad argument #2 to tonumber() (base out of range)');
			if (base == 10 && (e === Infinity || e === -Infinity || (typeof e == 'number' && window.isNaN(e)))) return e;

			if (base != 10 && e == undefined) throw new shine.Error('bad argument #1 to \'tonumber\' (string expected, got nil)');
            e = ('' + e).replace(/^\s+|\s+$/g, '');    // Trim

            // If using base 10, use normal coercion.
			if (base == 10) return shine.utils.coerceToNumber(e);

			e = shine.utils.coerceToString(e);

            // If using base 16, ingore any "0x" prefix
			if (base == 16 && (match = e.match(/^(\-)?0[xX](.+)$/))) e = (match[1] || '') + match[2];

			chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
			pattern = new RegExp('^[' + chars.substr(0, base) + ']*$', 'gi');

			if (!pattern.test(e)) return;	// Invalid
			return parseInt(e, base);
		},
		
		
		
		
		tostring: function (e) {
			var mt, mm;

			if (e !== undefined && e instanceof shine.Table && (mt = e.__shine.metatable) && (mm = mt.getMember('__tostring'))) return mm.call(mm, e);

			if (e && (e instanceof shine.Table || e instanceof shine.Function)) return e.toString();
			if (typeof e == 'function') return 'function: [host code]';

			return shine.utils.coerceToString(e) || 'userdata';
		},
		
		
		
		
		type: function (v) {
			var t = typeof v;
	
			switch (t) {
				case 'undefined': 
					return 'nil';
				
				case 'number': 
				case 'string': 
				case 'boolean': 
				case 'function': 
					return t;
				 
				case 'object': 
					if (v.constructor === shine.Table) return 'table';
					if ((v || shine.EMPTY_OBJ) instanceof shine.Function) return 'function';
				
					return 'userdata';
			}
		},
		
		
	
		unpack: function (table, i, j) {
			// v5.2: shine.warn ('unpack is deprecated. Use table.unpack instead.');
			return shine.lib.table.unpack(table, i, j);
		},
		
		
		
		
		_VERSION: 'Lua 5.1',
		
		
		
		
		xpcall: function (func, err) {
			var result, success, invalid;
				
			try {
				if (typeof func == 'function') {
					result = func.apply();
					
				} else if ((func || shine.EMPTY_OBJ) instanceof shine.Function) {
					result = func.apply(null, undefined, true);

				} else {
					invalid = true;
				}

				success = true;
				
			} catch (e) {
				result = err.apply(null, undefined, true);
				if (((result || shine.EMPTY_OBJ) instanceof Array)) result = result[0];
	
				success = false;
			}

			if (invalid) throw new shine.Error('Attempt to call non-function');
			
			if (!((result || shine.EMPTY_OBJ) instanceof Array)) result = [result];
			result.unshift(success);
			
			return result;
		}
	
	
	};
	
	
	
	
	shine.lib.coroutine = new shine.Table({

		
		create: function (closure) {
			//return new shine.Coroutine (closure);
			return shine.Coroutine.create(closure);
		},
		
		
		
		
		resume: function (thread) {
			if (arguments.length < 2) return thread.resume.call(thread);

			var args = shine.gc.createArray();
			for (var i = 1, l = arguments.length; i < l; i++) args.push(arguments[i]);	

			return thread.resume.apply(thread, args);
		},
		
		
		
		
		running: function () {
			var vm = getVM(this);
			return vm._coroutineRunning;
		},
		
	
		
		
		status: function (co) {
			switch (co.status) {
				case shine.RUNNING: return (co === getVM()._coroutineRunning)? 'running' : 'normal';
				case shine.SUSPENDED: return 'suspended';
				case shine.DEAD: return 'dead';
			}
		},
		
	
		
		
		wrap: function (closure) {
			var co = shine.lib.coroutine.create(closure),
				vm = getVM(this);
			
			var result = function () {			
				var args = [co];
				for (var i = 0, l = arguments.length; i < l; i++) args.push(arguments[i]);	
	
				var retvals = shine.lib.coroutine.resume.apply(null, args),
					success;

				if (!retvals && (vm._status == shine.SUSPENDING || (shine.debug && shine.debug._status == shine.SUSPENDING))) return;
				success = retvals.shift();
					
				if (success) return retvals;
				throw retvals[0];
			};
			
			result._coroutine = co;
			return result;
		},
		
	
		
		
		yield: function () {
			var running = getVM()._coroutineRunning,
				args;

			// If running in main thread, throw error.
			if (!running) throw new shine.Error('attempt to yield across metamethod/C-call boundary (not in coroutine)');
			if (running.status != shine.RUNNING) throw new shine.Error('attempt to yield non-running coroutine in host');

			args = shine.gc.createArray();
			for (var i = 0, l = arguments.length; i < l; i++) args.push(arguments[i]);	
	
			running._yieldVars = args;
			running.status = shine.SUSPENDING;

			return {
				resume: function () {
					var args = [running],
						i, 
						l = arguments.length,
						f = function () { 
							shine.lib.coroutine.resume.apply(undefined, args); 
						};

					if (arguments.length == 1 && arguments[0] === undefined) l = 0;
					for (i = 0; i < l; i++) args.push(arguments[i]);

					if (running.status == shine.SUSPENDING) {
						window.setTimeout(f, 1);
					} else {
						f();
					}
				}
			}
		}
			
	});


	

	shine.lib.debug = new shine.Table({

		debug: function () {
			// Not implemented
		},


		getfenv: function (o) {
			// Not implemented
		},


		gethook: function (thread) {
			// Not implemented
		},


		getinfo: function (thread, func, what) {
			// Not implemented
		},


		getlocal: function (thread, level, local) {
			// Not implemented
		},


		getmetatable: function (object) {
			// Not implemented
		},


		getregistry: function () {
			// Not implemented
		},


		getupvalue: function (func, up) {
			// Not implemented
		},


		setfenv: function (object, table) {
			// Not implemented
		},


		sethook: function (thread, hook, mask, count) {
			// Not implemented
		},


		setlocal: function (thread, level, local, value) {
			// Not implemented
		},


		setmetatable: function (object, table) {
			// Not implemented
		},


		setupvalue: function (func, up, value) {
			// Not implemented
		},


		traceback: function (thread, message, level) {
			// Not implemented
		}
	});




	shine.lib.io = new shine.Table({
		

		close: function (file) {
			if (file) throw new shine.Error('File operations currently not supported.');
			// Default behaviour: Do nothing.
		},




		flush: function () {
			// Default behaviour: Do nothing.
			// TODO: shine.stdout.flush(); // ??
		},




		input: function (file) {
			throw new shine.Error('File operations currently not supported.');
		},




		lines: function (filename) {
			throw new shine.Error('File operations currently not supported.');
		},




		open: function (filename) {
			throw new shine.Error('File operations currently not supported.');
		},




		output: function (file) {
			throw new shine.Error('File operations currently not supported.');
		},




		popen: function (prog, mode) {
			throw new shine.Error('File operations currently not supported.');
		},




		read: function () {
			throw new shine.Error('File operations currently not supported.');
		},




		stderr: {},	// Userdata
		stdin: {},
		stdout: {},




		tmpfile: function () {
			throw new shine.Error('File operations currently not supported.');
		},




		'type': function () {
			// Return nil
		},




		write: function () {
			var i, arg, output = '';
			
			for (var i in arguments) {
				if (arguments.hasOwnProperty(i)) {
					output += shine.utils.coerceToString(arguments[i], 'bad argument #' + i + ' to \'write\' (string expected, got %type)');
				}
			}
			
			shine.stdout.write(output);
		}
		
		
	});
	
	
	
		
	shine.lib.math = new shine.Table({
	
	
		abs: function (x) {
			return Math.abs(x);
		},
		
		
		
		
		acos: function (x) {
			return Math.acos(x);
		},
		
		
		
		
		asin: function (x) {
			return Math.asin(x);
		},
		
		
		
		
		atan: function (x) {
			return Math.atan(x);
		},
		
		
		
		
		atan2: function (y, x) {
			return Math.atan2(y, x);
		},
		
		
		
		
		ceil: function (x) {
			return Math.ceil(x);
		},
		
		
		
		
		cos: function (x) {
			return Math.cos(x);
		},
		
		
		
		
		cosh: function (x) {
			var e = shine.lib.math.exp;
			return (e(x) + e(-x)) / 2;
		},
		
		
		
		
		deg: function (x) {
			return x * 180 / Math.PI;
		},
		
		
		
		
		exp: function (x) {
			return Math.exp(x);
		},
		
		
		
		
		floor: function (x) {
			return Math.floor(x);
		},
		
		
		
		
		fmod: function (x, y) {
			return x % y;
		},
		
		
		
		
		frexp: function (x) {
			var delta, exponent, mantissa;
			if (x == 0) return [0, 0];

			delta = x > 0? 1 : -1;
			x = x * delta;
			
			exponent = Math.floor(Math.log(x) / Math.log(2)) + 1;
			mantissa = x / Math.pow(2, exponent);

			return [mantissa * delta, exponent];
		},
		
		
		
		
		huge: Infinity,
		
		
		
		
		ldexp: function (m, e) {
			return m * Math.pow(2, e);
		},
		
		
		
		
		log: function (x, base) {
			var result = Math.log(x);
			if (base !== undefined) return result / Math.log(base);
			return result;
		},
		
		
		
		
		log10: function (x) {
			// v5.2: shine.warn ('math.log10 is deprecated. Use math.log with 10 as its second argument instead.');
			return Math.log(x) / Math.log(10);
		},
		
		
		
		
		max: function () {
			return Math.max.apply(Math, arguments);
		},
		
		
		
		
		min: function () {
			return Math.min.apply(Math, arguments);
		},
		
		
		
		
		modf: function (x) {
			var intValue = Math.floor(x),
				mantissa = x - intValue;
			return [intValue, mantissa];
		},
		
		
		
		
		pi: Math.PI,
		
		
		
		
		pow: function (x, y) {
			var coerceToNumber = shine.utils.coerceToNumber;
			x = coerceToNumber(x, "bad argument #1 to 'pow' (number expected)")
			y = coerceToNumber(y, "bad argument #2 to 'pow' (number expected)")
			return Math.pow(x, y);
		},
		
		
		
		
		rad: function (x) {
			x = shine.utils.coerceToNumber(x, "bad argument #1 to 'rad' (number expected)")
			return (Math.PI / 180) * x;
		},
	
	
	
	
		/**
		 * Implementation of Lua's math.random function.
		 */
		random: function (min, max) {
			if (min === undefined && max === undefined) return getRandom();
	
	
			if (typeof min !== 'number') throw new shine.Error("bad argument #1 to 'random' (number expected)");
	
			if (max === undefined) {
				max = min;
				min = 1;
	
			} else if (typeof max !== 'number') {
				throw new shine.Error("bad argument #2 to 'random' (number expected)");
			}
	
			if (min > max) throw new shine.Error("bad argument #2 to 'random' (interval is empty)");
			return Math.floor(getRandom() * (max - min + 1) + min);
		},
	
	
	
	
		randomseed: function (x) {
			if (typeof x !== 'number') throw new shine.Error("bad argument #1 to 'randomseed' (number expected)");
			randomSeed = x;
		},
	
	
	
		
		sin: function (x) {
			return Math.sin(x);
		},
	
	
	
		
		sinh: function (x) {
			var e = shine.lib.math.exp;
			return (e(x) - e(-x)) / 2;
		},
	
	
	
		
		sqrt: function (x) {
			return Math.sqrt(x);
		},
	
	
	
		
		tan: function (x) {
			return Math.tan(x);
		},
	
	
	
		
		tanh: function (x) {
			var e = shine.lib.math.exp;
			return (e(x) - e(-x))/(e(x) + e(-x));
		}
	
		
	});
	
	

	
	shine.lib.os = new shine.Table({
	
	
		clock: function () {
			// Not implemented
		},
	
	
	
	
		date: function (format, time) {
			if (format === undefined) format = '%c';
			
			var utc,
				date = new Date();
	
			if (time) date.setTime(time * 1000);

			if (format.substr(0, 1) === '!') {
				format = format.substr(1);
				utc = true;
			}
	
			if (format === '*t') {
				var isDST = function (d) {
					var year = d.getFullYear(),
						jan = new Date(year, 0);
						
					// ASSUMPTION: If the time offset of the date is the same as it would be in January of the same year, DST is not in effect.
					return (d.getTimezoneOffset() !== jan.getTimezoneOffset());
				};
				
				return new shine.Table ({
					year: parseInt(DATE_FORMAT_HANDLERS['%Y'](date, utc), 10),
					month: parseInt(DATE_FORMAT_HANDLERS['%m'](date, utc), 10),
					day: parseInt(DATE_FORMAT_HANDLERS['%d'](date, utc), 10),
					hour: parseInt(DATE_FORMAT_HANDLERS['%H'](date, utc), 10),
					min: parseInt(DATE_FORMAT_HANDLERS['%M'](date, utc), 10),
					sec: parseInt(DATE_FORMAT_HANDLERS['%S'](date, utc), 10),
					wday: parseInt(DATE_FORMAT_HANDLERS['%w'](date, utc), 10) + 1,
					yday: parseInt(DATE_FORMAT_HANDLERS['%j'](date, utc), 10),
					isdst: isDST(date, utc)
				});	
			}
	
	
			for (var i in DATE_FORMAT_HANDLERS) {
				if (DATE_FORMAT_HANDLERS.hasOwnProperty(i) && format.indexOf(i) >= 0) format = format.replace(i, DATE_FORMAT_HANDLERS[i](date, utc));
			}
			
			return format;
		},
	
	
	
	
		difftime: function (t2, t1) {
			return t2 - t1;
		},
	
	
	
	
		execute: function () {
			if (arguments.length) throw new shine.Error('shell is not available. You should always check first by calling os.execute with no parameters');
			return 0;
		},
	
	
	
	
		exit: function (code) {
			throw new shine.Error('Execution terminated [' + (code || 0) + ']');
		},
	
	
	
	
		getenv: function () {
			// Not implemented
		},
	
	
	
	
		remove: function () {
			// Not implemented
		},
	
	
	
	
		rename: function () {
			// Not implemented
		},
	
	
	
	
		setlocale: function () {
			// Not implemented
		},
	
	
	
	
		/**
		 * Implementation of Lua's os.time function.
		 * @param {object} table The table that will receive the metatable.
		 */
		time: function (table) {
			var time;
			
			if (!table) {
				time = Date['now']? Date['now']() : new Date().getTime();
				
			} else {
				var day, month, year, hour, min, sec;
				
				if (!(day = table.getMember('day'))) throw new shine.Error("Field 'day' missing in date table");
				if (!(month = table.getMember('month'))) throw new shine.Error("Field 'month' missing in date table");
				if (!(year = table.getMember('year'))) throw new shine.Error("Field 'year' missing in date table");
				hour = table.getMember('hour') || 12;
				min = table.getMember('min') || 0;
				sec = table.getMember('sec') || 0;
				
				if (table.getMember('isdst')) hour--;
				time = new Date(year, month - 1, day, hour, min, sec).getTime();
			}
			
			return Math.floor(time / 1000);
		},
	
	
	
	
		tmpname: function () {
			// Not implemented
		}
	
			
	});




	shine.lib['package'] = new shine.Table({

		cpath: undefined,


		loaded: new shine.Table(),


		loadlib: function (libname, funcname) {
			// Not implemented
		},


		path: '?.lua.json;?.json;modules/?.lua.json;modules/?.json;modules/?/?.lua.json;modules/?/index.lua.json',


		preload: {},


		seeall: function (module) {
			var vm = getVM(this),
				mt = new shine.Table();

			mt.setMember('__index', vm._globals);
			shine.lib.setmetatable(module, mt);
		}
		
	});




	shine.lib.string = new shine.Table({
		
		
		'byte': function (s, i, j) {
			i = i || 1;
			j = j || i;
			
			var result = shine.gc.createArray(),
				length = s.length,
				index;
			
			for (index = i; index <= length && index <= j ; index++) result.push(s.charCodeAt(index - 1) || undefined);
			return result;
		},
		
		
		
		
		'char': function () {
			var result = '';
			for (var i = 0, l = arguments.length; i < l; i++) result += String.fromCharCode(arguments[i]);
	
			return result;			
		},
		
		
		
		
		dump: function (func) {
			var data = func._data,
				result = shine.gc.createObject(),
				arr = shine.gc.createArray(),
				i;

			for (i in data) {
				if (data.hasOwnProperty(i)) result[i] = data[i];
			}

			// Convert typed array to standard Array...
			arr.push.apply(arr, result.instructions);
			result.instructions = arr;

			return JSON.stringify(result);
		},
		
		
		
		
		find: function (s, pattern, init, plain) {
			if (typeof s != 'string' && typeof s != 'number') throw new shine.Error("bad argument #1 to 'find' (string expected, got " + typeof s + ")");
			if (typeof pattern != 'string' && typeof pattern != 'number') throw new shine.Error("bad argument #2 to 'find' (string expected, got " + typeof pattern + ")");

			s = '' + s;
			init = init || 1;

			var index, reg, match, result;

			// Regex
			if (plain === undefined || !plain) {
				pattern = translatePattern(pattern);
				reg = new RegExp(pattern);
				index = s.substr(init - 1).search(reg);
				
				if (index < 0) return;
				
				match = s.substr(init - 1).match(reg);
				result = [index + init, index + init + match[0].length - 1];

				match.shift();
				return result.concat(match);
			}
			
			// Plain
			index = s.indexOf(pattern, init - 1);
			return (index === -1)? undefined : [index + 1, index + pattern.length];
		},
		
		
		
		
		format: function (formatstring) {
			var FIND_PATTERN = /^((.|\s)*?)(%)((.|\s)*)$/,
				PARSE_PATTERN = /^(%?)([+\-#\ 0]*)(\d*)(\.(\d*))?([cdeEfgGiouqsxX])((.|\s)*)$/,
				findData,
				result = '',
				parseData,
				args = arguments.constructor === Array? arguments : Array.prototype.slice.call(arguments, 0),
				argIndex = 2,
				index = 2;

			args.shift();


			function parseMeta(parseData) {
				var flags = parseData[2],
					precision = parseInt(parseData[5]);

				if (('' + flags).length > 5) throw new shine.Error('invalid format (repeated flags)');
				if (!precision && precision !== 0) precision = Infinity;

				return {
					showSign: flags.indexOf('+') >= 0,
					prefix: flags.indexOf(' ') >= 0,
					leftAlign: flags.indexOf('-') >= 0,
					alternateForm: flags.indexOf('#') >= 0,
					zeroPad: flags.indexOf('0') >= 0,
					minWidth: parseInt(parseData[3]) || 0,
					hasPrecision: !!parseData[4],
					precision: precision
				};
			}


			function pad (character, len) {
				return Array(len + 1).join(character);
			}


			function padNumber (arg, neg, meta) {
				var l;

				if (meta.zeroPad && !meta.leftAlign && (l = meta.minWidth - arg.length) > 0) {
					if (neg || meta.showSign || meta.prefix) l--;
					arg = pad('0', l) + arg;
				}

				if (neg) {
					arg = '-' + arg;

				} else if (meta.showSign) {
					arg = '+' + arg;
				
				} else if (meta.prefix) {
					arg = ' ' + arg;
				}

				if ((l = meta.minWidth - arg.length) > 0) {
					if (meta.leftAlign) return arg + pad(' ', l);
					return pad(' ', l) + arg;
				}

				return arg;
			}


			function c (arg) {
				arg = shine.utils.coerceToNumber(arg, 'bad argument #' + argIndex + ' to \'format\' (number expected)');
				return String.fromCharCode(arg);
			}


			function d (arg) {
				arg = shine.utils.coerceToNumber(arg, 'bad argument #' + argIndex + ' to \'format\' (number expected)');

				var meta = parseMeta(parseData),
					neg = arg < 0,
					l;

				arg = '' + Math.floor(Math.abs(arg));

				if (meta.hasPrecision) {
					if (meta.precision !== Infinity && (l = meta.precision - arg.length) > 0) arg = pad('0', l) + arg;
					meta.zeroPad = false;
				} 

				return padNumber(arg, neg, meta);
			}


			function f (arg) {
				arg = shine.utils.coerceToNumber(arg, 'bad argument #' + argIndex + ' to \'format\' (number expected)');

				var meta = parseMeta(parseData),
					neg = arg < 0,
					mantissa = arg - Math.floor(arg),
					precision = meta.precision === Infinity? 6 : meta.precision;

				arg = '' + Math.floor(Math.abs(arg));

				if (precision > 0) {
					mantissa = mantissa.toFixed(precision).substr(2);
					precision -= mantissa.length;
					arg += '.' + mantissa + (precision? pad('0', precision) : '');
				}

				return padNumber(arg, neg, meta);
			}


			function o (arg, limit) {
				arg = shine.utils.coerceToNumber(arg, 'bad argument #' + argIndex + ' to \'format\' (number expected)');

				var neg = arg < 0,
					limit = Math.pow(2, 32),
					meta = parseMeta(parseData),
					l;

				arg = Math.floor(arg);
				if (neg) arg = limit + arg;

				arg = arg.toString(16);
				//if (neg && intSize > 2) arg = ;
				if (meta.hasPrecision && meta.precision !== Infinity && (l = meta.precision - arg.length) > 0) arg = pad('0', l) + arg; 

				if ((l = meta.minWidth - arg.length) > 0) {
					if (meta.leftAlign) return arg + pad(' ', l);
					return pad(' ', l) + arg;
				}

				return arg;
			}


			function q (arg) {
				arg = shine.utils.coerceToString(arg);
				return '"' + arg.replace(/([\n"])/g, '\\$1') + '"';
			}


			function s (arg) {
				var meta = parseMeta(parseData),
					l;

				arg = shine.utils.coerceToString(arg);
				arg = arg.substr(0, meta.precision);

				if ((l = meta.minWidth - arg.length) > 0) {
					if (meta.leftAlign) {
						return arg + pad(' ', l);
					} else {
						return pad(meta.zeroPad? '0' : ' ', l) + arg;
					}
				}

				return arg;
			}


			function x (arg) {
				arg = shine.utils.coerceToNumber(arg, 'bad argument #' + argIndex + ' to \'format\' (number expected)');

				var neg = arg < 0,
					intSize = 4, //vm && vm._thread && vm._thread._file.data.meta && vm._thread._file.data.meta.sizes.int || 4,
					limit = Math.pow(2, 32),
					meta = parseMeta(parseData),
					l;

				arg = Math.floor(arg);
				if (neg) arg = limit + arg;

				arg = arg.toString(16);
				if (neg && intSize > 2) arg = pad('f', (intSize - 2) * 4) + arg;
				if (meta.hasPrecision && meta.precision !== Infinity && (l = meta.precision - arg.length) > 0) arg = pad('0', l) + arg; 

				if (meta.alternateForm) arg = '0x' + arg;

				// if ((l = meta.minWidth - arg.length) > 0) {
				// 	if (meta.leftAlign) return arg + pad(' ', l);
				// 	return pad(' ', l) + arg;
				// }

				meta.showSign = meta.prefix = false;
				meta.zeroPad = meta.zeroPad && meta.hasPrecision;
				arg = padNumber(arg, false, meta);

				return arg;
			}



			while (findData = ('' + formatstring).match(FIND_PATTERN)) {
				result += findData[1];
				while (findData[index] != '%') index++;
				parseData = ('' + findData[index + 1]).match(PARSE_PATTERN);

				if (parseData[1]) {
					// %%
					result += '%' + parseData[2] + parseData[3] + (parseData[4] || '') + parseData[6];

				} else {
					switch(parseData[6]) {

						case 'c':
							result += c(args.shift());
							break;

						case 'd':
							result += d(args.shift());
							break;

						case 'f':
							result += f(args.shift());
							break;

						case 'q':
							result += q(args.shift());
							break;

						case 'o':
							result += o(args.shift());
							break;

						case 's':
							result += s(args.shift());
							break;

						case 'x':
							result += x(args.shift());
							break;

						case 'X':
							result += x(args.shift()).toUpperCase();
							break;

					}
				}

				formatstring = parseData[7];
				argIndex++;
			}

			return result + formatstring;
		},
		

		
		
		gmatch: function (s, pattern) {
			pattern = translatePattern(pattern);
			var reg = new RegExp(pattern, 'g'),
				matches = ('' + s).match(reg);

			return function () {
				var match = matches.shift(),
					groups = new RegExp(pattern).exec(match);

				if (match === undefined) return;

				groups.shift();
				return groups.length? groups : match;
			};				
		},
		
		
		
		
		gsub: function (s, pattern, repl, n) {
			if (typeof s != 'string' && typeof s != 'number') throw new shine.Error("bad argument #1 to 'gsub' (string expected, got " + typeof s + ")");
			if (typeof pattern != 'string' && typeof pattern != 'number') throw new shine.Error("bad argument #2 to 'gsub' (string expected, got " + typeof pattern + ")");
			if (n !== undefined && (n = shine.utils.coerceToNumber(n)) === undefined) throw new shine.Error("bad argument #4 to 'gsub' (number expected, got " + typeof n + ")");

			s = '' + s;
			pattern = translatePattern('' + pattern);

			var count = 0,
				result = '',
				str,
				prefix,
				match,
				lastMatch;

			while ((n === undefined || count < n) && s && (match = s.match(pattern))) {

				if (typeof repl == 'function' || (repl || shine.EMPTY_OBJ) instanceof shine.Function) {
					str = repl.apply(null, [match[0]], true);
					if (str instanceof Array) str = str[0];
					if (str === undefined) str = match[0];

				} else if ((repl || shine.EMPTY_OBJ) instanceof shine.Table) {
					str = repl.getMember(match[0]);
					
				} else if (typeof repl == 'object') {
					str = repl[match];
					
				} else {
					str = ('' + repl).replace(/%([0-9])/g, function (m, i) { return match[i]; });
				}

				if (match[0].length == 0 && lastMatch === undefined) {
				 	prefix = '';
				} else {
					prefix = s.split(match[0], 1)[0];
				}
	
				lastMatch = match[0];
				result += prefix + str;
				s = s.substr((prefix + lastMatch).length);

				count++;
			}

			return [result + s, count];
		},
		
		
		
		
		len: function (s) {
			// if (typeof s != 'string' && typeof s != 'number') throw new shine.Error("bad argument #1 to 'len' (string expected, got " + typeof s + ")");
			s = shine.utils.coerceToString(s, "bad argument #1 to 'len' (string expected, got %type)");
			return s.length;
		},
		
		
		
		
		lower: function (s) {
			if (typeof s != 'string' && typeof s != 'number') throw new shine.Error("bad argument #1 to 'lower' (string expected, got " + typeof s + ")");
			return ('' + s).toLowerCase();
		},
		
		
		
		
		match: function (s, pattern, init) {
			if (typeof s != 'string' && typeof s != 'number') throw new shine.Error("bad argument #1 to 'match' (string expected, got " + typeof s + ")");
			if (typeof pattern != 'string' && typeof pattern != 'number') throw new shine.Error("bad argument #2 to 'match' (string expected, got " + typeof pattern + ")");

			init = init? init - 1 : 0;
			s = ('' + s).substr(init);
		
			var matches = s.match(new RegExp(translatePattern (pattern)));
			
			if (!matches) return;
			if (!matches[1]) return matches[0];

			matches.shift();
			return matches;
		},
		
		
		
		
		rep: function (s, n) {
			var result = '',
			i;
			
			for (i = 0; i < n; i++) result += s;
			return result;
		},
		
		
		
		
		reverse: function (s) {
			var result = '',
			i;
			
			for (i = s.length; i >= 0; i--) result += s.charAt(i);
			return result;
		},
		
		
		
		
		sub: function (s, i, j) {
			if (typeof s != 'string' && typeof s != 'number') throw new shine.Error("Bad argument #1 to 'sub' (string expected, got " + typeof s + ")");
			s = '' + s;
			i = i || 1;
			j = j || s.length;
			
			if (i > 0) {
				i = i - 1;
			} else if (i < 0) {
				i = s.length + i;
			}
			
			if (j < 0) j = s.length + j + 1;
			
			return s.substring(i, j);
		},
		
		
		
		
		upper: function (s) {
			return s.toUpperCase();
		}	
		
		
	});
	

	stringMetatable = new shine.Table({ __index: shine.lib.string });


	
	
	shine.lib.table = new shine.Table({
		
		
		concat: function (table, sep, i, j) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error("Bad argument #1 to 'concat' (table expected)");
	
			sep = sep || '';
			i = i || 1;
			j = j || shine.lib.table.maxn(table);

			var result = shine.gc.createArray().concat(table.__shine.numValues).splice(i, j - i + 1);
			return result.join(sep);
		},
		
	
	
	
		getn: function (table) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error("Bad argument #1 in 'getn' (table expected)");

			var vals = table.__shine.numValues, 
				keys = shine.gc.createArray(),
				i, 
				j = 0;

			for (i in vals) if (vals.hasOwnProperty(i)) keys[i] = true;
			while (keys[j + 1]) j++;
	
			// Following translated from ltable.c (http://www.lua.org/source/5.1/ltable.c.html)
			if (j > 0 && vals[j] === undefined) {
				/* there is a boundary in the array part: (binary) search for it */
				var i = 0;
	
				while (j - i > 1) {
					var m = Math.floor((i + j) / 2);
	
					if (vals[m] === undefined) {
						j = m;
					} else {
						i = m;
					}
				}

				return i;
			}

			return j;
		},
		
			
		
		
		/**
		 * Implementation of Lua's table.insert function.
		 * @param {object} table The table in which to insert.
		 * @param {object} index The poostion to insert.
		 * @param {object} obj The value to insert.
		 */
		insert: function (table, index, obj) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in table.insert(). Table expected');
	
			if (obj == undefined) {
				obj = index;
				index = table.__shine.numValues.length;
			} else {
				index = shine.utils.coerceToNumber(index, "Bad argument #2 to 'insert' (number expected)");
			}
	
			table.__shine.numValues.splice(index, 0, undefined);
			table.setMember(index, obj);
		},
		
		
		
		
		maxn: function (table) {
			// v5.2: shine.warn ('table.maxn is deprecated');
			
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error("Bad argument #1 to 'maxn' (table expected)");
	
			// // length = 0;
			// // while (table[length + 1] != undefined) length++;
			// // 
			// // return length;
	
			// var result = 0,
			// 	index,
			// 	i;
				
			// for (i in table) if ((index = 0 + parseInt (i, 10)) == i && table[i] !== null && index > result) result = index;
			// return result; 

			return table.__shine.numValues.length - 1;
		},
		
		
		
		
		/**
		 * Implementation of Lua's table.remove function.
		 * @param {object} table The table from which to remove an element.
		 * @param {object} index The position of the element to remove.
		 */
		remove: function (table, index) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in table.remove(). Table expected');
	
			var max = shine.lib.table.getn(table),
				vals = table.__shine.numValues,
				result;

			if (index > max) return;
			if (index == undefined) index = max;
				
			result = vals.splice(index, 1);
			while (index < max && vals[index] === undefined) delete vals[index++];

			return result;
		},		
		

		
		
		sort: function (table, comp) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error("Bad argument #1 to 'sort' (table expected)");
	
			var sortFunc, 
				arr = table.__shine.numValues;
		
			if (comp) {
				if (!(comp instanceof shine.Function || comp.constructor === Function)) throw new shine.Error("Bad argument #2 to 'sort' (function expected)");
	
				sortFunc = function (a, b) {
					return comp.apply(null, [a, b], true)[0]? -1 : 1;
				}
			
			} else {
				sortFunc = function (a, b) {
					return a < b? -1 : 1;
				};
			}
	
			arr.shift();
			arr.sort(sortFunc).unshift(undefined);
		},




		unpack: function (table, i, j) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error("Bad argument #1 to 'unpack' (table expected)");	
	
			i = i || 1;
			if (j === undefined) j = shine.lib.table.getn(table);
			
			var vals = shine.gc.createArray(),
				index;
	
			for (index = i; index <= j; index++) vals.push(table.getMember(index));
			return vals;
		}


	});
	
	
})(shine || {});




// vm/src/utils.js:


'use strict';


(function (shine) {
	/**
	 * Pattern to identify a string value that can validly be converted to a number in Lua.
	 * @type RegExp
	 * @private
	 * @constant
	 */
	var FLOATING_POINT_PATTERN = /^[-+]?[0-9]*\.?([0-9]+([eE][-+]?[0-9]+)?)?$/,
		HEXIDECIMAL_CONSTANT_PATTERN = /^(\-)?0x([0-9a-fA-F]*)\.?([0-9a-fA-F]*)$/;




	function throwCoerceError (val, errorMessage) {
		if (!errorMessage) return;
		errorMessage = ('' + errorMessage).replace(/\%type/gi, shine.lib.type(val));
		throw new shine.Error(errorMessage);
	}




	function jsonToTable (obj) {
		for (var i in obj) {
			if (obj.hasOwnProperty(i)) {
				if (typeof obj[i] === 'object') {
					obj[i] = jsonToTable(obj[i]);
					
				} else if (obj[i] === null) {
					obj[i] = undefined;
				}
			}
		}
		
		return new shine.Table(obj);
	};




	

// vm/src/utils.js:

	shine.utils = {


		/**
		 * Coerces a value from its current type to a boolean in the same manner as Lua.
		 * @param {Object} val The value to be converted.
		 * @param {String} [error] The error message to throw if the conversion fails.
		 * @returns {Boolean} The converted value.
		 */
		coerceToBoolean: function (val, errorMessage) {
			return !(val === false || val === undefined);
		},




		/**
		 * Coerces a value from its current type to a string in the same manner as Lua.
		 * @param {Object} val The value to be converted.
		 * @param {String} [error] The error message to throw if the conversion fails.
		 * @returns {String} The converted value.
		 */
		coerceToString: function (val, errorMessage) {
			switch(true) {
				case typeof val == 'string': 
					return val;

				case val === undefined:
				case val === null: 
					return 'nil';
				
				case val === Infinity: 
					return 'inf';

				case val === -Infinity: 
					return '-inf';

				case typeof val == 'number': 
				case typeof val == 'boolean': 
					return window.isNaN(val)? 'nan' : '' + val;

				default: 
					return throwCoerceError(val, errorMessage) || '';
			}
		},




		/**
		 * Coerces a value from its current type to a number in the same manner as Lua.
		 * @param {Object} val The value to be converted.
		 * @param {String} [error] The error message to throw if the conversion fails.
		 * @returns {Number} The converted value.
		 */
		coerceToNumber: function (val, errorMessage) {
			var n, match, mantissa;

			switch (true) {
				case typeof val == 'number': return val;
				case val === undefined: return;
				case val === 'inf': return Infinity;
				case val === '-inf': return -Infinity;
				case val === 'nan': return NaN;

				default:
					if (('' + val).match(FLOATING_POINT_PATTERN)) {
						n = parseFloat(val);

					} else if (match = ('' + val).match(HEXIDECIMAL_CONSTANT_PATTERN)) {
						mantissa = match[3];

						if ((n = match[2]) || mantissa) {
							n = parseInt(n, 16) || 0;
							if (mantissa) n += parseInt(mantissa, 16) / Math.pow(16, mantissa.length);
							if (match[1]) n *= -1;
						}
					}

					if (n === undefined) throwCoerceError(val, errorMessage);
					return n;
			}

		},




		/**
		 * Converts a Lua table and all of its nested properties to a JavaScript objects or arrays.
		 * @param {shine.Table} table The Lua table object.
		 * @returns {Object} The converted object.
		 */
		toObject: function (table) {
			var isArr = shine.lib.table.getn (table) > 0,
				result = shine.gc['create' + (isArr? 'Array' : 'Object')](),
				numValues = table.__shine.numValues,
				i,
				l = numValues.length;

			for (i = 1; i < l; i++) {
				result[i - 1] = ((numValues[i] || shine.EMPTY_OBJ) instanceof shine.Table)? shine.utils.toObject(numValues[i]) : numValues[i];
			}

			for (i in table) {
				if (table.hasOwnProperty(i) && !(i in shine.Table.prototype) && i !== '__shine') {
					result[i] = ((table[i] || shine.EMPTY_OBJ) instanceof shine.Table)? shine.utils.toObject(table[i]) : table[i];
				}
			}
			
			return result;
		},
		
		
		
		
		/**
		 * Parses a JSON string to a table.
		 * @param {String} json The JSON string.
		 * @returns {shine.Table} The resulting table.
		 */
		parseJSON: function (json) {
			return jsonToTable(JSON.parse(json));
		},
		
		


		/**
		 * Makes an HTTP GET request.
		 * @param {String} url The URL to request.
		 * @param {Function} success The callback to be executed upon a successful outcome.
		 * @param {Function} error The callback to be executed upon an unsuccessful outcome.
		 */
		get: function (url, success, error) {
			var xhr = new XMLHttpRequest(),
				parse;

			xhr.open('GET', url, true);


			// Use ArrayBuffer where possible. Luac files do not load properly with 'text'.
			if ('ArrayBuffer' in window) {
				xhr.responseType = 'arraybuffer';

				parse = function (data) {
					// There is a limit on the number of arguments one can pass to a function. So far iPad is the lowest, and 10000 is safe.
					// If safe number of arguments to pass to fromCharCode:
					if (data.byteLength <= 10000) return String.fromCharCode.apply(String, Array.prototype.slice.call(new Uint8Array(data)));

					// otherwise break up bytearray:
					var i, l,
						arr = new Uint8Array(data),
						result = '';

					for (i = 0, l = data.byteLength; i < l; i += 10000) {
						result += String.fromCharCode.apply(String, Array.prototype.slice.call(arr.subarray(i, Math.min(i + 10000, l))));
					}

					return result;
				};

			} else {
				xhr.responseType = 'text';
				parse = function (data) { return data; };
			}


			xhr.onload = function (e) {
				if (this.status == 200) {
					if (success) success(parse(this.response));
				} else {
					if (error) error(this.status);
				}
			}

			xhr.send(shine.EMPTY_OBJ);
	    }

	
	};


})(shine || {});




// vm/src/output.js:



'use strict';


(function (shine) {


	// Standard output
	shine.stdout = {};

	shine.stdout.write = function (message) {
		// Overwrite this in host application
		if (console && console.log) {
			console.log(message);
		} else if (trace) {
			trace(message);
		}
	};




	// Standard debug output
	shine.stddebug = {};

	shine.stddebug.write = function (message) {
		// Moonshine bytecode debugging output
	};




	// Standard error output
	shine.stderr = {};

	shine.stderr.write = function (message, level) {
		level = level || 'error';
		if (console && console[level]) console[level](message);
	};


})(shine || {});;var module = module; if (typeof module != 'undefined') module.exports = shine;