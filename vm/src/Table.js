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
 * @fileOverview Table class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */


'use strict';


(function (shine) {


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
				if (value === null) value = undefined;

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
		var typ = typeof key,
			index, value, mt, mm;

		if (typ == 'string' && (key == 'getMember' || key == 'setMember')) typ = 'object';

		switch (typ) {
			case 'string':
				if (this.hasOwnProperty(key) && this[key] !== undefined) return this[key];
				break;

			case 'number':
				if (key > 0 && key == key >> 0) {
					value = this.__shine.numValues[key];
					if (value !== undefined) return value;
					break
				}

			default:
				index = this.__shine.keys.indexOf(key);
				if (index >= 0) return this.__shine.values[index];
		}
		
		if ((mt = this.__shine.metatable) && (mm = mt.__index)) {
			switch (mm.constructor) {
				case shine.Table: return mm.getMember(key);
				// case Function: return mm(this, key);
				// case shine.Function: return mm.apply(this, [this, key])[0];
				case Function:
				case shine.Function:
					value = mm.apply(this, [this, key]);
					return (value instanceof Array)? value[0] : value;
			}
		}
	};




	/**
	 * Sets a member of this table.
	 * @param {Object} key The member's key.
	 * @param {Object} value The new value of the member.
	 */
	shine.Table.prototype.setMember = function (key, value) {
		var mt = this.__shine.metatable,
			typ = typeof key,
			positiveIntegerKey = key > 0 && key == key >> 0,
			oldValue,
			keys,
			index;

		if (typ == 'string' && (key == 'getMember' || key == 'setMember')) typ = 'object';

		switch (typ) {
			case 'string':
				oldValue = this[key];
				break;

			case 'number':
				if (positiveIntegerKey) {
					oldValue = this.__shine.numValues[key];
					break;
				}

			default:
				keys = this.__shine.keys;
				index = keys.indexOf(key);

				oldValue = index == -1? undefined : this.__shine.values[index];
				if (oldValue === undefined) shine.gc.incrRef(key);
		}

		if (oldValue === undefined && mt && mt.__newindex) {
			switch (mt.__newindex.constructor) {
				case shine.Table: return mt.__newindex.setMember(key, value);
				case Function: return mt.__newindex(this, key, value);
				case shine.Function: return mt.__newindex.apply(this, [this, key, value])[0];
			}
		}

		switch (typ) {
			case 'string':
				this[key] = value;
				break;

			case 'number':
				if (positiveIntegerKey) {
					this.__shine.numValues[key] = value;
					break;
				}

			default:
				if (index < 0) {
					index = keys.length;
					keys[index] = key;
				}
				
				this.__shine.values[index] = value;
		}

		shine.gc.incrRef(value);
		shine.gc.decrRef(oldValue);
	};




	/**
	 * Returns a unique identifier for the table.
	 * @returns {string} Description.
	 */
	shine.Table.prototype.toString = function () {
		var mt;
		
		if (this.constructor != shine.Table) return 'userdata';
		if (this.__shine && (mt = this.__shine.metatable) && mt.__tostring) return mt.__tostring.call(undefined, this)[0];

		return 'table: 0x' + this.__shine.index.toString(16);
	};



})(shine || {});
