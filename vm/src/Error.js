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
 * @fileOverview Error class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */


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