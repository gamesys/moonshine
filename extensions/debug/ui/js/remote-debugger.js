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


(function () {


	var api = {},
		socket,
		listeners = {},
		statusElement = document.querySelector('#remote-status'),


		messageTypes = {
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
			TOGGLE_AUTO_STEP: 109
		};



	api.toggleBreakpoint = function (jsonUrl, lineNumber) {
		send(messageTypes.TOGGLE_BREAKPOINT, [jsonUrl, lineNumber]);
	};




	api.toggleStopAtBreakpoints = function () {
		send(messageTypes.TOGGLE_STOP_AT_BREAKPOINTS);
	};




	api.autoStep = function () {
		send(messageTypes.TOGGLE_AUTO_STEP);
	};




	api.stepIn = function () {
		send(messageTypes.STEP_IN);
	};




	api.stepOver = function () {
		send(messageTypes.STEP_OVER);
	};




	api.stepOut = function () {
		send(messageTypes.STEP_OUT);
	};




	api.resume = function () {
		send(messageTypes.RESUME);
	};




	api.pause = function () {
		send(messageTypes.PAUSE);
	};




	api.reload = function () {
		send(messageTypes.RELOAD);
	};




	api.getCurrentState = function (callback) {
		send(messageTypes.GET_STATE, undefined, function (state) {
			callback(state);
			api._trigger('state-updated', [state.engine.state, state.engine.data]);
		});
	};




	api.on = function (event, listener) {
		listeners[event] = listener;
	};




	api._trigger = function (event, data) {
		if (listeners[event]) listeners[event].apply(this, data);
	};




	function init () {
		document.body.className += 'remote';
		document.querySelector('button.reload').addEventListener('click', api.reload);

		var script = document.createElement('script');
		script.src = '/socket.io/socket.io.js';
		document.head.appendChild(script);

		script.addEventListener('load', function () {
			socket = io.connect();

			socket.on('connect', function () {
				updateRemoteStatus('waiting', 'Debug server connected. Waiting for remote app...');
			});	


			socket.on('disconnect', function () {
				updateRemoteStatus('disconnected', 'Debug server disconnected.');

				var state = {
					loaded: {},
					breakpoints: {},
					stopAtBreakpoints: false,
					errorLog: []
				};

				api._trigger('reset', [api, state]);
			});			


			socket.on('status', function (status) {
				if (status.appConnected) {
					updateRemoteStatus('connected', 'Connected to remote app.');
				} else {
					updateRemoteStatus('waiting', 'Lost connection to remote app.');
				}

				api._trigger('reset', [api]);
			});			


			socket.on('error', function (data) {
				console.error('Error from Moonshine debug server:', data.message);
			});


			socket.on(messageTypes.ENGINE_STATE_CHANGED, function (data) {
				api._trigger('state-updated', data);
			});			


			socket.on(messageTypes.LUA_LOADED, function (data) {
				api._trigger('lua-loaded', data);
			});			


			socket.on(messageTypes.LUA_LOAD_FAILED, function (data) {
				api._trigger('lua-load-failed', data);
			});			


			socket.on(messageTypes.BREAKPOINT_UPDATED, function (data) {
				api._trigger('breakpoint-updated', data);
			});			


			socket.on(messageTypes.STOP_AT_BREAKPOINTS_UPDATED, function (stops) {
				api._trigger('stop-at-breakpoints-updated', [stops]);
			});			


			socket.on(messageTypes.ERROR, function (error) {
				api._trigger('error', [error]);
			});			


			registerDebugEngine(api);
		});

	}


	

	function send (event, data, callback) {
		if (socket) socket.emit('message', [event, data], callback);
	}




	function updateRemoteStatus (status, caption) {
		statusElement.className = status;
		statusElement.textContent = caption;
	}




	init();


})();