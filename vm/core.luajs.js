
var luajs = luajs || {};




/**
 * Represents a table in Lua.
 * @param {Object} obj Initial values to set up in the new table.
 */
luajs.Table = function (obj) {
	var isArr = (obj instanceof Array),
		key,
		value,
		i;
	
	for (i in obj || {}) {
		key = isArr? parseInt (i, 10) + 1: i;
		value = obj[i];
		
		this[key] = typeof value == 'object'? new luajs.Table (value) : value;
	}
	
	this.__luajs = { 
		type: 'table',
		index: ++luajs.Table.count
	};
};


/**
 * Keeps a count of the number of tables created, in order to index them uniquely.
 * @type Number
 */
luajs.Table.count = 0;




/**
 * Gets a member of this table. If not found, search the metatable chain.
 * @param {Object} key The member's key.
 * @returns {Object} The value of the member sought.
 */
luajs.Table.prototype.getMember = function (key) {
	if (this[key] !== undefined) return this[key];

	var mt = this.__luajs.metatable;
	
	if (mt && mt.__index) {
		switch (mt.__index.constructor) {
			case luajs.Table: return mt.__index.getMember (key);
			case Function: return mt.__index (this, key);
		}
	}		
};




/**
 * Sets a member of this table. If member previously didn't exist, .
 * @param {Object} key The member's key.
 * @returns {Object} The value of the member sought.
 */
luajs.Table.prototype.setMember = function (key, value) {
	var mt = this.__luajs.metatable;

	if (this[key] == undefined && mt && mt.__newindex) {
		switch (mt.__newindex.constructor) {
			case luajs.Table: return mt.__newindex.setMember (key, value);
			case Function: return mt.__newindex (this, key, value);
		}
	}
	
	this[key] = value;
};




luajs.Table.prototype.toString = function () {
	return 'table: 0x' + this.__luajs.index.toString (6);
};











luajs.Error = function (message) {
	Error.call (this, message);
	this.message = message;
};


luajs.Error.prototype = new Error ();




luajs.Error.prototype.toString = function () {
	return 'Luajs Error: ' + this.message;
};









luajs.stdout = {};

luajs.stdout.write = function (message) {
	// Overwrite this in host application
}




luajs.stddebug = {};

luajs.stddebug.write = function (message) {
	// Luajs bytecode debugging output
}




luajs.stderr = {};

luajs.stderr.write = function (message, level) {
	level = level || 'error';
	if (console && console[level]) console[level] (message);
}




luajs.warn = function (message) {
	luajs.stderr.write ('Luajs warning: ' + message, 'warn');
};










luajs.utils = {
	
	toObject: function (table) {
		var result = table[1] === undefined? {} : [],
			i;
		
		for (i in table) {
			if (table.hasOwnProperty (i) && i !== '__luajs') {
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
	}

};

