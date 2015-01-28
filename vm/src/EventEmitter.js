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
 * @fileOverview EventEmitter class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */


'use strict';


var shine = shine || {};


/**
 * Abstract object that fires events.
 * @constructor
 */
shine.EventEmitter = function () {
	this._listeners = {};
};




/**
 * Triggers an event.
 * @param {string} name Name of the event.
 * @param {Array} [data = []] Array containing any associated data.
 */
shine.EventEmitter.prototype._trigger = function (name, data) {
	var listeners = this._listeners[name],
		result,
		i;
		
	if (!listeners) return;
	if (!((data || shine.EMPTY_OBJ) instanceof Array)) data = [data];
	
	for (i in listeners) {
		if (listeners.hasOwnProperty(i)) {
			result = listeners[i].apply(this, data);
			if (result !== undefined && !result) break;
		}
	}
};




/**
 * Adds an event listener.
 * @param {string} name Name of the event.
 * @param {Function} Callback Listener function.
 */
shine.EventEmitter.prototype.on = function (name, callback) {
	if (!this._listeners[name]) this._listeners[name] = [];
	this._listeners[name].push(callback);
}




/**
 * Removes an event listener.
 * @param {string} name Name of the event.
 * @param {Function} Callback Listener function to be removed.
 */
shine.EventEmitter.prototype.unbind = function (name, callback) {
	for (var i in this._listeners[name]) {
		if (this._listeners[name].hasOwnProperty(i) && this._listeners[name][i] === callback) this._listeners[name].splice(i, 1);
	}
}




if (typeof module == 'object' && module.exports) module.exports.EventEmitter = shine.EventEmitter;

