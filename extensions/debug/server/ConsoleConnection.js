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
