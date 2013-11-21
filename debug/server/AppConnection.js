/*
 * Moonshine - a Lua virtual machine.
 *
 * Copyright (C) 2013 Gamesys Limited,
 * 10 Piccadilly, London W1J 0DD
 * Email: moonshine@gamesys.co.uk
 * http://moonshinejs.org
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
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

