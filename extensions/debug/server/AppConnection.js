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


var AbstractConnection = require('./AbstractConnection'),
	MESSAGE_TYPES = require('./constants').MESSAGE_TYPES,
	COLORS = require('./constants').COLORS,
	os = require('os');




AppConnection = function (config) {
	config = config || {};

	this._port = config.port || 1959;
	this._reset();

	AbstractConnection.apply(this, arguments);
};


AppConnection.prototype = new AbstractConnection();
AppConnection.prototype.constructor = AppConnection;




AppConnection.prototype._onReady = function () {
	var interfaces = os.networkInterfaces(),
		device,
		ip,
		i, j;

	for (i in interfaces) {
		device = interfaces[i]

		for (j in device) {
			if (device[j].family == 'IPv4') {
				ip = device[j].address;
				break;
			}
		}
	}

	ip = ip? ' IP ' + COLORS.CYAN + ip + COLORS.RESET : '';
	console.log('Debug server listening for app on:' + ip + ' Port ' + COLORS.CYAN + this._port + COLORS.RESET);
};




AppConnection.prototype._onConnection = function () {
	var me = this;

	console.log ('App found.');

	this._send(MESSAGE_TYPES.GET_STATE, undefined, function (state) {
		console.log ('App connected.');

		me.state = state;
		me._trigger('connect');
		me._trigger('engine-state-updated', state);
	});
};




AppConnection.prototype._onDisconnect = function () {
	console.log ('App disconnected.');
	this._reset();
	this._trigger('disconnect');
};




AppConnection.prototype._reset = function () {
 	this.state = {
 		loaded: {},
 		breakpoints: {},
 		stopAtBreakpoints: false,
 		errorLog: [],
 		engine: {
 			state: 'disconnected',
 			data: {}
 		}
 	};

	this._trigger('engine-state-changed', this.state);
};




AppConnection.prototype._processMessage = function (type, data, callback) {

 	switch (type) {

 		case MESSAGE_TYPES.ENGINE_STATE_CHANGED:
 			this.state.engine = {
 				state: data[0],
 				data: data[1]
 			};

 			this._trigger('engine-state-changed', data);
 			break;


 		case MESSAGE_TYPES.LUA_LOADED:
 			this.state.loaded[data[0]] = {
 				filename: data[1],
 				source: data[2]
 			};

 			this._trigger('lua-loaded', data);

 			break;


 		case MESSAGE_TYPES.LUA_LOAD_FAILED:
 			this.state.loaded[data[0]] = {
 				filename: data[1],
 				source: false
 			};

  			this._trigger('lua-load-failed', data);

 			break;


 		case MESSAGE_TYPES.BREAKPOINTS_UPDATED:
 			this.state.breakpoints = data;
 			this._trigger('breakpoints-updated', data);

 			break;


 		case MESSAGE_TYPES.BREAKPOINT_UPDATED:
 			var breakpoints = this.state.breakpoints;
 			if (breakpoints[data[0]] === undefined) breakpoints[data[0]] = [];
 			
 			breakpoints[data[0]][data[1]] = data[2];
 			this._trigger('breakpoint-updated', data);

 			break;


 		case MESSAGE_TYPES.STOP_AT_BREAKPOINTS_UPDATED:
 			this.state.stopAtBreakpoints = data[0];
 			this._trigger('stop-at-breakpoints-updated', data);

 			break;


 		case MESSAGE_TYPES.ERROR:
 			this.state.errorLog.push(data);
 			this._trigger('error', data);

 			break;

 	}
};




AppConnection.prototype.toggleBreakpoint = function (jsonUrl, line) {
	this._send(MESSAGE_TYPES.TOGGLE_BREAKPOINT, [jsonUrl, line]);
};




AppConnection.prototype.toggleStopAtBreakpoints = function (stops) {
	this._send(MESSAGE_TYPES.TOGGLE_STOPS_AT_BREAKPOINTS, stops);
};




AppConnection.prototype.autoStep = function () {
	this._send(MESSAGE_TYPES.TOGGLE_AUTO_STEP);
};




AppConnection.prototype.stepIn = function () {
	this._send(MESSAGE_TYPES.STEP_IN);
};




AppConnection.prototype.stepOver = function () {
	this._send(MESSAGE_TYPES.STEP_OVER);
};




AppConnection.prototype.stepOut = function () {
	this._send(MESSAGE_TYPES.STEP_OUT);
};




AppConnection.prototype.pause = function () {
	this._send(MESSAGE_TYPES.PAUSE);
};




AppConnection.prototype.resume = function () {
	this._send(MESSAGE_TYPES.RESUME);
};




AppConnection.prototype.reload = function () {
	this._send(MESSAGE_TYPES.RELOAD);
};




module.exports = AppConnection;

