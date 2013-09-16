/**
 * @fileOverview Utility functions.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
 */

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
						case val === undefined: return 'nil';
						case val === Infinity: return 'inf';
						case val === -Infinity: return '-inf';
						case typeof val == 'number' && window.isNaN(val): return 'nan';
						case typeof val == 'function': return 'function: [host code]'
						default: return val.toString();
					}

				case 'number':
					if (val === undefined) return;
					if (val === Infinity || val === -Infinity || (typeof val == 'number' && window.isNaN(val))) return val;

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
