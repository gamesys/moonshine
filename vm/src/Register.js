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
 * @fileOverview Lua register class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */


'use strict';


(function (shine) {


	/**
	 * Represents a register.
	 * @constructor
	 */
	shine.Register = function () {
		this._items = shine.gc.createArray();
	};


	/**
	 * Array of disposed registers, ready to be reused.
	 * @type Array
	 * @static
	 */
	shine.Register._graveyard = [];




	/**
	 * Returns a new, empty register.
	 * @returns {shine.Register} An empty register
	 */
	shine.Register.create = function () {
		var o = shine.Register._graveyard.pop();
		return o || new shine.Register(arguments);
	};




	/**
	 * Returns the number of items in the register.
	 * @returns {Number} Number of items.
	 */
	shine.Register.prototype.getLength = function () {
		return this._items.length;
	};




	/**
	 * Retrieves an item from the register.
	 * @param {Number} index Index of the item.
	 * @returns {Object} Value of the item.
	 */
	shine.Register.prototype.getItem = function (index) {
		return this._items[index];
	};




	/**
	 * Sets the value an item in the register.
	 * @param {Number} index Index of the item.
	 * @param {Object} value Value of the item.
	 */
	shine.Register.prototype.setItem = function (index, value) {
		var item = this._items[index];

		shine.gc.incrRef(value);
		shine.gc.decrRef(item);

		this._items[index] = value;
	};




	/**
	 * Rewrites the values of all the items in the register.
	 * @param {Array} arr The entire register.
	 */
	shine.Register.prototype.set = function (arr) {
		var i, 
			l = Math.max(arr.length, this._items.length);

		for (i = 0; i < l; i++) this.setItem(i, arr[i]);
	};




	/**
	 * Inserts new items at the end of the register.
	 * @param {...Object} One or more items to be inserted.
	 */
	shine.Register.prototype.push = function () {
		this._items.push.apply(this._items, arguments);
	};




	/**
	 * Removes an item from the register.
	 * @param {Number} index Index of the item to remove.
	 */
	shine.Register.prototype.clearItem = function (index) {
		delete this._items[index];
	};




	/**
	 * Splices the register.
	 * @param {Number} index Index of the first item to remove.
	 * @param {Number} length Number of items to remove.
	 * @param {...Object} One or more items to be inserted.
	 */
	shine.Register.prototype.splice = function (index, length) {
		this._items.splice.apply(this._items, arguments);
	};




	/**
	 * Empties the register.
	 */
	shine.Register.prototype.reset = function () {
		for (var i = 0, l = this._items.length; i < l; i++) shine.gc.decrRef(this._items[i]);
		this._items.length = 0;
	};




	/**
	 * Cleans up the register and caches it for reuse.
	 */
	shine.Register.prototype.dispose = function () {
		this._items.reset();
		this.constructor._graveyard.push(this);
	};


})(shine || {});