
var AbstractConnection = require('./AbstractConnection.js');



AppConnection = function (config) {
	config = config || {};

	this._port = config.port || 1959;
	this._reset();

	AbstractConnection.apply(this, arguments);
};


AppConnection.prototype = new AbstractConnection();
AppConnection.prototype.constructor = AppConnection;


AppConnection.messageTypes = {
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




AppConnection.prototype._onReady = function () {
	console.log('Debug server listening on port: ' + this._port);	
};




AppConnection.prototype._onConnection = function () {
	var me = this;

	console.log ('App found.');

	this._send(this.constructor.messageTypes.GET_STATE, undefined, function (state) {
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
 	var messageTypes = this.constructor.messageTypes;

 	switch (type) {

 		case messageTypes.ENGINE_STATE_CHANGED:
 			this.state.engine = {
 				state: data[0],
 				data: data[1]
 			};

 			this._trigger('engine-state-changed', data);
 			break;


 		case messageTypes.LUA_LOADED:
 			this.state.loaded[data[0]] = {
 				filename: data[1],
 				source: data[2]
 			};

 			this._trigger('lua-loaded', data);

 			break;


 		case messageTypes.LUA_LOAD_FAILED:
 			this.state.loaded[data[0]] = {
 				filename: data[1],
 				source: false
 			};

  			this._trigger('lua-load-failed', data);

 			break;


 		case messageTypes.BREAKPOINTS_UPDATED:
 			this.state.breakpoints = data;
 			this._trigger('breakpoints-updated', data);

 			break;


 		case messageTypes.BREAKPOINT_UPDATED:
 			var breakpoints = this.state.breakpoints;
 			if (breakpoints[data[0]] === undefined) breakpoints[data[0]] = [];
 			
 			breakpoints[data[1]] = data[2];
 			this._trigger('breakpoint-updated', data);

 			break;


 		case messageTypes.STOP_AT_BREAKPOINTS_UPDATED:
 			this.state.stopAtBreakpoints = data[0];
 			this._trigger('stop-at-breakpoints-updated', data);

 			break;


 		case messageTypes.ERROR:
 			this.state.errorLog.push(data);
 			this._trigger('error', data);

 			break;

 	}
};




AppConnection.prototype.toggleBreakpoint = function (jsonUrl, line) {
	this._send(this.constructor.messageTypes.TOGGLE_BREAKPOINT, [jsonUrl, line]);
};




AppConnection.prototype.toggleStopAtBreakpoints = function (stops) {
	this._send(this.constructor.messageTypes.TOGGLE_STOPS_AT_BREAKPOINTS, stops);
};




AppConnection.prototype.autoStep = function () {
	this._send(this.constructor.messageTypes.AUTO_STEP);
};




AppConnection.prototype.stepIn = function () {
	this._send(this.constructor.messageTypes.STEP_IN);
};




AppConnection.prototype.stepOver = function () {
	this._send(this.constructor.messageTypes.STEP_OVER);
};




AppConnection.prototype.stepOut = function () {
	this._send(this.constructor.messageTypes.STEP_OUT);
};




AppConnection.prototype.pause = function () {
	this._send(this.constructor.messageTypes.PAUSE);
};




AppConnection.prototype.resume = function () {
	this._send(this.constructor.messageTypes.RESUME);
};




AppConnection.prototype.reload = function () {
	this._send(this.constructor.messageTypes.RELOAD);
};




module.exports = AppConnection;

