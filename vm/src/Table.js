/**
 * @fileOverview Table class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
 */

var shine = shine || {};




/**
 * Represents a table in Lua.
 * @param {Object} obj Initial values to set up in the new table.
 */
shine.Table = function (obj) {

	var isArr = ((obj || shine.EMPTY_OBJ) instanceof Array),
		meta,
		key,
		value,
		i;

	obj = obj || shine.gc.createObject();

	this.__shine = meta = shine.gc.createObject();
	meta.type = 'table';
	meta.index = ++shine.Table.count;
	meta.keys = shine.gc.createArray();
	meta.values = shine.gc.createArray();
	meta.numValues = [undefined];


	for (i in obj) {
		if (obj.hasOwnProperty(i)) {
			var iterate;

			key = isArr? parseInt(i, 10) + 1: i;
			value = obj[i];

			if (typeof getQualifiedClassName !== 'undefined') {
				// ActionScript
				iterate = (getQualifiedClassName(value) == 'Object' && !(value instanceof shine.Table) && !(value instanceof shine.Coroutine) && !(value instanceof shine.Function) && !(value instanceof shine.Closure)) || getQualifiedClassName(value) == 'Array';
			} else {
				// JavaScript
				iterate = (typeof value == 'object' && value.constructor === Object) || value instanceof Array;
			}
			
			this.setMember(key, iterate? new shine.Table(value) : value);
		}
	}
	
};


/**
 * Keeps a count of the number of tables created, in order to index them uniquely.
 * @type Number
 * @static
 */
shine.Table.count = 0;




/**
 * Gets a member of this table. If not found, search the metatable chain.
 * @param {Object} key The member's key.
 * @returns {Object} The value of the member sought.
 */
shine.Table.prototype.getMember = function (key) {
	var index,
		value;

	switch (typeof key) {
		case 'string':
			if (this[key] !== undefined) return this[key];
			break;

		case 'number':
			value = this.__shine.numValues[key];
			if (value !== undefined) return value;

		default:
			index = this.__shine.keys.indexOf(key);
			if (index >= 0) return this.__shine.values[index];
	}
	
	var mt = this.__shine.metatable;

	if (mt && mt.__index) {
		switch (mt.__index.constructor) {
			case shine.Table: return mt.__index.getMember(key);
			case Function: return mt.__index(this, key);
			case shine.Function: return mt.__index.apply(this, [this, key])[0];
		}
	}		
};




/**
 * Sets a member of this table. If member previously didn't exist, .
 * @param {Object} key The member's key.
 * @returns {Object} The value of the member sought.
 */
shine.Table.prototype.setMember = function (key, value) {
	var mt = this.__shine.metatable,
		oldValue,
		keys,
		index;

	if (this[key] === undefined && mt && mt.__newindex) {
		switch (mt.__newindex.constructor) {
			case shine.Table: return mt.__newindex.setMember(key, value);
			case Function: return mt.__newindex(this, key, value);
			case shine.Function: return mt.__newindex.apply(this, [this, key, value])[0];
		}
	}

	switch (typeof key) {
		case 'string':
			oldValue = this[key];
			this[key] = value;
			break;


		case 'number':
			oldValue = this.__shine.numValues[key];
			this.__shine.numValues[key] = value;
			break;


		default:
			keys = this.__shine.keys;
			index = keys.indexOf(key);
			
			if (index < 0) {
				index = keys.length;
				keys[index] = key;
			}
			
			oldValue = this.__shine.values[index];
			this.__shine.values[index] = value;
	}

	shine.gc.decrRef(oldValue);
	shine.gc.incrRef(value);
};




/**
 * Returns a unique identifier for the table.
 * @returns {string} Description.
 */
shine.Table.prototype.toString = function () {
	var mt;
	
	if (this.constructor != shine.Table) return 'userdata';
	if (this.__shine && (mt = this.__shine.metatable) && mt.__tostring) return mt.__tostring.call(undefined, this);

	return 'table: 0x' + this.__shine.index.toString(16);
};
