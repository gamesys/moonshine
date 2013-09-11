/**
 * @fileOverview Debug engine.
 *
 * Icons from Fugue icon set by Yusuke Kamiyamane (http://p.yusukekamiyamane.com).
 *
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
 * @todo Refactor the entirety of this.
 */


var shine = shine || {};




shine.debug = new shine.EventEmitter();


shine.debug.AUTO_STEP_DELAY = 500;



shine.debug._init = function () {

	this._ready = false;
	this._loadQueue = [];
	this._active = true;
	this._stepping = false;
	this._breakpoints = {};
	this._stopAtBreakpoints = true;
	this._loaded = {};
	this._resumeStack = [];
	this._callbackQueue = [];
	this._errorLog = [];
	this._status = 'running';


	if (window.sessionStorage) {
		this._breakpoints = JSON.parse(window.sessionStorage.getItem('breakpoints') || '{}'),
		this._stopAtBreakpoints = (window.sessionStorage.getItem('stopAtBreakpoints') == 'true');
		if (this._stopAtBreakpoints === null) this._stopAtBreakpoints = true;

		this._trigger('breakpoints-updated', [this._breakpoints]);
		this._trigger('stop-at-breakpoints-updated', [this._stopAtBreakpoints]);
	}
};



	
shine.debug._clearLoadQueue = function () {
	this._ready = true;

	while (this._loadQueue.length) {
		var data = this._loadQueue.pop();
		data[0].load.apply(data[0], data[1]);
	}
};




shine.debug._getSuspendedGlobals = function () {
	var globals = this._resumeStack[0]._globals,
		result = {},
		i, val;

	for (i in globals) {
		val = globals[i];
		if (globals.hasOwnProperty(i) && i != '_G' && i != '__shine') result[i] = typeof val == 'number'? val : shine.utils.coerce(val, 'string');
	}

	return result;
};




shine.debug._getSuspendedLocals = function () {
	var closure = this._resumeStack[0],
		result = {},
		index = 0,
		i, local, pc, val;

	for (i in closure._data.locals) {
		local = closure._data.locals[i];
		pc = closure._pc + 1;
			
		if (local.startpc < pc && local.endpc >= pc) {
			val = closure._register.getItem(index++);
			result[local.varname] = typeof val == 'number'? val : shine.utils.coerce(val, 'string');
		}
	}

	return result;
};




shine.debug._getSuspendedUpvalues = function () {
	var closure = this._resumeStack[0],
		result = {},
		i, up, val;

	for (i in closure._upvalues) {
		up = closure._upvalues[i];
		val = up.getValue();
		result[up.name] = typeof val == 'number'? val : shine.utils.coerce(val, 'string');
	}

	return result;
};




shine.debug._getSuspendedCallStack = function () {
	var result = [],
		stack = this._resumeStack,
		closure,
		i, l,
		offset = 0;

	for (i = 0, l = stack.length; i < l; i++) {
		closure = stack[i];
		if (closure instanceof shine.Closure) {
			result.push([closure, closure._pc + offset]);
			offset = -1;
		}
	}

	result = shine.Error.prototype._stackToString.call({ luaStack: result }).replace('    ', '').split('\n');
	return result;
};




shine.debug.getCurrentState = function () {
	return {
		loaded: this._loaded,
		breakpoints: this._breakpoints,
		stopAtBreakpoints: this._stopAtBreakpoints,
		errorLog: this._errorLog,
		engine: {
			state: this._status,
			data: this._statusData
		}
	}
};




