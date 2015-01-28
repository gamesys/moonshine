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
 * @fileOverview Closure class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */


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

