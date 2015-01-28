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

/**
 * @fileOverview Lua virtual machine class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */


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
