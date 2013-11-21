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