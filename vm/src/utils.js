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
 * @fileOverview Utility functions.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */

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




	/**
	 * @fileOverview Utility function namespace.
	 * @namespace
	 */
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
