 /*
 * Moonshine Lua VM
 * http://moonshinejs.org
 *
 * Copyright 2013 Gamesys Limited.
 * Distributed under the terms of the XXXXXXXXXX license.
 * http://moonshinejs.org/license
 */
 

// vm/src/gc.js:



var shine = shine || {};


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
		this.collected++;
	},




	/**
	 * Prepare an object for reuse.
	 * @param {Object} obj Object to be used.
	 */
	cacheObject: function (obj) {
		for (var i in obj) if (obj.hasOwnProperty(i)) delete obj[i];
		this.objects.push(obj);
		this.collected++;
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



// vm/src/EventEmitter.js:


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
			result = listeners[i].apply (this, data);
			if (result !== undefined && !result) break;
		}
	}
};




/**
 * Adds an event listener.
 * @param {string} name Name of the event.
 * @param {Function} Callback Listener function.
 */
shine.EventEmitter.prototype.bind = function (name, callback) {
	if (!this._listeners[name]) this._listeners[name] = [];
	this._listeners[name].push (callback);
}




/**
 * Removes an event listener.
 * @param {string} name Name of the event.
 * @param {Function} Callback Listener function to be removed.
 */
shine.EventEmitter.prototype.unbind = function (name, callback) {
	for (var i in this._listeners[name]) {
		if (this._listeners[name].hasOwnProperty(i) && this._listeners[name][i] === callback) this._listeners[name].splice (i, 1);
	}
}



// vm/src/VM.js:


var shine = shine || {};



/**
 * A Lua virtual machine.
 * @constructor
 * @extends shine.EventEmitter
 * @param {object} env Object containing global variables and methods from the host.
 */
shine.VM = function (env) {
	shine.EventEmitter.call (this);
	
	this._files = [];
	this._env = env || {};
	this._coroutineStack = [];
	
	this._resetGlobals ();
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
			file = new shine.File (url);
			
			this._files.push (file);

			file.bind ('loaded', function (data) {
				me._trigger ('loaded-file', file);
				if (execute || execute === undefined) me.execute (coConfig, file);
			});

			this._trigger ('loading-file', file);
			file.load ();

			break;


		case 'object':
			file = new shine.File ();
			file.data = url;
			if (execute || execute === undefined) me.execute (coConfig, file);

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
			if (!file.data) throw new Error ('Tried to execute file before data loaded.');
		
		
			thread = this._thread = new shine.Function (this, file, file.data, this._globals);
			this._trigger ('executing', [thread, coConfig]);
			
			try {
				if (!coConfig) {
					thread.call ();
					
				} else {
					var co = shine.lib.coroutine.wrap (thread),
						resume = function () {
							co ();
							if (coConfig.uiOnly && co._coroutine.status != 'dead') window.setTimeout (resume, 1);
						};
		
					resume ();
				}
				
			} catch (e) {
				shine.Error.catchExecutionError (e);
			}
		}
	}
};




/**
 * Creates or updates a global object in the guest environment.
 * @param {string} name Name of the global variable.
 * @param {object} value Value.
 */
shine.VM.prototype.setGlobal = function (name, value) {
	this._globals[name] = value;
};




/**
 * Dumps memory associated with the VM.
 */
shine.VM.prototype.dispose = function () {
	var thread;

	for (var i in this._files) if (this._files.hasOwnProperty(i)) this._files[i].dispose ();

	if (thread = this._thread) thread.dispose ();

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


// vm/src/Register.js:




/**
 * Represents a register.
 * @constructor
 */
shine.Register = function () {
	this._items = shine.gc.createArray();
}


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
}




/**
 * Returns the number of items in the register.
 * @returns {Number} Number of items.
 */
shine.Register.prototype.getLength = function () {
	return this._items.length;
}




/**
 * Retrieves an item from the register.
 * @param {Number} index Index of the item.
 * @returns {Object} Value of the item.
 */
shine.Register.prototype.getItem = function (index) {
	return this._items[index];
}




/**
 * Sets the value an item in the register.
 * @param {Number} index Index of the item.
 * @param {Object} value Value of the item.
 */
shine.Register.prototype.setItem = function (index, value) {
	var item = this._items[index];
	shine.gc.decrRef(item);

	item = this._items[index] = value;
	shine.gc.incrRef(item);
}




/**
 * Rewrites the values of all the items in the register.
 * @param {Array} arr The entire register.
 */
shine.Register.prototype.set = function (arr) {
	var i, 
		l = Math.max(arr.length, this._items.length);

	for (i = 0; i < l; i++) this.setItem(i, arr[i]);
}




/**
 * Inserts new items at the end of the register.
 * @param {...Object} One or more items to be inserted.
 */
shine.Register.prototype.push = function () {
	this._items.push.apply(this._items, arguments);
}




/**
 * Removes an item from the register.
 * @param {Number} index Index of the item to remove.
 */
shine.Register.prototype.clearItem = function (index) {
	delete this._items[index];
}




/**
 * Splices the register.
 * @param {Number} index Index of the first item to remove.
 * @param {Number} length Number of items to remove.
 * @param {...Object} One or more items to be inserted.
 */
shine.Register.prototype.splice = function (index, length) {
	this._items.splice.apply(this._items, arguments);
}




/**
 * Empties the register.
 */
shine.Register.prototype.reset = function () {
	for (var i = 0, l = this._items.length; i < l; i++) shine.gc.decrRef(this._items[i]);
	this._items.length = 0;
}




/**
 * Cleans up the register and caches it for reuse.
 */
shine.Register.prototype.dispose = function () {
	this._items.reset();
	this.constructor._graveyard.push(this);
}



// vm/src/Closure.js:


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
	
	//shine.EventEmitter.call (this);

	this._vm = vm;
	this._globals = globals;
	this._file = file;
	this._data = data;

	this._upvalues = upvalues || shine.gc.createObject();
	this._constants = data.constants;
	this._functions = data.functions;
	this._instructions = data.instructions;

	this._register = this._register || shine.Register.create();
	this._pc = 0;
	this._localsUsedAsUpvalues = this._localsUsedAsUpvalues || shine.gc.createArray();
	this._funcInstances = this._funcInstances || shine.gc.createArray();

	
	var me = this,
		result = function () { 
			var args = shine.gc.createArray();
			for (var i = 0, l = arguments.length; i < l; i++) args.push (arguments[i]);
			return me.execute (args);
		};
		
	result._instance = this;

	result.dispose = function () {
		me.dispose ();
		delete this.dispose;
	};

	return result;
};


shine.Closure.prototype = {};//new shine.EventEmitter ();
shine.Closure.prototype.constructor = shine.Closure;

shine.Closure._graveyard = [];


