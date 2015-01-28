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
 * @fileOverview Function definition class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */


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