shine.debug.handleFileLoaded = function (file, callback) {
	var debug = this,
		jsonUrl = file.url,
		pathData,
		url,
		sourcePath = file.data.sourcePath;

	if (sourcePath) {
		pathData = (jsonUrl || '').match(/^(.*)\/.*?$/);
		pathData = (pathData && pathData[1]) || '';

		url = pathData + '/' + sourcePath;
		url = url.replace(/\/\.\//g, '/').replace(/\/.*?\/\.\.\//g, '/');

	} else {
		url = jsonUrl.replace (/(.lua)?.json$/, '.lua');
	}

	this._breakpoints[jsonUrl] = this._breakpoints[jsonUrl] || [];

	function success (data) {
		debug._loaded[jsonUrl] = {
			filename: url,
			source: data
		};

		debug._trigger('lua-loaded', [jsonUrl, url, data]);
		callback();
	}

	function error (e) {
		debug._loaded[jsonUrl] = {
			filename: url,
			source: false
		};

		debug._trigger('lua-load-failed', [jsonUrl, url, e]);
		callback();
	}
	
	shine.utils.get(url, success, error);
};




shine.debug.loadScript = function (jsonUrl, sourceUrl) {
	var pathData,
		url, 
		debug = this;

	if (sourceUrl) {
		pathData = (jsonUrl || '').match(/^(.*\/).*?$/),
		pathData = (pathData && pathData[1]) || '';
		url = pathData + sourceUrl;

	} else {
		url = jsonUrl.replace(/(.lua)?.json$/, '.lua');
	}

};

	


shine.debug.toggleBreakpoint = function (jsonUrl, lineNumber) {
	if (this._breakpoints[jsonUrl] === undefined) this._breakpoints[jsonUrl] = [];

	var fileBreakpoints = this._breakpoints[jsonUrl],
		breakOn = fileBreakpoints[lineNumber] = !fileBreakpoints[lineNumber];

	if (window.sessionStorage) window.sessionStorage.setItem('breakpoints', JSON.stringify(this._breakpoints));
	this._trigger('breakpoint-updated', [jsonUrl, lineNumber, breakOn]);

	if (breakOn && !this._stopAtBreakpoints) this.toggleStopAtBreakpoints();
};




shine.debug.toggleStopAtBreakpoints = function () {
	var stop = this._stopAtBreakpoints = !this._stopAtBreakpoints;
	
	window.sessionStorage.setItem('stopAtBreakpoints', stop);
	this._trigger('stop-at-breakpoints-updated', [stop]);
};




shine.debug._formatValue = function (val) {
	return shine.utils.coerce(val, 'string');
	// switch (true) {
	// 	case typeof val == 'string': return '"' + val + '"';
	// 	case val instanceof shine.Table: return shine.Table.prototype.toString.call(val);
	// 	default: return shine.utils.coerce(val, 'string');
	// }
};




shine.debug._setStatus = function (status, data) {
	data = data || {};
	this._status = status;

	var me = this;

	switch (status) {
		case 'suspended':
			data.globals = this._getSuspendedGlobals();
			data.locals = this._getSuspendedLocals();
			data.upvalues = this._getSuspendedUpvalues();
			data.callStack = this._getSuspendedCallStack();

			if (this._autoStepping) {
				window.setTimeout(function () {
					me.stepIn();
				}, this.AUTO_STEP_DELAY);
			}
			break;
	}

	this._statusData = data;
	this._trigger('state-updated', [status, data]);
}




shine.debug.autoStep = function () {
	if (this._autoStepping = !this._autoStepping) this.stepIn();
};




shine.debug.stepIn = function () {
	this._stepping = true;
	delete this._steppingTo;
	this._resumeThread();
};




shine.debug.stepOver = function () {
	this._stepping = true;
	this._autoStepping = false;
	this._steppingTo = this._resumeStack[0];
	this._resumeThread();
};




shine.debug.stepOut = function () {
	if (this._resumeStack.length < 2) return this.resume();
	
	var target,
		i = 1;

	// do {
		target = this._resumeStack[i++];
	// } while (target !== undefined && !(target instanceof shine.Closure));

	// if (!target) return this.resume();

	this._steppingTo = target;
	this._stepping = true;
	this._autoStepping = false;
	this._resumeThread();
};




shine.debug.resume = function () {
	this._stepping = false;
	this._autoStepping = false;
	delete this._steppingTo;
	this._resumeThread();

	this._trigger('resumed');
};




shine.debug.pause = function () {
	this._setStatus('suspending');
	this._stepping = true;
};







(function () {
	
	
	var load = shine.VM.prototype.load;
	
	shine.VM.prototype.load = function (url, execute, coConfig) {
		var args = arguments;

		if (!shine.debug._ready) {
			shine.debug._loadQueue.push([this, arguments]);
		} else {
			// shine.debug.handleFileLoaded(url, function () {
				load.apply(this, args);
			// });
		}
	};




	shine.FileManager.prototype._onFileLoaded = function (file, callback) {
		var me = this;

		shine.debug.handleFileLoaded(file, function () {
			callback(null, file);
		});
	};




	var execute = shine.Closure.prototype.execute;

	shine.Closure.prototype.execute = function () {
		var me = this,
			args = arguments;
		
		if (shine.debug._status != 'running') {
			shine.debug._callbackQueue.push(function () {

			try {
				me.execute.apply(me, args);
			
			} catch (e) {
				if (!((e || shine.EMPTY_OBJ) instanceof shine.Error)) {
					var stack = (e.stack || '');

					e = new shine.Error ('Error in host call: ' + e.message);
					e.stack = stack;
					e.luaStack = stack.split ('\n');
				}

				if (!e.luaStack) e.luaStack = shine.gc.createArray();
				e.luaStack.push([me, me._pc - 1]);

				shine.Error.catchExecutionError(e);
			}

			});
		} else {
			return execute.apply(this, arguments);
		}
	};
	
	
	

	var executeInstruction = shine.Closure.prototype._executeInstruction;
	
	shine.Closure.prototype._executeInstruction = function (pc, lineNumber) {
		var debug = shine.debug,
			jsonUrl = this._file.url,
			opcode = this._instructions[pc * 4];

		if ((
				(debug._stepping && (!debug._steppingTo || debug._steppingTo == this)) || 			// Only break if stepping in, out or over  
				(debug._stopAtBreakpoints && debug._breakpoints[jsonUrl][lineNumber - 1])			// or we've hit a breakpoint.
			) &&		
			!debug._resumeStack.length && 															// Don't break if we're in the middle of resuming from the previous debug step.
			lineNumber != debug._currentLine && 													// Don't step more than once per line.
			[35, 36].indexOf(opcode) < 0 && 														// Don't break on closure declarations.
			!(shine.Coroutine._running && shine.Coroutine._running.status == 'resuming')) {			// Don't break while a coroutine is resuming.

				// Break execution

				debug._setStatus('suspending');
				debug._currentFileUrl = jsonUrl;
				debug._currentLine = lineNumber;
				this._pc--;


				window.setTimeout (function () { 
					debug._setStatus('suspended', { url: jsonUrl, line: lineNumber });
					// debug._trigger('suspended', );
				}, 1);

				return;
		}


		debug._lastFileUrl = jsonUrl;
		debug._lastLine = lineNumber;


		try {
			var result = executeInstruction.apply(this, arguments);

		} catch (e) {
			if (e instanceof shine.Error) {
				if (!e.luaStack) e.luaStack = [];

				var message = 'at ' + (this._data.sourceName || 'function') + ' on line ' + this._data.linePositions[this._pc - 1];	
				// if (message != e.luaStack[e.luaStack.length - 1]) e.luaStack.push(message);
			} 
	
			throw e;
		}

		if ([30, 35].indexOf(opcode) >= 0) {	// If returning from or closing a function call, step out = step over = step in
			delete debug._steppingTo;
		}

		return result;
	};




	var error = shine.Error;
	 
	shine.Error = function (message) {
		error.apply(this, arguments);

// TODO: This is logging errors when error objects are being created, not when they are thrown. This needs to be corected.
		var err = {
			jsonUrl: shine.debug._lastFileUrl,
			lineNumber: shine.debug._lastLine,
			message: message
		};

		shine.debug._errorLog.push(err);
		shine.debug._trigger('error', [err]);
	};
	
	shine.Error.prototype = error.prototype;
	shine.Error.catchExecutionError = error.catchExecutionError;	
		
})();





shine.debug._resumeThread = function () {
	this._setStatus('resuming');

	var f = this._resumeStack.pop();

	if (f) {
		try {
			if (f instanceof shine.Coroutine) {
				f.resume();
			} else {
				f._run();
			}
			
		} catch (e) {
			if (!((e || shine.EMPTY_OBJ) instanceof shine.Error)) {
				var stack = (e.stack || '');

				e = new shine.Error ('Error in host call: ' + e.message);
				e.stack = stack;
				e.luaStack = stack.split ('\n');
			}

			if (!e.luaStack) e.luaStack = shine.gc.createArray();
			e.luaStack.push([f, f._pc - 1]);

			shine.Error.catchExecutionError(e);
		}
	}
	
	// if (this._status == 'running') this._trigger('running');
	while (this._callbackQueue[0]) this._callbackQueue.shift()();
};




shine.debug._init ();







////////////////
//  Local UI  //
////////////////


shine.debug.ui = {

	init: function () {

		var me = this,
			iframe = this.iframe = document.createElement('iframe');

		iframe.src = '../debug/ui/index.html';
		iframe.style.position = 'fixed';
		iframe.style.top = '0';
		iframe.style.right = '20px';
		iframe.style.width = '232px';
		iframe.style.height = '30px';
		iframe.style.overflow = 'hidden';
		iframe.style.border = 'none';

		// window.addEventListener('load', function () {
			document.body.appendChild(iframe);

			iframe.contentWindow.addEventListener('load', function () {
				me._initIFrame(iframe);
			});			
		// });

	},




	_initIFrame: function (iframe) {
		var doc = iframe.contentDocument,
			toggle = document.createElement('button');

		// Toggle size;
		toggle.className = 'toggle';
		toggle.title = 'Toggle size';
		toggle.textContent = 'Size';


		function toggleExpanded () {
			var expand = toggle.className == 'toggle';

			if (expand) {
				iframe.style.width = '50%';
				iframe.style.right = '0';
				iframe.style.height = '100%';
				toggle.className = 'toggle expanded';

			} else {
				iframe.style.right = '20px';
				iframe.style.width = '232px';
				iframe.style.height = '30px';
				toggle.className = 'toggle';
			}

			if (sessionStorage) sessionStorage.setItem('expanded', expand? '1' : '');
		}

		toggle.addEventListener('click', toggleExpanded);	
		if (sessionStorage && sessionStorage.getItem('expanded')) toggleExpanded();


		iframe.contentDocument.querySelector('.buttons').appendChild(toggle);
		iframe.contentWindow.registerDebugEngine(shine.debug);
		shine.debug._clearLoadQueue();
	},

};


// Give time for the ui to be overridden
window.addEventListener('load', function () { shine.debug.ui.init(); });





shine.debug.ui = {

	
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
		AUTO_STEP: 109
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
			callback(shine.debug.getCurrentState());
		});

		socket.on(me.messageTypes.TOGGLE_BREAKPOINT, function (data) {
			shine.debug.toggleBreakpoint(data[0], data[1]);
		});

		socket.on(me.messageTypes.TOGGLE_STOP_AT_BREAKPOINT, function () {
			shine.debug.toggleStopAtBreakpoints();
		});

		socket.on(me.messageTypes.AUTO_STEP, function () {
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

		debug.bind('state-updated', function (state, data) {
			me._send(me.messageTypes.ENGINE_STATE_CHANGED, [state, data]);
		});


		debug.bind('error', function (error) {
			me._send(me.messageTypes.ERROR, error);
		});

		debug.bind('lua-loaded', function (jsonUrl, luaUrl, data) {
			me._files[jsonUrl] = {
				filename: luaUrl,
				source: data
			};

			me._send(me.messageTypes.LUA_LOADED, [jsonUrl, luaUrl, data]);
		});

		debug.bind('lua-load-failed', function (jsonUrl, luaUrl) {
			me._files[jsonUrl] = {
				filename: luaUrl,
				source: false
			};

			me._send(me.messageTypes.LUA_LOAD_FAILED, [jsonUrl, luaUrl]);
		});

		debug.bind('breakpoints-updated', function (data) {
			me._send(me.messageTypes.BREAKPOINTS_UPDATED, [data]);
		});

		debug.bind('breakpoint-updated', function (jsonUrl, lineNumber, breakOn) {
			me._send(me.messageTypes.BREAKPOINT_UPDATED, [jsonUrl, lineNumber, breakOn]);
		});

		debug.bind('stop-at-breakpoints-updated', function (stop) {
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
		this.elements.ip.style.width = '80px';
		this.elements.ip.style.margin = '0 2px';

		this.elements.port.placeholder = 'Port';
		this.elements.port.name = 'port';
		this.elements.port.value = '1959';
		this.elements.port.style.width = '40px';

		this.elements.connect.textContent = 'Connect';
		this.elements.connect.addEventListener('click', function () { me._handleConnectClick(); });

		this.elements.status.style.lineHeight = '24px';
		this.elements.status.style.marginRight = '4px';

		this.elements.stop.textContent = 'Stop';
		this.elements.stop.addEventListener('click', function () { me._handleStopClick(); });

		this.clear();
		document.body.appendChild(main);
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
	}


};



