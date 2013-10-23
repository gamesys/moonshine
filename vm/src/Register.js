/**
 * @fileOverview Lua register class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
 */


'use strict';


var shine = shine || {};


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

