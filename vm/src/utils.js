/**
 * @fileOverview Utility functions.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
 */

var luajs = luajs || {};


// TODO: Remove this!
luajs.debug = {};


(function () {
	var FLOATING_POINT_PATTERN = /^[-+]?[0-9]*\.?([0-9]+([eE][-+]?[0-9]+)?)?$/;


	luajs.utils = {


		coerce: function (val, type, errorMessage) {
			var n;

			switch (type) {
				case 'boolean':
					return !(val === false || val === undefined);

				case 'string':
					return '' + val;

				case 'number':
					if (('' + val).match(FLOATING_POINT_PATTERN)) n = parseFloat(val);
					if (n === undefined && errorMessage) throw new luajs.Error(errorMessage);
					return n;

				default:
					throw new ReferenceError('Can not coerce to type: ' + type);
			}
		},




		toObject: function (table) {
			var isArr = luajs.lib.table.getn (table) > 0,
				result = isArr? [] : {},
				numValues = table.__luajs.numValues,
				i,
				l = numValues.length;

			for (i = 1; i < l; i++) {
				result[i - 1] = ((numValues[i] || {}) instanceof luajs.Table)? luajs.utils.toObject(numValues[i]) : numValues[i];
			}

			for (i in table) {
				if (table.hasOwnProperty (i) && !(i in luajs.Table.prototype) && i !== '__luajs') {
					result[i] = ((table[i] || {}) instanceof luajs.Table)? luajs.utils.toObject (table[i]) : table[i];
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
				
				return new luajs.Table (obj);
			};

			return convertToTable (JSON.parse (json));
		},
		
		


		toFloat: function (x) {
			if (x === Infinity || x === -Infinity) return x;

			var FLOATING_POINT_PATTERN = /^[-+]?[0-9]*\.?([0-9]+([eE][-+]?[0-9]+)?)?$/;
			if (!('' + x).match (FLOATING_POINT_PATTERN)) return;
			
			return parseFloat (x);
		},
		



		get: function (url, success, error) {
	        var xhr = new XMLHttpRequest();
	        xhr.responseType = 'text';

	        xhr.onload = function (e) {
	            if (this.status == 200) {
	                if (success) success(this.response);
	            } else {
	                if (error) error(this.status);
	            }
	        }

	        xhr.open('GET', url, true);
	        xhr.send({});
	    }

	
	};


})();
