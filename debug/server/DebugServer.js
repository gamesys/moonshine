
var AppConnection = require('./AppConnection'),
	ConsoleConnection = require('./ConsoleConnection');




DebugServer = function (config) {
	config = config || {};

	this._sourcePath = config.sourcePath;
console.log ('src', this._sourcePath)
	this._initAppConnection(config);
	this._initConsoleConnection(config);
};




DebugServer.prototype._initAppConnection = function (config) {
	var me = this,
		conn = this._appConnection = new AppConnection({ port: config.appPort });


	// Protocol

	conn.bind('connect', function () {
		var consoleConnected = me._consoleConnection.connected;

		conn._sendStatus({ consoleConnected: consoleConnected });
		if (consoleConnected) me._consoleConnection._sendStatus({ appConnected: true });
	});


	conn.bind('disconnect', function () {
		var consoleConn = me._consoleConnection;
		if (consoleConn.connected) consoleConn._sendStatus({ appConnected: false });
	});


	// Events

	conn.bind('engine-state-changed', function (state, data) {
		if (me._consoleConnection) me._consoleConnection.updateState(state, data);
	});


	conn.bind('lua-loaded', function (jsonUrl, url, code) {
console.log ('loaded', me._sourcePath, url);

		if (me._consoleConnection) me._consoleConnection.luaLoaded(jsonUrl, url, code);
	});


	conn.bind('lua-load-failed', function (jsonUrl, url) {
console.log ('failed', me._sourcePath, jsonUrl, url);
		// if (me._consoleConnection) me._consoleConnection.luaLoadFailed(jsonUrl);
		console.log ('lua-load-failed', arguments);
	});


	conn.bind('breakpoints-updated', function (data) {
		if (me._consoleConnection) me._consoleConnection.updateBreakpoints(data);
	});


	conn.bind('breakpoint-updated', function (jsonUrl, lineNumber, breakOn) {
		if (me._consoleConnection) me._consoleConnection.updateBreakpoint(jsonUrl, lineNumber, breakOn);
	});


	conn.bind('stop-at-breakpoints-updated', function (stops) {
		if (me._consoleConnection) me._consoleConnection.updateStopAtBreakpoints(stops);
	});

	conn.bind('error', function (error) {
		if (me._consoleConnection) me._consoleConnection.handleError(error);
	});

};




DebugServer.prototype._initConsoleConnection = function (config) {
	var me = this,
		conn = this._consoleConnection = new ConsoleConnection({ port: config.consolePort });

	
	// Protocol

	conn.bind('connect', function () {
		var appConnected = me._appConnection.connected;

		conn._sendStatus({ appConnected: appConnected });
		if (appConnected) me._appConnection._sendStatus({ consoleConnected: true });
	});


	conn.bind('disconnect', function () {
		var appConn = me._appConnection;
		if (appConn.connected) appConn._sendStatus({ consoleConnected: false });
	});


	// Events

	conn.bind('get-state-request', function (callback) {
		callback(me._appConnection.state);
	});


	conn.bind('toggle-breakpoint-request', function (jsonUrl, lineNumber) {
		if (me._appConnection) me._appConnection.toggleBreakpoint(jsonUrl, lineNumber);
	});


	conn.bind('toggle-stop-at-breakpoints-request', function () {
		if (me._appConnection) me._appConnection.toggleStopAtBreakpoints();
	});


	conn.bind('auto-step-request', function () {
		if (me._appConnection) me._appConnection.autoStep();
	});


	conn.bind('step-in-request', function () {
		if (me._appConnection) me._appConnection.stepIn();
	});


	conn.bind('step-over-request', function () {
		if (me._appConnection) me._appConnection.stepOver();
	});


	conn.bind('step-out-request', function () {
		if (me._appConnection) me._appConnection.stepOut();
	});


	conn.bind('pause-request', function () {
		if (me._appConnection) me._appConnection.pause();
	});

	conn.bind('resume-request', function () {
		if (me._appConnection) me._appConnection.resume();
	});

	conn.bind('reload-request', function () {
		if (me._appConnection) me._appConnection.reload();
	});

};




module.exports = DebugServer;

