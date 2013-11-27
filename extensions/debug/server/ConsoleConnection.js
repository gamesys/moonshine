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


var fs = require('fs'),
	express = require('express'),
	AbstractConnection = require('./AbstractConnection'),
	MESSAGE_TYPES = require('./constants').MESSAGE_TYPES,
	COLORS = require('./constants').COLORS;




ConsoleConnection = function (config) {
	config = config || {};

	this._port = config.port || 1969;
	AbstractConnection.apply(this, arguments);
};


ConsoleConnection.prototype = new AbstractConnection();
ConsoleConnection.prototype.constructor = ConsoleConnection;




ConsoleConnection.prototype._onReady = function () {


	this._app.get('/', function (req, res) {
		console.log ('app get')
		fs.readFile(__dirname + '/../ui/index.html', function (err, data) {
			if (err) throw err;

			var placeholder = '<!-- [remote-placeholder] -->',
				scriptTag = '<script src="./js/remote-debugger.js"></script>';

			data = data.toString().replace(placeholder, scriptTag);

			res.set('Content-Type', 'text/html');
			res.send(data);
		})
		''
	});

	this._app.use(express.static(__dirname + '/../ui'));

	console.log('To view the console, go to: ' + COLORS.CYAN + 'http://127.0.0.1:' + this._port + COLORS.RESET);
};




ConsoleConnection.prototype._onConnection = function () {
	console.log ('Console connected.');
	this._trigger('connect');
};




ConsoleConnection.prototype._onDisconnect = function () {
	console.log ('Console disconnected.');
};




ConsoleConnection.prototype._processMessage = function (type, data, callback) {

 	switch (type) {

 		case MESSAGE_TYPES.GET_STATE:
 			this._trigger('get-state-request', callback);
 			break;

 		case MESSAGE_TYPES.TOGGLE_BREAKPOINT:
 			this._trigger('toggle-breakpoint-request', data);
 			break;

 		case MESSAGE_TYPES.TOGGLE_STOP_AT_BREAKPOINTS:
 			this._trigger('toggle-stop-at-breakpoints-request');
 			break;

 		case MESSAGE_TYPES.TOGGLE_AUTO_STEP:
 			this._trigger('auto-step-request');
 			break;

 		case MESSAGE_TYPES.STEP_IN:
 			this._trigger('step-in-request');
 			break;

 		case MESSAGE_TYPES.STEP_IN:
 			this._trigger('step-in-request');
 			break;

 		case MESSAGE_TYPES.STEP_OVER:
 			this._trigger('step-over-request');
 			break;

 		case MESSAGE_TYPES.STEP_OUT:
 			this._trigger('step-out-request');
 			break;

 		case MESSAGE_TYPES.PAUSE:
 			this._trigger('pause-request');
 			break;

 		case MESSAGE_TYPES.RESUME:
 			this._trigger('resume-request');
 			break;

 		case MESSAGE_TYPES.RELOAD:
 			this._trigger('reload-request');
 			break;
	}
};




ConsoleConnection.prototype.updateState = function (state, data) {
	this._send(MESSAGE_TYPES.ENGINE_STATE_CHANGED, [state, data]);
};




ConsoleConnection.prototype.luaLoaded = function (jsonUrl, url, code) {
	this._send(MESSAGE_TYPES.LUA_LOADED, [jsonUrl, url, code]);
};




ConsoleConnection.prototype.luaLoadFailed = function (jsonUrl, url) {
	this._send(MESSAGE_TYPES.LUA_LOAD_FAILED, [jsonUrl, url]);
};




ConsoleConnection.prototype.updateBreakpoints = function (data) {
	this._send(MESSAGE_TYPES.BREAKPOINTS_UPDATED, [data]);
};




ConsoleConnection.prototype.updateBreakpoint = function (jsonUrl, lineNumber, breakOn) {
	this._send(MESSAGE_TYPES.BREAKPOINT_UPDATED, [jsonUrl, lineNumber, breakOn]);
};




ConsoleConnection.prototype.updateStopAtBreakpoints = function (stops) {
	this._send(MESSAGE_TYPES.STOP_AT_BREAKPOINTS_UPDATED, stops);
};




ConsoleConnection.prototype.handleError = function (error) {
	this._send(MESSAGE_TYPES.ERROR, error);
};




module.exports = ConsoleConnection;
