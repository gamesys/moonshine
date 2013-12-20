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

/**
 * @fileOverview Remote UI and server connections for debug engine.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */


var shine = shine || {};
shine.debug = shine.debug || {};




shine.debug.ui = {

	name: 'remote',
	
	_socket: null,
	_files: {},


	messageTypes: {
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
	},




	init: function () {
		this._setupHooks();
		shine.debug._clearLoadQueue();
		this._initUI();
		this.start();
	},



	start: function () {
		var ip, port, autoConnect;

		if (localStorage) {
			ip = localStorage.getItem('ip');
			port = localStorage.getItem('port');
			autoConnect = localStorage.getItem('autoConnect') == 'true';
		}

		ip = ip || '127.0.0.1';
		port = port || '1959';

		if (!autoConnect) {
			this.showForm(ip, port);
		} else {
			this.connect(ip, port);
		}
	},




	connect: function (ip, port) {
		var me = this,
			url = 'http://' + ip + ':' + port,
			script;

		this.showStatus(false, 'Attempting to connect...');

		if (typeof io == 'object') {
			this._initSocket(url);

		} else if (typeof require == 'function') {
			require([url + '/socket.io/socket.io.js'], function () { me._initSocket(url); });

		} else {
			script = document.createElement('script');

			script.src = url + '/socket.io/socket.io.js';
			document.head.appendChild(script);
			script.addEventListener('load', function () { me._initSocket(url); });
			script.addEventListener('error', function (e) { me.showStatus(false, 'Not found.'); });
		}
	},




	_initSocket: function (url) {
		var me = this,
			socket = this._socket = io.connect(url);


		// Protocol 

		socket.on('connect', function () {
			me.showStatus(true, 'Connected');
		});

		socket.on('disconnect', function () {
			me.showStatus(false, 'Disconnected');
		});


		socket.on('status', function (status) {
			// console.log('Status changed:', status);
		});			

		socket.on('error', function (data) {
			var message = data.message? 'Error from Moonshine debug server:' + data.message : 'Disconnected'
			me.showStatus(false, message);
		});


		// Events

		socket.on(me.messageTypes.GET_STATE, function (data, callback) {
			// callback(shine.debug.getCurrentState());
			shine.debug.getCurrentState(callback);
		});

		socket.on(me.messageTypes.TOGGLE_BREAKPOINT, function (data) {
			shine.debug.toggleBreakpoint(data[0], data[1]);
		});

		socket.on(me.messageTypes.TOGGLE_STOP_AT_BREAKPOINT, function () {
			shine.debug.toggleStopAtBreakpoints();
		});

		socket.on(me.messageTypes.TOGGLE_AUTO_STEP, function () {
			shine.debug.autoStep();
		});

		socket.on(me.messageTypes.STEP_IN, function () {
			shine.debug.stepIn();
		});

		socket.on(me.messageTypes.STEP_OVER, function () {
			shine.debug.stepOver();
		});

		socket.on(me.messageTypes.STEP_OUT, function () {
			shine.debug.stepOut();
		});

		socket.on(me.messageTypes.PAUSE, function () {
			shine.debug.pause();
		});

		socket.on(me.messageTypes.RESUME, function () {
			shine.debug.resume();
		});

		socket.on(me.messageTypes.RELOAD, function () {
			document.location.reload();
		});
	},




	_setupHooks: function () {
		var me = this,
			debug = shine.debug;

		debug.on('state-updated', function (state, data) {
			me._send(me.messageTypes.ENGINE_STATE_CHANGED, [state, data]);
		});


		debug.on('error', function (error) {
			me._send(me.messageTypes.ERROR, error);
		});

		debug.on('lua-loaded', function (jsonUrl, luaUrl, data) {
			me._files[jsonUrl] = {
				filename: luaUrl,
				source: data
			};

			me._send(me.messageTypes.LUA_LOADED, [jsonUrl, luaUrl, data]);
		});

		debug.on('lua-load-failed', function (jsonUrl, luaUrl) {
			me._files[jsonUrl] = {
				filename: luaUrl,
				source: false
			};

			me._send(me.messageTypes.LUA_LOAD_FAILED, [jsonUrl, luaUrl]);
		});

		debug.on('breakpoints-updated', function (data) {
			me._send(me.messageTypes.BREAKPOINTS_UPDATED, [data]);
		});

		debug.on('breakpoint-updated', function (jsonUrl, lineNumber, breakOn) {
			me._send(me.messageTypes.BREAKPOINT_UPDATED, [jsonUrl, lineNumber, breakOn]);
		});

		debug.on('stop-at-breakpoints-updated', function (stop) {
			me._send(me.messageTypes.STOP_AT_BREAKPOINTS_UPDATED, [stop]);
		});

	},




	_send: function (event, data) {
		if (this._socket) this._socket.emit('message', [event, data]);
	},




	_initUI: function () {
		var me = this;

		this.elements = {
			main: document.createElement('div'),
			ip: document.createElement('input'),
			port: document.createElement('input'),
			connect: document.createElement('button'),
			stop: document.createElement('button'),
			status: document.createElement('p')
		};
		
		var style = this.elements.main.style;
		style.zIndex = '999';
		style.position = 'fixed';
		style.top = style.right = '0';
		style.backgroundColor = '#ddd';
		style.fontFamily = 'monospace';
		style.padding = '1px';
		style.borderBottomLeftRadius = '3px'

		style = this.elements.status.style;
		style.paddingLeft = '22px';
		style.background = 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAABACAYAAAB7jnWuAAACzUlEQVRoQ+2YMUgbURjH/xetd4lJrBka1ArBYjVIY8GSUtpJPAg4FLrq4CSI1EXJ4OTkEHSxSMHJQVfXBq67rVSw2kIUa46mxkuxuZrzcr1cvOuzQyzYIW84pPAOPt7y3vv+73ff98H3cbjhj7th/2ACGAFGgBH4DwmshYJo5EbAeUQ4aCOl7ASOLaHqrGO0WKKtrHQElojzkGehp7Nb7O3oCfuafLxu6mbmeL9w8O1QQtGewRSdCDoBq60T9zvvJ6Pt0YhhGLXH8jyPT7nPclY5SmFMfU1DgU7ASmhjcGAwUdZ0r23bME3zjzmOA6GZNz7Ke2mMF1+4J2C5ZXMwPhQ/Vo49qqbCqlpXFJp4W/mR38Lk2RP3BCwGNqIPHyQUXfFec2I5hiqfpjGtuUhg3j8R7GhNCt2+iOVcvZ5kA8oHmmwqRgqz5y7GwByCsHwLQpdX5KPNYc7fwF9oVbOS0Qvm0S8Jt8ozmANVKtIF4SX3l0TEuYfUAU4k1kYikNQBR4LfXscrOueX19ELoImwOvYyAYwAI8AIMAKMACPACDACjAAjQE1gDQg2AiPkoEgaojaynpBVqgLro3C5L1gizkPAwr1YTOyKxcJCIMAbpZKZ3d0tfNnbk4rAzBSlCCoCq8BEV19fMtLfH9F1vdZ2CIKA7M6O/HV/PzUGuNcbrgAbz4aHE6eqem0+EPD5jMPt7fQ44F53vAxsPk0k4rls1qOpKqrWX/MBr9c+zee3JgH35gOLhMBALJYo5XLX5gMWxxlysZiedpPAPImBuy0tyW5BiNiVSi0GSBbgoFyWFdNMzboZA49JFgxdZoEgiL08H/ZzHK9dXJiZSqVwZJrSW5IF793MAvLQplagNw48bwceeYA7NvA9D3x4B7w5AzJkz3kdXXltC1UaklMNxG4T4//hhNQi/CR29W/qUEIroI4r6bYwAYwAI8AIMAK/Aaa5C1CpdopDAAAAAElFTkSuQmCC) -4px -36px no-repeat';

		var main = this.elements.main;
		main.appendChild(this.elements.ip);
		main.appendChild(this.elements.port);
		main.appendChild(this.elements.connect);
		main.appendChild(this.elements.status);
		main.appendChild(this.elements.stop);

		this.elements.ip.placeholder = 'Debug IP';
		this.elements.ip.name = 'ip';
		this.elements.ip.value = '127.0.0.1';
		this.elements.ip.style.width = '95px';
		this.elements.ip.style.margin = '0 2px';

		this.elements.port.placeholder = 'Port';
		this.elements.port.name = 'port';
		this.elements.port.value = '1959';
		this.elements.port.style.width = '40px';

		this.elements.connect.textContent = 'Connect';
		this.elements.connect.style.border = '1px solid #aaa';
		this.elements.connect.style.marginLeft = '2px';
		this.elements.connect.addEventListener('click', function () { me._handleConnectClick(); });

		this.elements.status.style.lineHeight = '24px';
		this.elements.status.style.margin = '0 4px 0 0';

		this.elements.stop.textContent = 'Stop';
		this.elements.stop.style.border = '1px solid #aaa';
		this.elements.stop.style.marginLeft = '2px';
		this.elements.stop.addEventListener('click', function () { me._handleStopClick(); });

		this.clear();

		if (document.body) {
			document.body.appendChild(main);
		} else {
			window.addEventListener('load', function () {
				document.body.appendChild(main);
			});
		}
	},




	_handleConnectClick: function () {
		var ip = this.elements.ip.value,
			port = this.elements.port.value;

		if (localStorage) {
			localStorage.setItem('ip', ip);
			localStorage.setItem('port', port);
			localStorage.setItem('autoConnect', 'true');
		}

		if (ip && port) this.connect(ip, port);
	},




	_handleStopClick: function () {
		if (localStorage) localStorage.setItem('autoConnect', 'false');

		this._closeSocket();
		this.start();
	},




	clear: function () {
		for (var i in this.elements) {
			if (i != 'main') this.elements[i].style.display = 'none';
		}
	},




	showForm: function (ip, port) {
		this.clear();
		this.elements.ip.value = ip;
		this.elements.port.value = port;
		this.elements.ip.style.display = this.elements.port.style.display = this.elements.connect.style.display = 'inline';
	},




	showStatus: function (connected, caption) {
		this.clear();
		this.elements.status.style.backgroundPositionY = connected? '-4px' : '-36px';
		this.elements.status.textContent = caption;
		this.elements.status.style.display = this.elements.stop.style.display = 'inline-block';
	},




	_closeSocket: function () {
		if (this._socket && this._socket.socket.connected) {
			this.showStatus(false, 'Disconnecting...');
			this._socket.disconnect();

			for (var i in io.sockets) {
				if (io.sockets[i] === this._socket.socket) {
					delete io.sockets[i];
					break;
				}
			}

			delete this._socket;
		}
	},




	dispose: function () {
		this._closeSocket();
		document.body.removeChild(this.elements.main);
	}


};




shine.debug.ui.init();

