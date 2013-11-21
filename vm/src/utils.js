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
 * @fileOverview Utility functions.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */

'use strict';


var shine = shine || {};


(function () {
	/**
	 * Pattern to identify a string value that can validly be converted to a number in Lua.
	 * @type RegExp
	 * @private
	 * @constant
	 */
	var FLOATING_POINT_PATTERN = /^[-+]?[0-9]*\.?([0-9]+([eE][-+]?[0-9]+)?)?$/,




		HEXIDECIMAL_CONSTANT_PATTERN = /^(\-)?0x([0-9a-fA-F]*)\.?([0-9a-fA-F]*)$/;




	/**
	 * @fileOverview Utility function namespace.
	 * @namespace
	 */
	shine.utils = {


		/**
		 * Coerces a value from its current type to another type in the same manner as Lua.
		 * @param {Object} val The value to be converted.
		 * @param {String} type The type to which to convert. Possible values: 'boolean', 'string', number'.
		 * @param {String} [error] The error message to throw if the conversion fails.
		 * @returns {Object} The converted value.
		 */
		coerce: function (val, type, errorMessage) {
			var n, match, mantissa;

			switch (type) {
				case 'boolean':
					return !(val === false || val === undefined);

				case 'string':
					switch(true) {
						case val === undefined || val === null: return 'nil';
						case val === Infinity: return 'inf';
						case val === -Infinity: return '-inf';
						case typeof val == 'number' && window.isNaN(val): return 'nan';
						case typeof val == 'function': return 'function: [host code]';
						case val instanceof shine.Table: return shine.Table.prototype.toString.call(val);
						default: return val.toString();					}

				case 'number':
					switch (val) {
						case undefined: return;
						case Infinity:
						case -Infinity: return val;
						case 'inf': return Infinity;
						case '-inf': return -Infinity;
						case 'nan': return NaN;

						default:
							if (typeof val == 'number' && window.isNaN(val)) return val;

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

							if (n === undefined && errorMessage) throw new shine.Error(errorMessage);
							return n;
					}

				default:
					throw new ReferenceError('Can not coerce to type: ' + type);
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

			var convertToTable = function (obj) {
				for (var i in obj) {
					if (obj.hasOwnProperty(i)) {
						if (typeof obj[i] === 'object') {
							obj[i] = convertToTable(obj[i]);
							
						} else if (obj[i] === null) {
							obj[i] = undefined;
						}
					}
				}
				
				return new shine.Table(obj);
			};

			return convertToTable(JSON.parse(json));
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
					if (data.byteLength <= 10000) return String.fromCharCode.apply(String, new Uint8Array(data));

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


})();
