/**
 * @fileOverview Table class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
 */

var luajs = luajs || {};




/**
 * Represents a table in Lua.
 * @param {Object} obj Initial values to set up in the new table.
 */
luajs.Table = function (obj) {

	var isArr = ((obj || {}) instanceof Array),
		key,
		value,
		i;

	for (i in obj || {}) {
		var iterate;

		key = isArr? parseInt (i, 10) + 1: i;
		value = obj[i];

		if (typeof getQualifiedClassName !== 'undefined') {
			// ActionScript
			iterate = ((getQualifiedClassName(value) == "Object") && (!(value instanceof luajs.Table)) && (!(value instanceof luajs.Coroutine)) && (!(value instanceof luajs.Function)) && (!(value instanceof luajs.Closure) )) || (getQualifiedClassName(value) == "Array");
		} else {
			// JavaScript
			iterate = (typeof value == 'object' && value.constructor === Object) || value instanceof Array;
		}
		
		if (iterate) {
			this[key] = new luajs.Table (value);
		} else {
			this[key] = value;
		}
	}
	
	this.__luajs = { 
		type: 'table',
		index: ++luajs.Table.count,
		keys: [],
		values: []
	};
};


/**
 * Keeps a count of the number of tables created, in order to index them uniquely.
 * @type Number
 * @static
 */
luajs.Table.count = 0;




/**
 * Gets a member of this table. If not found, search the metatable chain.
 * @param {Object} key The member's key.
 * @returns {Object} The value of the member sought.
 */
luajs.Table.prototype.getMember = function (key) {

	if (typeof key === 'string' || typeof key === 'number') {
		if (this[key] !== undefined) return this[key];
	} else {
		var index = this.__luajs.keys.indexOf (key);
		if (index >= 0) return this.__luajs.values[index];
	}
	
	var mt = this.__luajs.metatable;

	if (mt && mt.__index) {
		switch (mt.__index.constructor) {
			case luajs.Table: return mt.__index.getMember (key);
			case Function: return mt.__index (this, key);
			case luajs.Function: return mt.__index.apply (this, [this, key])[0];
		}
	}		
};




/**
 * Sets a member of this table. If member previously didn't exist, .
 * @param {Object} key The member's key.
 * @returns {Object} The value of the member sought.
 */
luajs.Table.prototype.setMember = function (key, value) {
	var mt = this.__luajs.metatable,
		keys,
		index;

	if (this[key] === undefined && mt && mt.__newindex) {
		switch (mt.__newindex.constructor) {
			case luajs.Table: return mt.__newindex.setMember (key, value);
			case Function: return mt.__newindex (this, key, value);
			case luajs.Function: return mt.__newindex.apply (this, [this, key, value])[0];
		}
	}

	if (typeof key === 'string' || typeof key === 'number') {
		this[key] = value;

	} else {
		keys = this.__luajs.keys;
		index = keys.indexOf(key);
		
		if (index < 0) {
			index = keys.length;
			keys[index] = key;
		}
		
		this.__luajs.values[index] = value;
	}
};




/**
 * Returns a unique identifier for the table.
 * @returns {string} Description.
 */
luajs.Table.prototype.toString = function () {
	var mt;
	
	if (this.constructor != luajs.Table) return 'userdata';
	if (this.__luajs && (mt = this.__luajs.metatable) && mt.__tostring) return mt.__tostring.call (undefined, this);

	return 'table: 0x' + this.__luajs.index.toString (16);
};



