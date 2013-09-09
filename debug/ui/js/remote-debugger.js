
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
			AUTO_STEP: 109
		};



	api.toggleBreakpoint = function (jsonUrl, lineNumber) {
		send(messageTypes.TOGGLE_BREAKPOINT, [jsonUrl, lineNumber]);
	};




	api.toggleStopAtBreakpoints = function () {
		send(messageTypes.TOGGLE_STOP_AT_BREAKPOINTS);
	};




	api.autoStep = function () {
		send(messageTypes.AUTO_STEP);
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




	api.bind = function (event, listener) {
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
			socket = io.connect('127.0.0.1:1969');

			socket.on('connect', function () {
				updateRemoteStatus('waiting', 'Debug server connected. Waiting for remote app...');
			});	


			socket.on('disconnect', function () {
				updateRemoteStatus('disconnected', 'Debug server disconnected.');
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