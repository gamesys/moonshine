
var express = require('express'),
	AbstractConnection = require('./AbstractConnection.js');




ConsoleConnection = function (config) {
	config = config || {};

	this._port = config.port || 1969;
	AbstractConnection.apply(this, arguments);
};


ConsoleConnection.prototype = new AbstractConnection();
ConsoleConnection.prototype.constructor = ConsoleConnection;


ConsoleConnection.messageTypes = {
	ENGINE_STATE_CHANGED: 0,
	LUA_LOADED: 1,
	LUA_LOAD_FAILED: 2,
	BREAKPOINTS_UPDATED: 3,
	BREAKPOINT_UPDATED: 4,
	STOP_AT_BREAKPOINTS_UPDATED: 5,
	ERROR: 6,

	GET_STATE: 100,
	TOGGLE_BREAKPOINT: 101,
	TOGGLE_STOP_AT_BREAKPOINTS: 102,
	STEP_IN: 103,
	STEP_OVER: 104,
	STEP_OUT: 105,
	PAUSE: 106,
	RESUME: 107,
	RELOAD: 108,
	AUTO_STEP: 109
};




ConsoleConnection.prototype._onReady = function () {
	this._app.use(express.static(__dirname + '/../ui'));
	console.log('To view the console, go to: http://127.0.0.1:' + this._port);
};




ConsoleConnection.prototype._onConnection = function () {
	console.log ('Console connected.');
	this._trigger('connect');
};




ConsoleConnection.prototype._onDisconnect = function () {
	console.log ('Console disconnected.');
};




ConsoleConnection.prototype._processMessage = function (type, data, callback) {
 	var messageTypes = this.constructor.messageTypes;

 	switch (type) {

 		case messageTypes.GET_STATE:
 			this._trigger('get-state-request', callback);
 			break;

 		case messageTypes.TOGGLE_BREAKPOINT:
 			this._trigger('toggle-breakpoint-request', data);
 			break;

 		case messageTypes.TOGGLE_STOP_AT_BREAKPOINTS:
 			this._trigger('toggle-stop-at-breakpoints-request');
 			break;

 		case messageTypes.AUTO_STEP:
 			this._trigger('auto-step-request');
 			break;

 		case messageTypes.STEP_IN:
 			this._trigger('step-in-request');
 			break;

 		case messageTypes.STEP_IN:
 			this._trigger('step-in-request');
 			break;

 		case messageTypes.STEP_OVER:
 			this._trigger('step-over-request');
 			break;

 		case messageTypes.STEP_OUT:
 			this._trigger('step-out-request');
 			break;

 		case messageTypes.PAUSE:
 			this._trigger('pause-request');
 			break;

 		case messageTypes.RESUME:
 			this._trigger('resume-request');
 			break;

 		case messageTypes.RELOAD:
 			this._trigger('reload-request');
 			break;
	}
};




ConsoleConnection.prototype.updateState = function (state, data) {
	this._send(this.constructor.messageTypes.ENGINE_STATE_CHANGED, [state, data]);
};




ConsoleConnection.prototype.luaLoaded = function (jsonUrl, url, code) {
	this._send(this.constructor.messageTypes.LUA_LOADED, [jsonUrl, url, code]);
};




ConsoleConnection.prototype.luaLoadFailed = function (jsonUrl) {
	this._send(this.constructor.messageTypes.LUA_LOAD_FAILED, [jsonUrl]);
};




ConsoleConnection.prototype.updateBreakpoints = function (data) {
	this._send(this.constructor.messageTypes.BREAKPOINTS_UPDATED, [data]);
};




ConsoleConnection.prototype.updateBreakpoint = function (jsonUrl, lineNumber, breakOn) {
	this._send(this.constructor.messageTypes.BREAKPOINT_UPDATED, [jsonUrl, lineNumber, breakOn]);
};




ConsoleConnection.prototype.updateStopAtBreakpoints = function (stops) {
	this._send(this.constructor.messageTypes.STOP_AT_BREAKPOINTS_UPDATED, stops);
};




ConsoleConnection.prototype.handleError = function (error) {
	this._send(this.constructor.messageTypes.ERROR, error);
};




module.exports = ConsoleConnection;
