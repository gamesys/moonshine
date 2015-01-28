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


var AppConnection = require('./AppConnection'),
	ConsoleConnection = require('./ConsoleConnection'),
	fs = require('fs'),
	path = require('path');




DebugServer = function (config) {
	config = config || {};

	this._sourcePaths = config.sourcePaths;
	this._pathMaps = config.pathMaps;
	this._initAppConnection(config);
	this._initConsoleConnection(config);

	if (!this._sourcePaths) this._sourcePaths = ['.'];
};




DebugServer.prototype._initAppConnection = function (config) {
	var me = this,
		conn = this._appConnection = new AppConnection({ port: config.appPort });


	// Protocol

	conn.on('connect', function () {
		var consoleConnected = me._consoleConnection.connected;

		conn._sendStatus({ consoleConnected: consoleConnected });
		if (consoleConnected) me._consoleConnection._sendStatus({ appConnected: true });
	});


	conn.on('disconnect', function () {
		var consoleConn = me._consoleConnection;
		if (consoleConn.connected) consoleConn._sendStatus({ appConnected: false });
	});


	// Events

	conn.on('engine-state-changed', function (state, data) {
		if (me._consoleConnection) me._consoleConnection.updateState(state, data);
	});


	conn.on('lua-loaded', function (jsonUrl, url, code) {
		if (me._sourcePaths || me._pathMaps) code = me.getLocalSourceCode(url, code);
		if (me._consoleConnection) me._consoleConnection.luaLoaded(jsonUrl, url, code);
	});


	conn.on('lua-load-failed', function (jsonUrl, url) {
		var code;
		if (me._sourcePaths || me.pathMaps) code = me.getLocalSourceCode(url);

		if (me._consoleConnection) {
			if (code) {
				me._consoleConnection.luaLoaded(jsonUrl, url, code);
			} else {
				me._consoleConnection.luaLoadFailed(jsonUrl, url);
			}
		}
	});


	conn.on('breakpoints-updated', function (data) {
		if (me._consoleConnection) me._consoleConnection.updateBreakpoints(data);
	});


	conn.on('breakpoint-updated', function (jsonUrl, lineNumber, breakOn) {
		if (me._consoleConnection) me._consoleConnection.updateBreakpoint(jsonUrl, lineNumber, breakOn);
	});


	conn.on('stop-at-breakpoints-updated', function (stops) {
		if (me._consoleConnection) me._consoleConnection.updateStopAtBreakpoints(stops);
	});

	conn.on('error', function (error) {
		if (me._consoleConnection) me._consoleConnection.handleError(error);
	});

};




DebugServer.prototype._initConsoleConnection = function (config) {
	var me = this,
		conn = this._consoleConnection = new ConsoleConnection({ port: config.consolePort });

	
	// Protocol

	conn.on('connect', function () {
		var appConnected = me._appConnection.connected;

		conn._sendStatus({ appConnected: appConnected });
		if (appConnected) me._appConnection._sendStatus({ consoleConnected: true });
	});


	conn.on('disconnect', function () {
		var appConn = me._appConnection;
		if (appConn.connected) appConn._sendStatus({ consoleConnected: false });
	});


	// Events

	conn.on('get-state-request', function (callback) {
		var state, loaded, i;

		if (!me._sourcePaths && !me._pathMaps) {
			state = me._appConnection.state;

		} else {
			state = {};
			loaded = me._appConnection.state.loaded;

			for (i in me._appConnection.state) state[i] = me._appConnection.state[i];
			state.loaded = {};

			for (i in loaded) {
				state.loaded[i] = {
					filename: loaded[i].filename,
					source: me.getLocalSourceCode(loaded[i].filename, loaded[i].source)
				}
			}
		}
		
		callback(state);
	});


	conn.on('toggle-breakpoint-request', function (jsonUrl, lineNumber) {
		if (me._appConnection) me._appConnection.toggleBreakpoint(jsonUrl, lineNumber);
	});


	conn.on('toggle-stop-at-breakpoints-request', function () {
		if (me._appConnection) me._appConnection.toggleStopAtBreakpoints();
	});


	conn.on('auto-step-request', function () {
		if (me._appConnection) me._appConnection.autoStep();
	});


	conn.on('step-in-request', function () {
		if (me._appConnection) me._appConnection.stepIn();
	});


	conn.on('step-over-request', function () {
		if (me._appConnection) me._appConnection.stepOver();
	});


	conn.on('step-out-request', function () {
		if (me._appConnection) me._appConnection.stepOut();
	});


	conn.on('pause-request', function () {
		if (me._appConnection) me._appConnection.pause();
	});

	conn.on('resume-request', function () {
		if (me._appConnection) me._appConnection.resume();
	});

	conn.on('reload-request', function () {
		if (me._appConnection) me._appConnection.reload();
	});

};




DebugServer.prototype.getLocalSourceCode = function (url, defaultCode) {
	var attempts = [], 
		maps = this._pathMaps,
		filename, match,
		map,
		i;

	for (i in maps) {
		if (maps.hasOwnProperty(i) && (match = url.match(i))) {
			url = maps[i] + url.substr(match[0].length);
			break;
		}
	}

	for (i = this._sourcePaths.length - 1; i >= 0; i--) {
		filename = path.resolve(this._sourcePaths[i] + '/' + url);

		if (fs.existsSync(filename)) return fs.readFileSync(filename).toString();
		attempts.push('\tno file: ' + filename);
	}

	console.log ('Source file \'' + url + '\' not found:\n' + attempts.join('\n'));
	return defaultCode || false;
};




module.exports = DebugServer;

