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