shine.Closure.create = function (vm, file, data, globals, upvalues) {
	var instance = shine.Closure._graveyard.pop();
	//console.log (instance? 'reusing' : 'creating');
	
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
	this._pc = 0;

	//if (this._data && this._data.sourceName) shine.stddebug.write ('Executing ' + this._data.sourceName + '...'); //? ' ' + this._data.sourceName : ' function') + '...<br><br>');
	//shine.stddebug.write ('\n');

	// ASSUMPTION: Parameter values are automatically copied to R(0) onwards of the function on initialisation. This is based on observation and is neither confirmed nor denied in any documentation. (Different rules apply to v5.0-style VARARG functions)
	this._params = shine.gc.createArray().concat(args);
	this._register.set(args.splice (0, this._data.paramCount));

	if (this._data.is_vararg == 7) {	// v5.0 compatibility (LUA_COMPAT_VARARG)
		var arg = [].concat (args),
			length = arg.length;
					
		arg = new shine.Table (arg);
		arg.setMember ('n', length);
		
		this._register.push (arg);
	}
	
	try {
		return this._run ();
		
	} catch (e) {
		if (!((e || shine.EMPTY_OBJ) instanceof shine.Error)) {
			var stack = (e.stack || '');

			e = new shine.Error ('Error in host call: ' + e.message);
			e.stack = stack;
			e.luaStack = stack.split ('\n');
		}

		if (!e.luaStack) e.luaStack = shine.gc.createArray();
		e.luaStack.push ('at ' + (this._data.sourceName || 'function') + (this._data.linePositions? ' on line ' + this._data.linePositions[this._pc - 1] : ''));
	
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
		yieldVars;

	this.terminated = false;
	
	
	if (shine.debug.status == 'resuming') {
	 	if (shine.debug.resumeStack.length) {
			this._pc--;
			
		} else {
			shine.debug.status = 'running';
		}

	} else if (shine.Coroutine._running && shine.Coroutine._running.status == 'resuming') {
	 	if (shine.Coroutine._running._resumeStack.length) {
			this._pc--;
			
		} else {
			shine.Coroutine._running.status = 'running';
			//shine.stddebug.write ('[coroutine resumed]\n');
	
			yieldVars = shine.Coroutine._running._yieldVars;
		}
	}	
	

	if (yieldVars) {
		// instruction = this._instructions[this._pc - 1];

		var offset = (this._pc - 1) * 4,
			a = this._instructions[offset + 1],
			b = this._instructions[offset + 2],
			c = this._instructions[offset + 3],
			retvals = shine.gc.createArray();

		for (var i = 0, l = yieldVars.length; i < l; i++) retvals.push (yieldVars[i]);

		if (c === 0) {
			l = retvals.length;
		
			for (i = 0; i < l; i++) {
				this._register.setItem(a + i, retvals[i]);
			}

			this._register.splice (a + l);
		
		} else {
			for (i = 0; i < c - 1; i++) {
				this._register.setItem(a + i, retvals[i]);
			}
		}

		shine.gc.collect(retvals);
	}


	while (this._instructions[this._pc * 4] !== undefined) {
		line = this._data.linePositions && this._data.linePositions[this._pc];

		retval = this._executeInstruction (this._pc++, line);

		if (shine.Coroutine._running && shine.Coroutine._running.status == 'suspending') {
			shine.Coroutine._running._resumeStack.push (this);

			if (shine.Coroutine._running._func._instance == this) {
				retval = shine.Coroutine._running._yieldVars;

				shine.Coroutine._running.status = 'suspended';
				shine.Coroutine._remove ();

				//shine.stddebug.write ('[coroutine suspended]\n');
				
				return retval;
			}
			
			return;
		}

		if (shine.debug.status == 'suspending' && !retval) {
			shine.debug.resumeStack.push (this);			
			return retval;
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
	var offset = pc * 4,
		opcode = this._instructions[offset],
		op = this.constructor.OPERATIONS[opcode],
		A = this._instructions[offset + 1],
		B = this._instructions[offset + 2],
		C = this._instructions[offset + 3];

	if (!op) throw new Error ('Operation not implemented! (' + opcode + ')');

	// if (shine.debug.status != 'resuming') {
	// 	var tab = '',
	// 		opName = this.constructor.OPERATION_NAMES[opcode];
			
	// 	for (var i = 0; i < this._index; i++) tab += '\t';
	// 	shine.stddebug.write (tab + '[' + this._pc + ']\t' + line + '\t' + opName + '\t' + A + '\t' + B + (C !== undefined? '\t' + C : ''));
	// }

	return op.call (this, A, B, C);
};
	



/**
 * Returns the value of the constant registered at a given index.
 * @param {number} index Array containing arguments to use.
 * @returns {object} Value of the constant.
 */
shine.Closure.prototype._getConstant = function (index) {
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
		if (this._funcInstances.hasOwnProperty(i) && this._funcInstances[i].isRetained ()) return true;
	}

	return false;
};





/**
 * Dump memory associtated with closure.
 */
shine.Closure.prototype.dispose = function (force) {

	if (force || !this.hasRetainedScope ()) {
		delete this._vm;
		delete this._globals;
		delete this._file;
		delete this._data;
	
		delete this._functions;
		delete this._instructions;
	
		// delete this._register;
		delete this._pc;
		// delete this._funcInstances;
	
//		delete this._listeners;
		shine.gc.collect(this._params);
		delete this._params;
	
		delete this._constants;

//		delete this._localsUsedAsUpvalues;

		shine.gc.collect(this._upvalues);
		delete this._upvalues;

		this._register.reset();
		this._funcInstances.length = 0;
		this._localsUsedAsUpvalues.length = 0;

		shine.Closure._graveyard.push(this);
	//	console.log ('graveyard');
	}
	
};






// Operation handlers:
// Note: The Closure instance is passed in as the "this" object for these handlers.
(function () {
	

	function move (a, b) {
		this._register.setItem(a, this._register.getItem(b));
	}

			


	function loadk (a, bx) {
		this._register.setItem(a, this._getConstant (bx));
	}




	function loadbool (a, b, c) {
		this._register.setItem(a, !!b);
		if (c) this._pc++;
	}
		



	function loadnil (a, b) {
		for (var i = a; i <= b; i++) this._register.setItem(i, undefined);
	}




	function getupval (a, b) {
		if (this._upvalues[b] === undefined) return;
		this._register.setItem(a, this._upvalues[b].getValue ());
	}

		


	function getglobal (a, b) {

		if (this._getConstant (b) == '_G') {	// Special case
			this._register.setItem(a, new shine.Table (this._globals));
			
		} else if (this._globals[this._getConstant (b)] !== undefined) {
			this._register.setItem(a, this._globals[this._getConstant (b)]);

		} else {
			this._register.setItem(a, undefined);
		}
	}

		


	function gettable (a, b, c) {
		c = (c >= 256)? this._getConstant (c - 256) : this._register.getItem(c);

		if (this._register.getItem(b) === undefined) {
			throw new shine.Error ('Attempt to index a nil value (' + c + ' not present in nil)');

		} else if ((this._register.getItem(b) || shine.EMPTY_OBJ) instanceof shine.Table) {
			this._register.setItem(a, this._register.getItem(b).getMember(c));

		} else if (typeof this._register.getItem(b) == 'string' && shine.lib.string[c]) {
			this._register.setItem(a, shine.lib.string[c]);

		} else {
			this._register.setItem(a, this._register.getItem(b)[c]);
		}
	}




	function setglobal(a, b) {
		var varName = this._getConstant(b),
			oldValue = this._globals[varName],
			newValue = this._register.getItem(a);

		this._globals[varName] = newValue;

		shine.gc.decrRef(oldValue);
		shine.gc.incrRef(newValue);
	}




	function setupval (a, b) {
		this._upvalues[b].setValue (this._register.getItem(a));
	}




	function settable (a, b, c) {
		b = (b >= 256)? this._getConstant (b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant (c - 256) : this._register.getItem(c);

		if ((this._register.getItem(a) || shine.EMPTY_OBJ) instanceof shine.Table) {
			this._register.getItem(a).setMember (b, c);
		
		} else if (this._register.getItem(a) === undefined) {
			throw new shine.Error ('Attempt to index a missing field (can\'t set "' + b + '" on a nil value)');
			
		} else {
			this._register.getItem(a)[b] = c;
		}
	}




	function newtable (a, b, c) {
		var t = new shine.Table ();
		t.__shine.refCount = 0;
		this._register.setItem(a, t);
	}




	function self (a, b, c) {
		c = (c >= 256)? this._getConstant (c - 256) : this._register.getItem(c);
		this._register.setItem(a + 1, this._register.getItem(b));

		if (this._register.getItem(b) === undefined) {
			throw new shine.Error ('Attempt to index a nil value (' + c + ' not present in nil)');

		} else if ((this._register.getItem(b) || shine.EMPTY_OBJ) instanceof shine.Table) {
			this._register.setItem(a, this._register.getItem(b).getMember (c));

		} else if (typeof this._register.getItem(b) == 'string' && shine.lib.string[c]) {
			this._register.setItem(a, shine.lib.string[c]);

		} else {
			this._register.setItem(a, this._register.getItem(b)[c]);					
		}
	}




	function add (a, b, c) {
		//TODO: Extract the following RK(x) logic into a separate method.
		b = (b >= 256)? this._getConstant (b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant (c - 256) : this._register.getItem(c);

		var coerce = shine.utils.coerce,
			mt, f, bn, cn;

		if (((b || shine.EMPTY_OBJ) instanceof shine.Table && (mt = b.__shine.metatable) && (f = mt.getMember ('__add')))
		|| ((c || shine.EMPTY_OBJ) instanceof shine.Table && (mt = c.__shine.metatable) && (f = mt.getMember ('__add')))) {
			this._register.setItem(a, f.apply (null, [b, c], true)[0]);

		} else {
			b = coerce(b, 'number', 'attempt to perform arithmetic on a non-numeric value');
			c = coerce(c, 'number', 'attempt to perform arithmetic on a non-numeric value');
			this._register.setItem(a, b + c);
		}
	}




	function sub (a, b, c) {
		b = (b >= 256)? this._getConstant (b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant (c - 256) : this._register.getItem(c);

		var coerce = shine.utils.coerce,
			mt, f;

		if (((b || shine.EMPTY_OBJ) instanceof shine.Table && (mt = b.__shine.metatable) && (f = mt.getMember ('__sub')))
		|| ((c || shine.EMPTY_OBJ) instanceof shine.Table && (mt = c.__shine.metatable) && (f = mt.getMember ('__sub')))) {
			this._register.setItem(a, f.apply (null, [b, c], true)[0]);

		} else {
			b = coerce(b, 'number', 'attempt to perform arithmetic on a non-numeric value');
			c = coerce(c, 'number', 'attempt to perform arithmetic on a non-numeric value');
			this._register.setItem(a, b - c);
		}
	}




	function mul (a, b, c) {
		b = (b >= 256)? this._getConstant (b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant (c - 256) : this._register.getItem(c);

		var coerce = shine.utils.coerce,
			mt, f;

		if (((b || shine.EMPTY_OBJ) instanceof shine.Table && (mt = b.__shine.metatable) && (f = mt.getMember ('__mul')))
		|| ((c || shine.EMPTY_OBJ) instanceof shine.Table && (mt = c.__shine.metatable) && (f = mt.getMember ('__mul')))) {
			this._register.setItem(a, f.apply (null, [b, c], true)[0]);

		} else {
			b = coerce(b, 'number', 'attempt to perform arithmetic on a non-numeric value');
			c = coerce(c, 'number', 'attempt to perform arithmetic on a non-numeric value');
			this._register.setItem(a, b * c);
		}
	}




	function div (a, b, c) {
		b = (b >= 256)? this._getConstant (b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant (c - 256) : this._register.getItem(c);

		var coerce = shine.utils.coerce,
			mt, f;

		if (((b || shine.EMPTY_OBJ) instanceof shine.Table && (mt = b.__shine.metatable) && (f = mt.getMember ('__div')))
		|| ((c || shine.EMPTY_OBJ) instanceof shine.Table && (mt = c.__shine.metatable) && (f = mt.getMember ('__div')))) {
			this._register.setItem(a, f.apply (null, [b, c], true)[0]);

		} else {
			b = coerce(b, 'number', 'attempt to perform arithmetic on a non-numeric value');
			c = coerce(c, 'number', 'attempt to perform arithmetic on a non-numeric value');
			this._register.setItem(a, b / c);
		}
	}




	function mod (a, b, c) {
		b = (b >= 256)? this._getConstant (b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant (c - 256) : this._register.getItem(c);
		
		var coerce = shine.utils.coerce,
			mt, f, result, absC;

		if (((b || shine.EMPTY_OBJ) instanceof shine.Table && (mt = b.__shine.metatable) && (f = mt.getMember ('__mod')))
		|| ((c || shine.EMPTY_OBJ) instanceof shine.Table && (mt = c.__shine.metatable) && (f = mt.getMember ('__mod')))) {
			this._register.setItem(a, f.apply (null, [b, c], true)[0]);

		} else {
			b = coerce(b, 'number', 'attempt to perform arithmetic on a non-numeric value');
			c = coerce(c, 'number', 'attempt to perform arithmetic on a non-numeric value');

			if (c === 0 || c === -Infinity || c === Infinity || window.isNaN(b) || window.isNaN(c)) {
				result = NaN;

			} else {
				result = Math.abs(b) % (absC = Math.abs(c));
				if (b * c < 0) result = absC - result;
				if (c < 0) result *= -1;
			}

			this._register.setItem(a, result);
		}
	}




	function pow (a, b, c) {
		b = (b >= 256)? this._getConstant (b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant (c - 256) : this._register.getItem(c);

		var coerce = shine.utils.coerce,
			mt, f;

		if (((b || shine.EMPTY_OBJ) instanceof shine.Table && (mt = b.__shine.metatable) && (f = mt.getMember ('__pow')))
		|| ((c || shine.EMPTY_OBJ) instanceof shine.Table && (mt = c.__shine.metatable) && (f = mt.getMember ('__pow')))) {
			this._register.setItem(a, f.apply (null, [b, c], true)[0]);

		} else {
			b = coerce(b, 'number', 'attempt to perform arithmetic on a non-numeric value');
			c = coerce(c, 'number', 'attempt to perform arithmetic on a non-numeric value');
			this._register.setItem(a, Math.pow (b, c));
		}
	}




	function unm (a, b) {
		var mt, f;

		if ((this._register.getItem(b) || shine.EMPTY_OBJ) instanceof shine.Table && (mt = this._register.getItem(b).__shine.metatable) && (f = mt.getMember ('__unm'))) {
			this._register.setItem(a, f.apply (null, [this._register.getItem(b)], true)[0]);

		} else {
			b = shine.utils.coerce(this._register.getItem(b), 'number', 'attempt to perform arithmetic on a non-numeric value');
			this._register.setItem(a, -b);
		}
	}




	function not (a, b) {
		this._register.setItem(a, !this._register.getItem(b));
	}




	function len (a, b) {
		var length = 0;

		if ((this._register.getItem(b) || shine.EMPTY_OBJ) instanceof shine.Table) {

			//while (this._register.getItem(b)[length + 1] != undefined) length++;
			//this._register.setItem(a, length);
			this._register.setItem(a, shine.lib.table.getn (this._register.getItem(b)));

		} else if (typeof this._register.getItem(b) == 'object') {				
			for (var i in this._register.getItem(b)) if (this._register.getItem(b).hasOwnProperty (i)) length++;
			this._register.setItem(a, length);

		} else if (this._register.getItem(b) == undefined) {
			throw new shine.Error ('attempt to get length of a nil value');

		} else if (this._register.getItem(b).length === undefined) {
			this._register.setItem(a, undefined);
			
		} else {
			this._register.setItem(a, this._register.getItem(b).length);
		}
	}




	function concat (a, b, c) {

		var text = this._register.getItem(c),
			mt, f;

		for (var i = c - 1; i >= b; i--) {
			if (((this._register.getItem(i) || shine.EMPTY_OBJ) instanceof shine.Table && (mt = this._register.getItem(i).__shine.metatable) && (f = mt.getMember ('__concat')))
			|| ((text || shine.EMPTY_OBJ) instanceof shine.Table && (mt = text.__shine.metatable) && (f = mt.getMember ('__concat')))) {
				text = f.apply (null, [this._register.getItem(i), text], true)[0];

			} else {
				if (!(typeof this._register.getItem(i) === 'string' || typeof this._register.getItem(i) === 'number') || !(typeof text === 'string' || typeof text === 'number')) throw new shine.Error ('Attempt to concatenate a non-string or non-numeric value');
				text = this._register.getItem(i) + text;
			}
		}

		this._register.setItem(a, text);
	}




	function jmp (a, sbx) {
		this._pc += sbx;
	}




	function eq (a, b, c) {
		b = (b >= 256)? this._getConstant (b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant (c - 256) : this._register.getItem(c);

		var mtb, mtc, f, result;

		if (b !== c && (b || shine.EMPTY_OBJ) instanceof shine.Table && (c || shine.EMPTY_OBJ) instanceof shine.Table && (mtb = b.__shine.metatable) && (mtc = c.__shine.metatable) && mtb === mtc && (f = mtb.getMember ('__eq'))) {
			result = !!f.apply (null, [b, c], true)[0];			
		} else {
			result = (b === c);
		}
		
		if (result != a) this._pc++;
	}




	function lt (a, b, c) {
		b = (b >= 256)? this._getConstant (b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant (c - 256) : this._register.getItem(c);

		var typeB = (typeof b != 'object' && typeof b) || ((b || shine.EMPTY_OBJ) instanceof shine.Table && 'table') || 'userdata',
			typeC = (typeof c != 'object' && typeof b) || ((c || shine.EMPTY_OBJ) instanceof shine.Table && 'table') || 'userdata',
			f, result, mtb, mtc;

		if (typeB !== typeC) {
			throw new shine.Error ('attempt to compare ' + typeB + ' with ' + typeC);
			
		} else if (typeB == 'table') {
			if ((mtb = b.__shine.metatable) && (mtc = c.__shine.metatable) && mtb === mtc && (f = mtb.getMember ('__lt'))) {
				result = f.apply (null, [b, c], true)[0];
			} else {
				throw new shine.Error ('attempt to compare two table values');
			}

		} else {
			result = (b < c);
		}
		
		if (result != a) this._pc++;
	}




	function le (a, b, c) {
		b = (b >= 256)? this._getConstant (b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant (c - 256) : this._register.getItem(c);

		var typeB = (typeof b != 'object' && typeof b) || ((b || shine.EMPTY_OBJ) instanceof shine.Table && 'table') || 'userdata',
			typeC = (typeof c != 'object' && typeof b) || ((c || shine.EMPTY_OBJ) instanceof shine.Table && 'table') || 'userdata',
			f, result, mtb, mtc;

		if (typeB !== typeC) {
			throw new shine.Error ('attempt to compare ' + typeB + ' with ' + typeC);
			
		} else if (typeB == 'table') {
			if ((mtb = b.__shine.metatable) && (mtc = c.__shine.metatable) && mtb === mtc && (f = mtb.getMember ('__le'))) {
				result = f.apply (null, [b, c], true)[0];
			} else {
				throw new shine.Error ('attempt to compare two table values');
			}

		} else {
			result = (b <= c);
		}
		
		if (result != a) this._pc++;
	}




	function test (a, b, c) {
		if (this._register.getItem(a) === 0 || this._register.getItem(a) === '') {
			if (!c) this._pc++;
		} else {
			if (!this._register.getItem(a) !== !c) this._pc++;
		}
	}




	function testset (a, b, c) {
		if (!this._register.getItem(b) !== !c) {
			this._register.setItem(a, this._register.getItem(b));
		} else {
			this._pc++;
		}
	}




	function call (a, b, c) {

		var args = shine.gc.createArray(), 
			i, l,
			retvals,
			funcToResume,
			f, o, mt;


		if (shine.debug.status == 'resuming') {
			funcToResume = shine.debug.resumeStack.pop ();
			
			if ((funcToResume || shine.EMPTY_OBJ) instanceof shine.Coroutine) {
				retvals = funcToResume.resume ();
			} else {
				retvals = funcToResume._run ();
			}
			
		} else if (shine.Coroutine._running && shine.Coroutine._running.status == 'resuming') {
			funcToResume = shine.Coroutine._running._resumeStack.pop ()
			retvals = funcToResume._run ();
			
		} else {
			if (b === 0) {
				l = this._register.getLength();
			
				for (i = a + 1; i < l; i++) {
					args.push (this._register.getItem(i));
				}

			} else {
				for (i = 0; i < b - 1; i++) {
					args.push (this._register.getItem(a + i + 1));
				}
			}
		}


		if (!funcToResume) {
			o = this._register.getItem(a);

			if ((o || shine.EMPTY_OBJ) instanceof shine.Function) {
				retvals = o.apply (null, args, true);

			} else if (o && o.apply) {
				retvals = o.apply (null, args);

			} else if (o && (o || shine.EMPTY_OBJ) instanceof shine.Table && (mt = o.__shine.metatable) && (f = mt.getMember ('__call')) && f.apply) {
				args.unshift (o);
				retvals = f.apply (null, args, true);

			} else {
	 			throw new shine.Error ('Attempt to call non-function');
			}
		}
		
		shine.gc.collect(args);

		if (!((retvals || shine.EMPTY_OBJ) instanceof Array)) retvals = [retvals];
		if (shine.Coroutine._running && shine.Coroutine._running.status == 'suspending') return;


		if (c === 0) {
			l = retvals.length;
			
			for (i = 0; i < l; i++) {
				this._register.setItem(a + i, retvals[i]);
			}

			this._register.splice (a + l);
			
		} else {
			for (i = 0; i < c - 1; i++) {
				this._register.setItem(a + i, retvals[i]);
			}
		}
		
	}




	function tailcall (a, b) {	
		return call.call (this, a, b, 0);
		
		// NOTE: Currently not replacing stack, so infinately recursive calls WOULD drain memory, unlike how tail calls were intended.
		// TODO: For non-external function calls, replace this stack with that of the new function. Possibly return the Function and handle the call in the RETURN section (for the calling function).
	}




	function return_ (a, b) {
		var retvals = shine.gc.createArray(),
			val,
			i, l;

		if (b === 0) {
			l = this._register.getLength();
			
			for (i = a; i < l; i++) {
				retvals.push (this._register.getItem(i));
			}

		} else {
			for (i = 0; i < b - 1; i++) {
				retvals.push (val = this._register.getItem(a + i));
				shine.gc.incrRef(val);
			}
		}


		// for (var i = 0, l = this._localsUsedAsUpvalues.length; i < l; i++) {
		// 	var local = this._localsUsedAsUpvalues[i];

		// 	local.upvalue.value = this._register.getItem(local.registerIndex);
		// 	local.upvalue.open = false;

		// 	this._localsUsedAsUpvalues.splice (i--, 1);
		// 	l--;
		// 	this._register.clearItem(local.registerIndex);
		// }
		close.call(this, 0);
		
//		this._register.reset();
		this.dead = true;
		
		return retvals;
	}




	function forloop (a, sbx) {
		this._register.setItem(a, this._register.getItem(a) + this._register.getItem(a + 2));
		var parity = this._register.getItem(a + 2) / Math.abs (this._register.getItem(a + 2));
		
		if ((parity === 1 && this._register.getItem(a) <= this._register.getItem(a + 1)) || (parity !== 1 && this._register.getItem(a) >= this._register.getItem(a + 1))) {	//TODO This could be nicer
			this._register.setItem(a + 3, this._register.getItem(a));
			this._pc += sbx;
		}
	}




	function forprep (a, sbx) {
		this._register.setItem(a, this._register.getItem(a) - this._register.getItem(a + 2));
		this._pc += sbx; 
	}




	function tforloop (a, b, c) {
		var args = [this._register.getItem(a + 1), this._register.getItem(a + 2)],
			retvals = this._register.getItem(a).apply (null, args),
			index;

		if (!((retvals || shine.EMPTY_OBJ) instanceof Array)) retvals = [retvals];
		if (retvals[0] && retvals[0] === '' + (index = parseInt (retvals[0], 10))) retvals[0] = index;
		
		for (var i = 0; i < c; i++) this._register.setItem(a + i + 3, retvals[i]);

		if (this._register.getItem(a + 3) !== undefined) {
			this._register.setItem(a + 2, this._register.getItem(a + 3));
		} else {
			this._pc++;
		}
	}




	function setlist (a, b, c) {
		var length = b || this._register.getLength() - a - 1,
		i;
		
		for (i = 0; i < length; i++) {
			this._register.getItem(a).setMember (50 * (c - 1) + i + 1, this._register.getItem(a + i + 1));
		}
	}




	function close (a, b, c) {
		for (var i = 0, l = this._localsUsedAsUpvalues.length; i < l; i++) {
			var local = this._localsUsedAsUpvalues[i];

			if (local && local.registerIndex >= a) {
				local.upvalue.value = this._register.getItem(local.registerIndex);
				local.upvalue.open = false;

				this._localsUsedAsUpvalues.splice (i--, 1);
				l--;
				this._register.clearItem(local.registerIndex);
			}
		}
	}




	function closure (a, bx) {
		var me = this,
			upvalues = shine.gc.createArray(),
			opcode;

		while ((opcode = this._instructions[this._pc * 4]) !== undefined && (opcode === 0 || opcode === 4) && this._instructions[this._pc * 4 + 1] === 0) {	// move, getupval

			(function () {
				var op = opcode,
					offset = me._pc * 4,
					A = me._instructions[offset + 1],
					B = me._instructions[offset + 2],
					C = me._instructions[offset + 3],
					upvalue;

				// shine.stddebug.write ('-> ' + me.constructor.OPERATION_NAMES[op] + '\t' + A + '\t' + B + '\t' + C);

				
				if (op === 0) {	// move
					for (var j = 0, l = me._localsUsedAsUpvalues.length; j < l; j++) {
						var up = me._localsUsedAsUpvalues[j];
						if (up.registerIndex === B) {
							upvalue = up.upvalue;
							break;
						}
					}

					if (!upvalue) {
						upvalue = {
							open: true,
							getValue: function () {
								return this.open? me._register.getItem(B) : this.value;
							},
							setValue: function (val) {
								this.open? me._register.setItem(B, val) : this.value = val;
							},
							name: me._functions[bx].upvalues[upvalues.length]
						};

						me._localsUsedAsUpvalues.push ({
							registerIndex: B,
							upvalue: upvalue
						});
					}

					upvalues.push (upvalue);
					

				} else {	//getupval
					
					upvalues.push ({
						getValue: function () {
							return me._upvalues[B].getValue ();
						},
						setValue: function (val) {
							me._upvalues[B].setValue (val);
						},
						name: me._upvalues[B].name
					});
				}
				
			})();
			
			this._pc++;
		}

		var func = new shine.Function (this._vm, this._file, this._functions[bx], this._globals, upvalues);
		//this._funcInstances.push (func);
		this._register.setItem(a, func);
	}




	function vararg (a, b) {
		var i, l,
			limit = b === 0? this._params.length - this._data.paramCount : b - 1;
		
		for (i = 0; i < limit; i++) {
			this._register.setItem(a + i, this._params[this._data.paramCount + i]);
		}

		// Assumption: Clear the remaining items in the register.
		for (i = a + limit, l = this._register.getLength(); i < l; i++) {
			this._register.clearItem(i);
		}
	}



	shine.Closure.OPERATIONS = [move, loadk, loadbool, loadnil, getupval, getglobal, gettable, setglobal, setupval, settable, newtable, self, add, sub, mul, div, mod, pow, unm, not, len, concat, jmp, eq, lt, le, test, testset, call, tailcall, return_, forloop, forprep, tforloop, setlist, close, closure, vararg];
	shine.Closure.OPERATION_NAMES = ["move", "loadk", "loadbool", "loadnil", "getupval", "getglobal", "gettable", "setglobal", "setupval", "settable", "newtable", "self", "add", "sub", "mul", "div", "mod", "pow", "unm", "not", "len", "concat", "jmp", "eq", "lt", "le", "test", "testset", "call", "tailcall", "return", "forloop", "forprep", "tforloop", "setlist", "close", "closure", "vararg"];

})();





// vm/src/Function.js:


var shine = shine || {};

/**
 * Represents a function definition.
 * @constructor
 * @extends shine.EventEmitter
 * @param {shine.File} file The file in which the function is declared.
 * @param {object} data Object containing the Luac data for the function.
 * @param {object} globals The global variables for the environment in which the function is declared.
 * @param {object} [upvalues] The upvalues passed from the parent closure.
 */
shine.Function = function (vm, file, data, globals, upvalues) {
	//shine.EventEmitter.call (this);

	this._vm = vm;
	this._file = file;
	this._data = data;
	this._globals = globals;
	this._upvalues = upvalues || shine.gc.createObject();
	this._index = shine.Function._index++;
	this.instances = shine.gc.createArray();
	this._retainCount = 0;

	// Convert instructions to byte array (where possible);
 	//if (this._data.instructions instanceof Array) this._data.instructions = new shine.InstructionSet(data.instructions);
 	this._convertInstructions();

	this.constructor._instances.push(this);
};


shine.Function.prototype = {}; //new shine.EventEmitter ();
shine.Function.prototype.constructor = shine.Function;


/**
 * Keeps a count of the number of functions created, in order to index them uniquely.
 * @type Number
 * @static
 */
shine.Function._index = 0;




/**
 * Keeps track of active functions in order to clean up on dispose.
 * @type Array
 * @static
 */
shine.Function._instances = [];




/**
 * Creates a new function instance from the definition.
 * @returns {shine.Closure} An instance of the function definition.
 */
shine.Function.prototype.getInstance = function () {
	return shine.Closure.create (this._vm, this._file, this._data, this._globals, this._upvalues); //new shine.Closure (this._vm, this._file, this._data, this._globals, this._upvalues);
};




/**
 * Converts the function's instructions from the format in file into ArrayBuffer or Array in place.
 */
shine.Function.prototype._convertInstructions = function () {
	var instructions = this._data.instructions,
		buffer,
		result,
		i, l,
		instruction,
		offset;
	
	if ('ArrayBuffer' in window) {
		if (instructions instanceof Int32Array) return;

		buffer = new ArrayBuffer(instructions.length * 4 * 4);
		result = new Int32Array(buffer);

		if (instructions.length == 0 || instructions[0].op === undefined) {
			result.set(instructions);
			this._data.instructions = result;
			return;
		}

	} else {
		if (instructions.length == 0 || instructions[0].op === undefined) return;
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
shine.Function.prototype.call = function () {
	var args = shine.gc.createArray(),
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
shine.Function.prototype.apply = function (obj, args, internal) {
	if ((obj || shine.EMPTY_OBJ) instanceof Array && !args) {
		args = obj;
		obj = undefined;
	}

	var func = internal? this.getInstance () : shine.lib.coroutine.wrap (this);
	
	try {
		return func.apply (obj, args);
//		return this.getInstance ().apply (obj, args);

	} catch (e) {
		shine.Error.catchExecutionError (e);
	}
};




/**
 * Creates a unique description of the function.
 * @returns {string} Description.
 */
shine.Function.prototype.toString = function () {
	return 'function: 0x' + this._index.toString (16);
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
 */
shine.Function.prototype.dispose = function (force) {
	this._readyToDispose = true;
	
	if (force) {
		for (var i in this.instances) {
			if (this.instances.hasOwnProperty(i)) this.instances[i].dispose(true);
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

	//for (var i in this._listeners) delete this._listeners[i];

	this.constructor._instances.splice (this.constructor._instances.indexOf(this), 1);

	return true;
};






// vm/src/Coroutine.js:


var shine = shine || {};



/**
 * Represents a single coroutine (thread).
 * @constructor
 * @extends shine.EventEmitter
 * @param {shine.Closure} closure The closure that is to be executed in the thread.
 */
shine.Coroutine = function (closure) {
	shine.EventEmitter.call (this);

	this._func = closure.getInstance ();
	this._index = shine.Coroutine._index++;
	this._started = false;
	this._yieldVars = undefined;
	this._resumeStack = this._resumeStack || shine.gc.createArray();
	this.status = 'suspended';

	shine.stddebug.write ('[coroutine created]\n');
};


shine.Coroutine.prototype = new shine.EventEmitter ();
shine.Coroutine.prototype.constructor = shine.Function;


shine.Coroutine._index = 0;
shine.Coroutine._stack = [];
shine.Coroutine._graveyard = [];


shine.Coroutine.create = function (closure) {
	var instance = shine.Coroutine._graveyard.pop();
	//console.log (instance? 'reusing' : 'creating');
	
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
	shine.Coroutine._stack.push (shine.Coroutine._running);
	shine.Coroutine._running = co;
};




/**
 * Removes a coroutine from the run stack.
 * @static
 */
shine.Coroutine._remove = function () {
	shine.Coroutine._running = shine.Coroutine._stack.pop ();
};




/**
 * Rusumes a suspended coroutine.
 * @returns {Array} Return values, either after terminating or from a yield.
 */
shine.Coroutine.prototype.resume = function () {
	var retval;

	try {
		if (this.status == 'dead') throw new shine.Error ('cannot resume dead coroutine');

		shine.Coroutine._add (this);
		
		if (shine.debug.status == 'resuming') {
			var funcToResume = shine.debug.resumeStack.pop ();
			
			if ((funcToResume || shine.EMPTY_OBJ) instanceof shine.Coroutine) {
				retval = funcToResume.resume ();
			} else {
				retval = this._func._instance._run ();
			}

		} else if (!this._started) {
			this.status = 'running';
			shine.stddebug.write ('[coroutine started]\n');

			this._started = true;
			retval = this._func.apply (null, arguments, true);

		} else {
			this.status = 'resuming';
			shine.stddebug.write ('[coroutine resuming]\n');

			var args = shine.gc.createArray();
			for (var i = 0, l = arguments.length; i < l; i++) args.push (arguments[i]);	

			this._yieldVars = args;
			retval = this._resumeStack.pop ()._run ();
		}	
	
		if (shine.debug.status == 'suspending') {
			shine.debug.resumeStack.push (this);
			return;
		}
		
		this.status = this._func._instance.terminated? 'dead' : 'suspended';

		if (retval) retval.unshift (true);

	} catch (e) {
		retval = [false, e];
		this.status = 'dead';
	}

	if (this.status == 'dead') {
		shine.Coroutine._remove ();
		shine.stddebug.write ('[coroutine terminated]\n');
		this._dispose();
	}

	return retval;
};




/**
 * Returns a unique identifier for the thread.
 * @returns {string} Description.
 */
shine.Coroutine.prototype.toString = function () {
	return 'thread: 0x' + this._index.toString (16);
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


var shine = shine || {};




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

			key = isArr? parseInt (i, 10) + 1: i;
			value = obj[i];

			if (typeof getQualifiedClassName !== 'undefined') {
				// ActionScript
				iterate = ((getQualifiedClassName(value) == "Object") && (!(value instanceof shine.Table)) && (!(value instanceof shine.Coroutine)) && (!(value instanceof shine.Function)) && (!(value instanceof shine.Closure) )) || (getQualifiedClassName(value) == "Array");
			} else {
				// JavaScript
				iterate = (typeof value == 'object' && value.constructor === Object) || value instanceof Array;
			}
			
			this.setMember(key, iterate? new shine.Table (value) : value);
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
	var index,
		value;

	switch (typeof key) {
		case 'string':
			if (this[key] !== undefined) return this[key];
			break;

		case 'number':
			value = this.__shine.numValues[key];
			if (value !== undefined) return value;

		default:
			index = this.__shine.keys.indexOf (key);
			if (index >= 0) return this.__shine.values[index];
	}
	
	var mt = this.__shine.metatable;

	if (mt && mt.__index) {
		switch (mt.__index.constructor) {
			case shine.Table: return mt.__index.getMember (key);
			case Function: return mt.__index (this, key);
			case shine.Function: return mt.__index.apply (this, [this, key])[0];
		}
	}		
};




/**
 * Sets a member of this table. If member previously didn't exist, .
 * @param {Object} key The member's key.
 * @returns {Object} The value of the member sought.
 */
shine.Table.prototype.setMember = function (key, value) {
	var mt = this.__shine.metatable,
		oldValue,
		keys,
		index;

	if (this[key] === undefined && mt && mt.__newindex) {
		switch (mt.__newindex.constructor) {
			case shine.Table: return mt.__newindex.setMember (key, value);
			case Function: return mt.__newindex (this, key, value);
			case shine.Function: return mt.__newindex.apply (this, [this, key, value])[0];
		}
	}

	switch (typeof key) {
		case 'string':
			oldValue = this[key];
			this[key] = value;
			break;


		case 'number':
			oldValue = this.__shine.numValues[key];
			this.__shine.numValues[key] = value;
			break;


		default:
			keys = this.__shine.keys;
			index = keys.indexOf(key);
			
			if (index < 0) {
				index = keys.length;
				keys[index] = key;
			}
			
			oldValue = this.__shine.values[index];
			this.__shine.values[index] = value;
	}

	shine.gc.decrRef(oldValue);
	shine.gc.incrRef(value);
};




/**
 * Returns a unique identifier for the table.
 * @returns {string} Description.
 */
shine.Table.prototype.toString = function () {
	var mt;
	
	if (this.constructor != shine.Table) return 'userdata';
	if (this.__shine && (mt = this.__shine.metatable) && mt.__tostring) return mt.__tostring.call (undefined, this);

	return 'table: 0x' + this.__shine.index.toString (16);
};





// vm/src/Error.js:


var shine = shine || {};



/**
 * An error that occurs in the Lua code.
 * @constructor
 * @param {string} message Error message.
 */
shine.Error = function (message) {
	//Error.call (this, message); //AS3 no likey
	//this.message = message;


	// The following is an ugly frigg to overcome Chromium bug: https://code.google.com/p/chromium/issues/detail?id=228909
	var err = new Error(message);

	err.constructor = this.constructor;
	err.__proto__ = this;    
	err.name = 'shine.Error';

	return err;
};


shine.Error.prototype = new Error ();
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
		e.message = e.luaMessage + '\n    ' + (e.luaStack || shine.gc.createArray()).join('\n    ');
	}

	throw e;
};




/**
 * Coerces the error to a string for logging.
 * @return {string} String representation of error.
 */
shine.Error.prototype.toString = function () {
	return 'Moonshine Error: ' + this.message;
};

// vm/src/File.js:


var shine = shine || {};



/**
 * Represents a Luac data file.
 * @constructor
 * @extends shine.EventEmitter
 * @param {string} url Address of the decompiled Luac file.
 */
shine.File = function (url) {
	shine.EventEmitter.call (this);

	this._url = url;
	this.data = undefined;
};


shine.File.prototype = new shine.EventEmitter ();
shine.File.prototype.constructor = shine.File;




/**
 * Retrieves the Luac file from the url.
 */
shine.File.prototype.load = function () {
	var me = this;

	function success (data) {
		me.data = JSON.parse(data);
		me._trigger ('loaded', me.data);
	}

	function error (code) {
		//throw new shine.Error('Unable to load file: ' + me._url + ' (' + code + ')');
		me._trigger ('error', code);
	}
	
	shine.utils.get(this._url, success, error);
};




/**
 * Retrieved the corresponding Lua file, if exists.
 * @todo
 */
shine.File.prototype.loadLua = function () {
};




/**
 * Dump memory associated with file.
 */
shine.File.prototype.dispose = function () {
	delete this._url;
	delete this.data;
};



// vm/src/lib.js:


var shine = shine || {};



(function () {

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

		randomSeed = 1;




	function getRandom () {
		randomSeed = (RANDOM_MULTIPLIER * randomSeed) % RANDOM_MODULUS;
		return randomSeed / RANDOM_MODULUS;
	}




	function translatePattern (pattern) {
		// TODO Add support for balanced character matching (not sure this is easily achieveable).
		pattern = '' + pattern;
		
		var n = 0,
			i, l, character, addSlash;
					
		for (i in ROSETTA_STONE) if (ROSETTA_STONE.hasOwnProperty(i)) pattern = pattern.replace (new RegExp(i, 'g'), ROSETTA_STONE[i]);
		l = pattern.length;

		for (i = 0; i < l; i++) {
			character = pattern.substr (i, 1);
			addSlash = false;

			if (character == '[') {
				if (n) addSlash = true;
				n++;

			} else if (character == ']') {
				n--;
				if (n) addSlash = true;
			}

			if (addSlash) {
				pattern = pattern.substr (0, i) + '\\' + pattern.substr (i++);
				l++;
			}
		}			

		return pattern;	
	}
	



	function loadfile (filename, callback) {
		var vm = this,
			file,
			pathData;

		if (filename.substr(0, 1) != '/') {
			pathData = (this._thread._file._url || '').match(/^(.*\/).*?$/);
			pathData = (pathData && pathData[1]) || '';
			filename = pathData + filename;
		}

		file = new shine.File (filename);

		file.bind ('loaded', function (data) {
			var func = new shine.Function (vm, file, file.data, vm._globals);
			vm._trigger ('module-loaded', file, func);
			
			callback(func);
		});

		file.bind ('error', function (code) {
			vm._trigger ('module-load-error', file, code);
			callback();
		});

		this._trigger ('loading-module', file);
		file.load ();
	}




	shine.lib = {
	
		
		assert: function (v, m) {
			if (v === false || v === undefined) throw new shine.Error (m || 'Assertion failed!');
			return [v, m];
		},
	
	
	
	
		collectgarbage: function (opt, arg) {
			// Unimplemented
		},
	
	
	
	
		dofile: function (filename) {
			// Unimplemented
		},
		
		
		
		
		error: function (message) {	
			throw new shine.Error (message);
		},
	
	
	
		
		getfenv: function (f) {
			// Unimplemented
		},
		
		
		
		
		/**
		 * Implementation of Lua's getmetatable function.
		 * @param {object} table The table from which to obtain the metatable.
		 */
		getmetatable: function (table) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error ('Bad argument #1 in getmetatable(). Table expected');
			return table.__shine.metatable;
		},
		
	
	
	
		ipairs: function (table) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error ('Bad argument #1 in ipairs(). Table expected');
			
			var iterator = function (table, index) {
				if (index === undefined) throw new shine.Error ('Bad argument #2 to ipairs() iterator');

				var nextIndex = index + 1;

				if (!table.__shine.numValues.hasOwnProperty (nextIndex)) return undefined;
				return [nextIndex, table.__shine.numValues[nextIndex]];
			};
	
			return [iterator, table, 0];
		},
	
	
	
		
		load: function (func, chunkname) {
			var file = new shine.File,
				chunk = '', piece, lastPiece;

			while ((piece = func()) && piece != lastPiece) {
				chunk += (lastPiece = piece);
			}

			file._data = JSON.parse(chunk);
			return new shine.Function(this, file, file._data, this._globals, shine.gc.createArray());
		},
	
	
	
		
		loadfile: function (filename) {
			var thread = shine.lib.coroutine.yield(),
				callback = function (result) {
					thread.resume(result);
				};

			loadfile.call(this, filename, callback);
		},
	
	
	
		
		loadstring: function (string, chunkname) {
			var f = function () { return string; };
			return shine.lib.load.call(this, f, chunkname);
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
				i, l;

			if (found || typeof index == 'number') {
				for (i = 1, l = numValues.length; i < l; i++) {	

					if (!found) {
						if (i === index) found = true;
		
					} else if (numValues.hasOwnProperty (i) && numValues[i] !== undefined) {
						return [i, numValues[i]];
					}
				}
			}
			
			for (i in table) {
				if (table.hasOwnProperty (i) && !(i in shine.Table.prototype) && i !== '__shine') {
					if (!found) {
						if (i == index) found = true;
	
					} else if (table.hasOwnProperty (i) && table[i] !== undefined && ('' + i).substr (0, 2) != '__') {
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
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error ('Bad argument #1 in pairs(). Table expected');
			return [shine.lib.next, table];
		},
	
		
	
	
		pcall: function (func) {
			var args = shine.gc.createArray(),
				result;
				
			for (var i = 1, l = arguments.length; i < l; i++) args.push (arguments[i]);
	
			try {			
				if (typeof func == 'function') {
					result = func.apply (null, args);
					
				} else if ((func || shine.EMPTY_OBJ) instanceof shine.Function) {
					result = func.apply (null, args, true);

				} else {
					throw new shine.Error ('Attempt to call non-function');
				}
	
			} catch (e) {
				return [false, e.message];
			}
			
			if (!((result || shine.EMPTY_OBJ) instanceof Array)) result = [result];
			result.unshift (true);
			
			return result;
		},
	
		
		
	
		print: function () {
	
			var output = shine.gc.createArray(),
				item;
			
			for (var i = 0, l = arguments.length; i< l; i++) {
				item = arguments[i];
				
				if ((item || shine.EMPTY_OBJ) instanceof shine.Table) {
					output.push ('table: 0x' + item.__shine.index.toString (16));
					
				} else if ((item || shine.EMPTY_OBJ) instanceof Function) {
					output.push ('JavaScript function: ' + item.toString ());
									
				} else if (item === undefined) {
					output.push ('nil');
					
				} else {
					output.push (shine.lib.tostring(item));
				}
//	console.log ('print>>', item);
			}
	
			return shine.stdout.write (output.join ('\t'));
		},
	
	
	
	
		rawequal: function (v1, v2) {
			return (v1 === v2);
		},
	
	
	
	
		rawget: function (table, index) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error ('Bad argument #1 in rawget(). Table expected');
			return table[index];
		},
	
	
	
	
		rawset: function (table, index, value) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error ('Bad argument #1 in rawset(). Table expected');
			if (index == undefined) throw new shine.Error ('Bad argument #2 in rawset(). Nil not allowed');
	
			table[index] = value;
			return table;
		},
	



		require: function (modname) {
			var thread,
				packageLib = shine.lib['package'],
				vm = this,
				module,
				preload,
				paths,
				path;

			function load (preloadFunc) {
				packageLib.loaded[modname] = true;
				module = preloadFunc.call(null, modname)[0];

				if (module !== undefined) packageLib.loaded[modname] = module;
				return packageLib.loaded[modname];
			}

			if (module = packageLib.loaded[modname]) return module;
			if (preload = packageLib.preload[modname]) return load(preload);

			paths = packageLib.path.replace(/;;/g, ';').split(';');
			thread = shine.lib.coroutine.yield();


			function loadNextPath () {
				path = paths.shift()

				if (!path) {
					thread.resume();
			
				} else {
					path = path.replace(/\?/g, modname);

					loadfile.call(vm, path, function (preload) {
						if (preload) {
							thread.resume(load(preload));
						} else {
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
				
			} else if (index = parseInt (index, 10)) {
				for (var i = index, l = arguments.length; i < l; i++) args.push (arguments[i]);
				return args;
				
			} else {
				throw new shine.Error ('Bad argument #1 in select(). Number or "#" expected');
			}
		},
		
	
		
		
		/**
		 * Implementation of Lua's setmetatable function.
		 * @param {object} table The table that will receive the metatable.
		 * @param {object} metatable The metatable to attach.
		 */
		setmetatable: function (table, metatable) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error ('Bad argument #1 in setmetatable(). Table expected');	
			if (!(metatable === undefined || (metatable || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error ('Bad argument #2 in setmetatable(). Nil or table expected');	

			shine.gc.decrRef(table.__shine.metatable);
			table.__shine.metatable = metatable;
			shine.gc.incrRef(metatable);

			return table;
		},
		
	
	
		
		tonumber: function (e, base) {
			// TODO: Needs a more generic algorithm to check what is valid. Lua supports all bases from 2 to 36 inclusive.
			if (e === '') return;
			
			e = ('' + e).replace (/^\s+|\s+$/g, '');	// Trim
			base = base || 10;
	
			if (base === 2 && e.match (/[^01]/)) return;
			if (base === 10 && e.match (/[^0-9e\+\-\.]/)) return;
			if (base === 16 && e.match (/[^0-9A-Fa-f]/)) return;
			
			return (base == 10)? parseFloat (e) : parseInt (e, base);
		},
		
		
		
		
		tostring: function (e) {
			switch(true) {
				case e === undefined: return 'nil';
				case e === Infinity: return 'inf';
				case e === -Infinity: return '-inf';
				case typeof e == 'number' && window.isNaN(e): return 'nan';
				default: return e.toString ();
			}
		},
		
		
		
		
		type: function (v) {
			var t = typeof (v);
	
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
			return shine.lib.table.unpack (table, i, j);
		},
		
		
		
		
		_VERSION: 'Lua 5.1',
		
		
		
		
		xpcall: function (func, err) {
			var result, success, invalid;
				
			try {
				if (typeof func == 'function') {
					result = func.apply ();
					
				} else if ((func || shine.EMPTY_OBJ) instanceof shine.Function) {
					result = func.apply (null, undefined, true);

				} else {
					invalid = true;
				}

				success = true;
				
			} catch (e) {
				result = err.apply (null, undefined, true);
				if (((result || shine.EMPTY_OBJ) instanceof Array)) result = result[0];
	
				success = false;
			}

			if (invalid) throw new shine.Error ('Attempt to call non-function');
			
			if (!((result || shine.EMPTY_OBJ) instanceof Array)) result = [result];
			result.unshift (success);
			
			return result;
		}
	
	
	};
	
	
	
	
	shine.lib.coroutine = {

		
		create: function (closure) {
			//return new shine.Coroutine (closure);
			return shine.Coroutine.create (closure);
		},
		
		
		
		
		resume: function (thread) {
			var args = shine.gc.createArray();
			for (var i = 1, l = arguments.length; i < l; i++) args.push (arguments[i]);	

			return thread.resume.apply (thread, args);
		},
		
		
		
		
		running: function () {
			return shine.Coroutine._running;
		},
		
	
		
		
		status: function (closure) {
			return closure.status;
		},
		
	
		
		
		wrap: function (closure) {
			var co = shine.lib.coroutine.create (closure);
			
			var result = function () {			
				var args = [co];
				for (var i = 0, l = arguments.length; i < l; i++) args.push (arguments[i]);	
	
				var retvals = shine.lib.coroutine.resume.apply (null, args),
					success = retvals.shift ();
					
				if (success) return retvals;
				throw retvals[0];
			};
			
			result._coroutine = co;
			return result;
		},
		
	
		
		
		yield: function () {
			// If running in main thread, throw error.
			if (!shine.Coroutine._running) throw new shine.Error ('attempt to yield across metamethod/C-call boundary (not in coroutine)');
			if (shine.Coroutine._running.status != 'running') throw new shine.Error ('attempt to yield non-running coroutine in host');

			var args = shine.gc.createArray(),
				running = shine.Coroutine._running;

			for (var i = 0, l = arguments.length; i < l; i++) args.push (arguments[i]);	
	
			running._yieldVars = args;
			running.status = 'suspending';

			return {
				resume: function () {
					var args = [running],
						i, 
						l = arguments.length,
						f = function () { 
							shine.lib.coroutine.resume.apply (undefined, args); 
						};

					for (i = 0; i < l; i++) args.push (arguments[i]);

					if (running.status == 'suspending') {
						window.setTimeout (f, 1);
					} else {
						f ();
					}
				}
			}
		}
	
		
	};


	

	shine.lib.debug = {

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
	};




	shine.lib.io = {
		
		
		write: function () {
			var i, arg, output = '';
			
			for (var i in arguments) {
				if (arguments.hasOwnProperty(i)) {
					var arg = arguments[i];
					if (['string', 'number'].indexOf (typeof arg) == -1) throw new shine.Error ('bad argument #' + i + ' to \'write\' (string expected, got ' + typeof arg +')');
					output += arg;
				}
			}
			
			shine.stdout.write (output);
		}
		
		
	};
	
	
	
		
	shine.lib.math = {
	
	
		abs: function (x) {
			return Math.abs (x);
		},
		
		
		
		
		acos: function (x) {
			return Math.acos (x);
		},
		
		
		
		
		asin: function (x) {
			return Math.asin (x);
		},
		
		
		
		
		atan: function (x) {
			return Math.atan (x);
		},
		
		
		
		
		atan2: function (y, x) {
			return Math.atan2 (y, x);
		},
		
		
		
		
		ceil: function (x) {
			return Math.ceil (x);
		},
		
		
		
		
		cos: function (x) {
			return Math.cos (x);
		},
		
		
		
		
		cosh: function (x) {
			// Not implemented
		},
		
		
		
		
		deg: function (x) {
			return x * 180 / Math.PI;
		},
		
		
		
		
		exp: function (x) {
			return Math.exp (x);
		},
		
		
		
		
		floor: function (x) {
			return Math.floor (x);
		},
		
		
		
		
		fmod: function (x, y) {
			return x % y;
		},
		
		
		
		
		frexp: function (x, y) {
			// TODO
		},
		
		
		
		
		huge: Infinity,
		
		
		
		
		ldexp: function (m, e) {
			return m * Math.pow (2, e);
		},
		
		
		
		
		log: function (x, base) {
			var result = Math.log (x);
			if (base !== undefined) return result / Math.log (base);
			return result;
		},
		
		
		
		
		log10: function (x) {
			// v5.2: shine.warn ('math.log10 is deprecated. Use math.log with 10 as its second argument, instead.');
			return Math.log (x) / Math.log (10);
		},
		
		
		
		
		max: function () {
			var max = -Infinity,
				length = arguments.length,
				i;
			
			for (i = 0; i < length; i++) if (arguments[i] > max) max = arguments[i];
			return max;
		},
		
		
		
		
		min: function () {
			var min = Infinity,
				length = arguments.length,
				i;
			
			for (i = 0; i < length; i++) if (arguments[i] < min) min = arguments[i];
			return min;
		},
		
		
		
		
		modf: function (x) {
			var intValue = Math.floor (x),
				mantissa = x - intValue;
			return [intValue, mantissa];
		},
		
		
		
		
		pi: Math.PI,
		
		
		
		
		pow: function (x, y) {
			var coerce = shine.utils.coerce;
			x = coerce(x, 'number', "bad argument #1 to 'pow' (number expected)")
			y = coerce(y, 'number', "bad argument #2 to 'pow' (number expected)")
			return Math.pow (x, y);
		},
		
		
		
		
		rad: function (x) {
			x = shine.utils.coerce(x, 'number', "bad argument #1 to 'rad' (number expected)")
			return (Math.PI / 180) * x;
		},
	
	
	
	
		/**
		 * Implementation of Lua's math.random function.
		 */
		random: function (min, max) {
			if (min === undefined && max === undefined) return getRandom();
	
	
			if (typeof min !== 'number') throw new shine.Error ("bad argument #1 to 'random' (number expected)");
	
			if (max === undefined) {
				max = min;
				min = 1;
	
			} else if (typeof max !== 'number') {
				throw new shine.Error ("bad argument #2 to 'random' (number expected)");
			}
	
			if (min > max) throw new shine.Error ("bad argument #2 to 'random' (interval is empty)");
			return Math.floor (getRandom() * (max - min + 1) + min);
		},
	
	
	
	
		randomseed: function (x) {
			if (typeof x !== 'number') throw new shine.Error ("bad argument #1 to 'randomseed' (number expected)");
			randomSeed = x;
		},
	
	
	
		
		sin: function (x) {
			return Math.sin (x);
		},
	
	
	
		
		sinh: function (x) {
			// Not implemented
		},
	
	
	
		
		sqrt: function (x) {
			return Math.sqrt (x);
		},
	
	
	
		
		tan: function (x) {
			return Math.tan (x);
		},
	
	
	
		
		tanh: function (x) {
			// Not implemented
		}
	
		
	};
	
	
	
	
	shine.lib.os = {
	
	
		clock: function () {
			// Not implemented
		},
	
	
	
	
		date: function (format, time) {
			if (format === undefined) format = '%c';
			
	
			var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
				months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
				daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
				
				getWeekOfYear = function (d, firstDay) { 
					var dayOfYear = parseInt (handlers['%j'](d), 10),
						jan1 = new Date (d.getFullYear (), 0, 1, 12),
						offset = (8 - jan1['get' + utc + 'Day'] () + firstDay) % 7;

					return ('0' + (Math.floor ((dayOfYear - offset) / 7) + 1)).substr (-2);
				},
	
				handlers = {
					'%a': function (d) { return days[d['get' + utc + 'Day']()].substr (0, 3); },
					'%A': function (d) { return days[d['get' + utc + 'Day']()]; },
					'%b': function (d) { return months[d['get' + utc + 'Month']()].substr (0, 3); },
					'%B': function (d) { return months[d['get' + utc + 'Month']()]; },
					'%c': function (d) { return d['to' + utc + 'LocaleString'](); },
					'%d': function (d) { return ('0' + d['get' + utc + 'Date']()).substr (-2); },
					'%H': function (d) { return ('0' + d['get' + utc + 'Hours']()).substr (-2); },
					'%I': function (d) { return ('0' + ((d['get' + utc + 'Hours']() + 11) % 12 + 1)).substr (-2); },
					'%j': function (d) {
						var result = d['get' + utc + 'Date'](),
							m = d['get' + utc + 'Month']();
							
						for (var i = 0; i < m; i++) result += daysInMonth[i];
						if (m > 1 && d['get' + utc + 'FullYear']() % 4 === 0) result +=1;
	
						return ('00' + result).substr (-3);
					},
					'%m': function (d) { return ('0' + (d['get' + utc + 'Month']() + 1)).substr (-2); },
					'%M': function (d) { return ('0' + d['get' + utc + 'Minutes']()).substr (-2); },
					'%p': function (d) { return (d['get' + utc + 'Hours']() < 12)? 'AM' : 'PM'; },
					'%S': function (d) { return ('0' + d['get' + utc + 'Seconds']()).substr (-2); },
					'%U': function (d) { return getWeekOfYear (d, 0); },
					'%w': function (d) { return '' + (d['get' + utc + 'Day']()); },
					'%W': function (d) { return getWeekOfYear (d, 1); },
					'%x': function (d) { return handlers['%m'](d) + '/' + handlers['%d'](d) + '/' + handlers['%y'](d); },
					'%X': function (d) { return handlers['%H'](d) + ':' + handlers['%M'](d) + ':' + handlers['%S'](d); },
					'%y': function (d) { return handlers['%Y'](d).substr (-2); },
					'%Y': function (d) { return '' + d['get' + utc + 'FullYear'](); },
					'%Z': function (d) { return utc? 'UTC' : d.toString ().substr (-4, 3); },
					'%%': function () { return '%' }
				},
	
				utc = '',
				date = new Date ();
	
			
			if (time) date.setTime (time * 1000);
			
	
			if (format.substr (0, 1) === '!') {
				format = format.substr (1);
				utc = 'UTC';
			}
	
	
			if (format === '*t') {
				var isDST = function (d) {
					var year = d.getFullYear (),
						jan = new Date (year, 0);
						
					// ASSUMPTION: If the time offset of the date is the same as it would be in January of the same year, DST is not in effect.
					return (d.getTimezoneOffset () !== jan.getTimezoneOffset ());
				};
				
				return new shine.Table ({
					year: parseInt (handlers['%Y'](date), 10),
					month: parseInt (handlers['%m'](date), 10),
					day: parseInt (handlers['%d'](date), 10),
					hour: parseInt (handlers['%H'](date), 10),
					min: parseInt (handlers['%M'](date), 10),
					sec: parseInt (handlers['%S'](date), 10),
					wday: parseInt (handlers['%w'](date), 10) + 1,
					yday: parseInt (handlers['%j'](date), 10),
					isdst: isDST (date)
				});	
			}
	
	
			for (var i in handlers) {
				if (handlers.hasOwnProperty(i) && format.indexOf (i) >= 0) format = format.replace (i, handlers[i](date));
			}
			
			return format;
		},
	
	
	
	
		difftime: function (t2, t1) {
			return t2 - t1;
		},
	
	
	
	
		execute: function () {
			if (arguments.length) throw new shine.Error ('shell is not available. You should always check first by calling os.execute with no parameters');
			return 0;
		},
	
	
	
	
		exit: function () {
			throw 'Execution terminated.';
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
				time = Date['now']? Date['now'] () : new Date ().getTime ();
				
			} else {	
				var day, month, year, hour, min, sec;
				
				if (!(day = table.getMember ('day'))) throw new shine.Error ("Field 'day' missing in date table");
				if (!(month = table.getMember ('month'))) throw new shine.Error ("Field 'month' missing in date table");
				if (!(year = table.getMember ('year'))) throw new shine.Error ("Field 'year' missing in date table");
				hour = table.getMember ('hour') || 12;
				min = table.getMember ('min') || 0;
				sec = table.getMember ('sec') || 0;
				
				if (table.getMember ('isdst')) hour--;
				time = new Date (year, month - 1, day, hour, min, sec).getTime ();
			}
			
			return Math.floor (time / 1000);
		},
	
	
	
	
		tmpname: function () {
			// Not implemented
		}
	
			
	};




	shine.lib['package'] = {

		cpath: undefined,


		loaded: new shine.Table(),


		loadlib: function (libname, funcname) {
			// Not implemented
		},


		path: '?.lua.json;?.json;./modules/?.json;./modules/?/?.json;./modules/?/index.json',


		preload: {},


		seeall: function (module) {
			// Not implemented
		}
		
	};




	shine.lib.string = {
		
		
		'byte': function (s, i, j) {
			i = i || 1;
			j = j || i;
			
			var result = shine.gc.createArray(),
				length = s.length,
				index;
			
			for (index = i; index <= length && index <= j ; index++) result.push (s.charCodeAt (index - 1) || undefined);
			return result;
		},
		
		
		
		
		'char': function () {
			var result = '';
			for (var i = 0, l = arguments.length; i < l; i++) result += String.fromCharCode (arguments[i]);
	
			return result;			
		},
		
		
		
		
		dump: function (func) {
			return JSON.stringify(func._data);
		},
		
		
		
		
		find: function (s, pattern, init, plain) {
			if (typeof s != 'string' && typeof s != 'number') throw new shine.Error ("bad argument #1 to 'find' (string expected, got " + typeof s + ")");
			if (typeof pattern != 'string' && typeof pattern != 'number') throw new shine.Error ("bad argument #2 to 'find' (string expected, got " + typeof pattern + ")");

			s = '' + s;
			init = init || 1;

			var index, reg, match, result;

			// Regex
			if (plain === undefined || !plain) {
				pattern = translatePattern (pattern);
				reg = new RegExp (pattern);
				index = s.substr(init - 1).search (reg);
				
				if (index < 0) return;
				
				match = s.substr(init - 1).match (reg);
				result = [index + init, index + init + match[0].length - 1];

				match.shift();
				return result.concat(match);
			}
			
			// Plain
			index = s.indexOf (pattern, init - 1);
			return (index === -1)? undefined : [index + 1, index + pattern.length];
		},
		
		
		
		
		format: function (formatstring) {
			// Temp fix
			
			/**
			*
			*  Javascript sprintf
			*  http://www.webtoolkit.info/
			*
			*
			**/
			 
			var sprintfWrapper = {
			 
				init : function () {
			 
					if (typeof arguments == "undefined") { return null; }
					if (arguments.length < 1) { return null; }
					if (typeof arguments[0] != "string") { return null; }
					if (typeof RegExp == "undefined") { return null; }

					var string = arguments[0];
					var exp = new RegExp(/(%([%]|(\-)?(\+|\x20)?(0)?(\d+)?(\.(\d)?)?([bcdfosxX])))/g);
					var matches = new Array();
					var strings = new Array();
					var convCount = 0;
					var stringPosStart = 0;
					var stringPosEnd = 0;
					var matchPosEnd = 0;
					var newString = '';
					var match = null;
			 
					while (match = exp.exec(string)) {
						if (match[9]) { convCount += 1; }
			 
						stringPosStart = matchPosEnd;
						stringPosEnd = exp.lastIndex - match[0].length;
						strings[strings.length] = string.substring(stringPosStart, stringPosEnd);
			 
						matchPosEnd = exp.lastIndex;
						matches[matches.length] = {
							match: match[0],
							left: match[3] ? true : false,
							sign: match[4] || '',
							pad: match[5] || ' ',
							min: match[6] || 0,
							precision: match[8],
							code: match[9] || '%',
							negative: parseInt(arguments[convCount]) < 0 ? true : false,
							argument: String(arguments[convCount])
						};
					}
					strings[strings.length] = string.substring(matchPosEnd);
			 
					if (matches.length == 0) { return string; }
					if ((arguments.length - 1) < convCount) { return null; }
			 
					var code = null,
						match = null,
						i = null,
						substitution;
					
			 
					for (i=0; i<matches.length; i++) {
			 
						if (matches[i].code == '%') { substitution = '%' }
						else if (matches[i].code == 'b') {
							matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(2));
							substitution = sprintfWrapper.convert(matches[i], true);
						}
						else if (matches[i].code == 'c') {
							matches[i].argument = String(String.fromCharCode(Math.abs(parseInt(matches[i].argument))));
							substitution = sprintfWrapper.convert(matches[i], true);
						}
						else if (matches[i].code == 'd') {
							matches[i].argument = String(Math.abs(parseInt(matches[i].argument)));
							substitution = sprintfWrapper.convert(matches[i]);
						}
						else if (matches[i].code == 'f') {
							matches[i].argument = String(Math.abs(parseFloat(matches[i].argument)).toFixed(matches[i].precision ? matches[i].precision : 6));
							substitution = sprintfWrapper.convert(matches[i]);
						}
						else if (matches[i].code == 'o') {
							matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(8));
							substitution = sprintfWrapper.convert(matches[i]);
						}
						else if (matches[i].code == 's') {
							matches[i].argument = matches[i].argument.substring(0, matches[i].precision ? matches[i].precision : matches[i].argument.length)
							substitution = sprintfWrapper.convert(matches[i], true);
						}
						else if (matches[i].code == 'x') {
							matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(16));
							substitution = sprintfWrapper.convert(matches[i]);
						}
						else if (matches[i].code == 'X') {
							matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(16));
							substitution = sprintfWrapper.convert(matches[i]).toUpperCase();
						}
						else {
							substitution = matches[i].match;
						}
			 
						newString += strings[i];
						newString += substitution;
			 
					}
					newString += strings[i];
			 
					return newString;
			 
				},
			 
				convert : function(match, nosign){
					if (nosign) {
						match.sign = '';
					} else {
						match.sign = match.negative ? '-' : match.sign;
					}
					var l = match.min - match.argument.length + 1 - match.sign.length;
					var pad = new Array(l < 0 ? 0 : l).join(match.pad);
					if (!match.left) {
						if (match.pad == "0" || nosign) {
							return match.sign + pad + match.argument;
						} else {
							return pad + match.sign + match.argument;
						}
					} else {
						if (match.pad == "0" || nosign) {
							return match.sign + match.argument + pad.replace(/0/g, ' ');
						} else {
							return match.sign + match.argument + pad;
						}
					}
				}
			}
			 
			return sprintfWrapper.init.apply (null, arguments);
			
		},
		
		
		
		
		gmatch: function (s, pattern) {
			pattern = translatePattern (pattern);
			var reg = new RegExp (pattern, 'g'),
				matches = ('' + s).match(reg);

			return function () {
				var match = matches.shift(),
					groups = new RegExp(reg).exec(match);

				if (match === undefined) return;

				groups.shift();
				return groups.length? groups : match;
			};				
		},
		
		
		
		
		gsub: function (s, pattern, repl, n) {
			if (typeof s != 'string' && typeof s != 'number') throw new shine.Error ("bad argument #1 to 'gsub' (string expected, got " + typeof s + ")");
			if (typeof pattern != 'string' && typeof pattern != 'number') throw new shine.Error ("bad argument #2 to 'gsub' (string expected, got " + typeof pattern + ")");
			if (n !== undefined && (n = shine.utils.coerce(n, 'number')) === undefined) throw new shine.Error ("bad argument #4 to 'gsub' (number expected, got " + typeof n + ")");

			s = '' + s;
			pattern = translatePattern ('' + pattern);

			var count = 0,
				result = '',
				str,
				prefix,
				match,
				lastMatch;

			while ((n === undefined || count < n) && s && (match = s.match (pattern))) {

				if (typeof repl == 'function' || (repl || shine.EMPTY_OBJ) instanceof shine.Function) {
					str = repl.apply (null, [match[0]], true);
					if (str instanceof Array) str = str[0];
					if (str === undefined) str = match[0];

				} else if ((repl || shine.EMPTY_OBJ) instanceof shine.Table) {
					str = repl.getMember (match[0]);
					
				} else if (typeof repl == 'object') {
					str = repl[match];
					
				} else {
					str = ('' + repl).replace(/%([0-9])/g, function (m, i) { return match[i]; });
				}

				if (match[0].length == 0 && lastMatch === undefined) {
				 	prefix = '';
				} else {
					prefix = s.split (match[0], 1)[0];
				}
	
				lastMatch = match[0];
				result += prefix + str;
				s = s.substr((prefix + lastMatch).length);

				count++;
			}

			return [result + s, count];
		},
		
		
		
		
		len: function (s) {
			if (typeof s != 'string' && typeof s != 'number') throw new shine.Error ("bad argument #1 to 'len' (string expected, got " + typeof s + ")");
			return ('' + s).length;
		},
		
		
		
		
		lower: function (s) {
			if (typeof s != 'string' && typeof s != 'number') throw new shine.Error ("bad argument #1 to 'lower' (string expected, got " + typeof s + ")");
			return ('' + s).toLowerCase ();
		},
		
		
		
		
		match: function (s, pattern, init) {
			if (typeof s != 'string' && typeof s != 'number') throw new shine.Error ("bad argument #1 to 'match' (string expected, got " + typeof s + ")");
			if (typeof pattern != 'string' && typeof pattern != 'number') throw new shine.Error ("bad argument #2 to 'match' (string expected, got " + typeof pattern + ")");

			init = init? init - 1 : 0;
			s = ('' + s).substr (init);
		
			var matches = s.match(new RegExp (translatePattern (pattern)));
			
			if (!matches) return;
			if (!matches[1]) return matches[0];

			matches.shift ();
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
			
			for (i = s.length; i >= 0; i--) result += s.charAt (i);
			return result;
		},
		
		
		
		
		sub: function (s, i, j) {
			if (typeof s != 'string' && typeof s != 'number') throw new shine.Error ("bad argument #1 to 'sub' (string expected, got " + typeof s + ")");
			s = '' + s;
			i = i || 1;
			j = j || s.length;
			
			if (i > 0) {
				i = i - 1;
			} else if (i < 0) {
				i = s.length + i;
			}
			
			if (j < 0) j = s.length + j + 1;
			
			return s.substring (i, j);
		},
		
		
		
		
		upper: function (s) {
			return s.toUpperCase ();
		}	
		
		
	};
	
	
	
	
	shine.lib.table = {
		
		
		concat: function (table, sep, i, j) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error ('Bad argument #1 in table.concat(). Table expected');
	
			sep = sep || '';
			i = i || 1;
			j = j || shine.lib.table.maxn (table);

			var result = shine.gc.createArray().concat(table.__shine.numValues).splice (i, j - i + 1);
			return result.join (sep);
		},
		
	
	
	
		getn: function (table) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error ('Bad argument #1 in table.getn(). Table expected');

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
					var m = Math.floor ((i + j) / 2);
	
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
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error ('Bad argument #1 in table.insert(). Table expected');
	
			if (obj == undefined) {
				obj = index;
				// index = 1;
				// while (table.getMember(index) !== undefined) index++;
				index = table.__shine.numValues.length;
			}
	
			var oldValue = table.getMember(index);
			table.setMember(index, obj);
	
			if (oldValue) shine.lib.table.insert (table, index + 1, oldValue);
		},	
		
		
		
		
		maxn: function (table) {
			// v5.2: shine.warn ('table.maxn is deprecated');
			
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error ('Bad argument #1 in table.maxn(). Table expected');
	
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
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error ('Bad argument #1 in table.remove(). Table expected');
	
			var max = shine.lib.table.getn(table),
				vals = table.__shine.numValues,
				result;

			if (index > max) return;
			if (index == undefined) index = max;
				
			result = vals.splice(index, 1);
			while (index < max && vals[index] === undefined) delete vals[index++];
			// table[index] = table[index + 1];	
			
			// shine.lib.table.remove (table, index + 1);
			// if (table[index] === undefined) delete table[index];
	
			return result;
		},
		
		
		
		
		sort: function (table, comp) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error ("Bad argument #1 to 'sort' (table expected)");
	
			var sortFunc, 
				arr = table.__shine.numValues;
		
			if (comp) {
				if (!((comp || shine.EMPTY_OBJ) instanceof shine.Function)) throw new shine.Error ("Bad argument #2 to 'sort' (function expected)");
	
				sortFunc = function (a, b) {
					return comp.apply (null, [a, b], true)[0]? -1 : 1;
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
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error ('Bad argument #1 in unpack(). Table expected');	
	
			i = i || 1;
			if (j === undefined) j = shine.lib.table.getn (table);
			
			var vals = shine.gc.createArray(),
				index;
	
			for (index = i; index <= j; index++) vals.push (table.getMember (index));
			return vals;
		}


	}

	
	
	
})();

// vm/src/utils.js:


var shine = shine || {};


// TODO: Remove this!
shine.debug = {};


(function () {
	var FLOATING_POINT_PATTERN = /^[-+]?[0-9]*\.?([0-9]+([eE][-+]?[0-9]+)?)?$/;


	shine.utils = {


		coerce: function (val, type, errorMessage) {
			var n;

			switch (type) {
				case 'boolean':
					return !(val === false || val === undefined);

				case 'string':
					return '' + val;

				case 'number':
					if (val === Infinity || val === -Infinity || (typeof val == 'number' && window.isNaN(val))) return val;
					if (('' + val).match(FLOATING_POINT_PATTERN)) n = parseFloat(val);
					if (n === undefined && errorMessage) throw new shine.Error(errorMessage);
					return n;

				default:
					throw new ReferenceError('Can not coerce to type: ' + type);
			}
		},




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
				if (table.hasOwnProperty (i) && !(i in shine.Table.prototype) && i !== '__shine') {
					result[i] = ((table[i] || shine.EMPTY_OBJ) instanceof shine.Table)? shine.utils.toObject (table[i]) : table[i];
				}
			}
			
			return result;
		},
		
		
		
		
		parseJSON: function (json) {

			var convertToTable = function (obj) {
				for (var i in obj) {
					if (obj.hasOwnProperty(i)) {
						if (typeof obj[i] === 'object') {
							obj[i] = convertToTable (obj[i]);
							
						} else if (obj[i] === null) {
							obj[i] = undefined;
						}
					}
				}
				
				return new shine.Table (obj);
			};

			return convertToTable (JSON.parse (json));
		},
		
		


		get: function (url, success, error) {
	        var xhr = new XMLHttpRequest();

	        xhr.open('GET', url, true);
	        xhr.responseType = 'text';

	        xhr.onload = function (e) {
	            if (this.status == 200) {
	                if (success) success(this.response);
	            } else {
	                if (error) error(this.status);
	            }
	        }

	        xhr.send(shine.EMPTY_OBJ);
	    }

	
	};


})();


// vm/src/output.js:



var shine = shine || {};




// Standard output
shine.stdout = {};

shine.stdout.write = function (message) {
	// Overwrite this in host application
	if (console && console.log) {
		console.log (message);
	} else if (trace) {
		trace (message);
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
	if (console && console[level]) console[level] (message);
};

