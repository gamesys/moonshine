/**
 * @fileOverview Utility functions.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
 */

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
