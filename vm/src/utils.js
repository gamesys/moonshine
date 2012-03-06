
var luajs = luajs || {};


// TODO: Remove this!
luajs.debug = {};



luajs.utils = {
	
	toObject: function (table) {
		var result = table[1] === undefined? {} : [],
			i;
		
		for (i in table) {
			if (table.hasOwnProperty (i) && !(i in luajs.Table.prototype) && i !== '__luajs') {
					result[i] = (table[i] instanceof luajs.Table)? luajs.utils.toObject (table[i]) : table[i];
			}
		}
		
		return result;
	},
	
	
	
	
	parseJSON: function (json) {

		var convertToTable = function (obj) {
			for (var i in obj) {

				if (typeof obj[i] === 'object') {
					obj[i] = convertToTable (obj[i]);
					
				} else if (obj[i] === null) {
					obj[i] = undefined;
				}				
			}
			
			return new luajs.Table (obj);
		};

		return convertToTable (JSON.parse (json));
	},
	


	
	catchExecutionError: function (e) {
		if (e instanceof luajs.Error && console) throw new Error ('[luajs] ' + e.message + '\n    ' + (e.luaStack || []).join ('\n    '));
		throw e;
	}


};

