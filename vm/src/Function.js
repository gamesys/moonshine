/*
 * Moonshine - a Lua virtual machine.
 *
 * Copyright (C) 2013 Gamesys Limited,
 * 10 Piccadilly, London W1J 0DD
 * Email: moonshine@gamesys.co.uk
 * http://moonshinejs.org
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
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
 */
shine.Function = function (vm, file, data, globals, upvalues) {
	this._vm = vm;
	this._file = file;
	this._data = data || shine.gc.createObject();
	this._globals = globals;
	this._upvalues = upvalues || shine.gc.createObject();
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
shine.Function.prototype.call = function () {
	var args = shine.gc.createArray(),
		l = arguments.length,
		i;
		
	for (i = 1; i < l; i++) args.push(arguments[i]);
	return this.apply(args);
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




