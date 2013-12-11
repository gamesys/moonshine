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
 * @fileOverview Debug engine.
 *
 * Icons from Fugue icon set by Yusuke Kamiyamane (http://p.yusukekamiyamane.com).
 *
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
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
	this._status = shine.RUNNING;


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
	window.clearTimeout(this._readyInfoTimeout);

	while (this._loadQueue.length) {
		var data = this._loadQueue.pop();
		data[0].load.apply(data[0], data[1]);
	}
};




shine.debug._formatValue = function (val) {
	var result, fields, i;

	switch(true) {
		case typeof val == 'number':
			return val;

		case val && val instanceof shine.Table:
			result = {
				caption: shine.utils.coerce(val, 'string')
			};

			fields = {};

			for (i in val) {
				if (val.hasOwnProperty(i) && i != '__shine') fields[i] = typeof val[i] == 'number'? val[i] : shine.utils.coerce(val[i], 'string');
			}

			result.fields = fields;
			return result;

		default:
			return shine.utils.coerce(val, 'string');
	}			
};




shine.debug._getSuspendedGlobals = function () {
	var globals = this._resumeStack[0]._globals,
		result = {},
		i, val;

	for (i in globals) {
		if (globals.hasOwnProperty(i)) {
			val = globals[i];
			if (globals.hasOwnProperty(i) && i != '_G' && i != '__shine') result[i] = this._formatValue(val);
		}
	}

	return result;
};




shine.debug._getSuspendedLocals = function () {
	var closure = this._resumeStack[0],
		result = {},
		index = 0,
		i, local, pc, val;

	for (i in closure._data.locals) {
		if (closure._data.locals.hasOwnProperty(i)) {
			local = closure._data.locals[i];
			pc = closure._pc + 1;
				
			if (local.startpc < pc && local.endpc >= pc) {
				val = closure._register.getItem(index++);
				result[local.varname] = this._formatValue(val);
			}
		}
	}

	return result;
};




shine.debug._getSuspendedUpvalues = function () {
	var closure = this._resumeStack[0],
		result = {},
		i, up, val;

	for (i in closure._upvalues) {
		if (closure._upvalues.hasOwnProperty(i)) {
			up = closure._upvalues[i];
			val = up.getValue();
			result[up.name] = this._formatValue(val);
		}
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




shine.debug.getCurrentState = function (callback) {
	callback({
		loaded: this._loaded,
		breakpoints: this._breakpoints,
		stopAtBreakpoints: this._stopAtBreakpoints,
		errorLog: this._errorLog,
		engine: {
			state: this._status,
			data: this._statusData
		}
	});
};




shine.debug.handleFileLoaded = function (file, callback) {
	var debug = this,
		jsonUrl = file.url,
		pathData,
		url,
		sourcePath = file.data.sourcePath;

	if (sourcePath) {
		pathData = (jsonUrl || '').match(/^(.*)\/.*?$/);
		pathData = pathData === null? '.' : pathData[1] || '';

		url = pathData + '/' + sourcePath;
		url = url.replace(/\/\.\//g, '/').replace(/\/.*?\/\.\.\//g, '/');

	} else {
		url = jsonUrl.replace (/(.lua)?.json$/, '.lua');
	}

	this._breakpoints[jsonUrl] = this._breakpoints[jsonUrl] || [];

	function error (e) {
		debug._loaded[jsonUrl] = {
			filename: url,
			source: false
		};

		debug._trigger('lua-load-failed', [jsonUrl, url, e]);
		callback();
	}
	
	if (this.ui.name == 'remote') return error();	// Don't attempt to load locally when remote debugging (to prevent 404s).

	function success (data) {
		debug._loaded[jsonUrl] = {
			filename: url,
			source: data
		};

		debug._trigger('lua-loaded', [jsonUrl, url, data]);
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
		breakOn = !fileBreakpoints[lineNumber],
		vm, file;

	if (breakOn && (vm = shine.debug._vm) && (file = vm.fileManager._cache[jsonUrl])) {
		lineNumber = shine.debug._getClosestLine(lineNumber + 1, file) - 1;
		if (fileBreakpoints[lineNumber]) return;
	}

	fileBreakpoints[lineNumber] = breakOn;

	if (window.sessionStorage) window.sessionStorage.setItem('breakpoints', JSON.stringify(this._breakpoints));
	this._trigger('breakpoint-updated', [jsonUrl, lineNumber, breakOn]);

	if (breakOn && !this._stopAtBreakpoints) this.toggleStopAtBreakpoints();
};




shine.debug._getClosestLine = function (lineNumber, functionDef) {
	var best = -1,
		i, l, op, lastop,
		instructions = functionDef.instructions,
		positions = functionDef.linePositions,
		functions, functionBest;

	if (!positions) return -1;

	for (i = 0, l = positions.length; i < l; i++) {
		(op = instructions[i].op) !== undefined || (op = instructions[i * 4]);
		if (op == 0 || op == 35 || op == 36 || (op == 30 && lastop == 30)) continue;
		lastop = op

		if (positions[i] == lineNumber) return lineNumber;
		if (positions[i] > best && positions[i] < lineNumber) best = positions[i];
	}

	functions = functionDef.functions;

	for (i = 0, l = functions.length; i < l; i++) {
		functionBest = this._getClosestLine(lineNumber, functions[i]);
		if (functionBest == lineNumber) return lineNumber;
		if (functionBest > best && positions[i] < lineNumber) best = functionBest;
	}

	return best;
};




shine.debug.toggleStopAtBreakpoints = function () {
	var stop = this._stopAtBreakpoints = !this._stopAtBreakpoints;
	
	window.sessionStorage.setItem('stopAtBreakpoints', stop);
	this._trigger('stop-at-breakpoints-updated', [stop]);
};




shine.debug._setStatus = function (status, data) {
	data = data || {};
	this._status = status;

	var me = this;

	switch (status) {
		case shine.SUSPENDED:
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

	do {
		target = this._resumeStack[i++];
	} while (target !== undefined && !(target instanceof shine.Closure));

	if (!target) return this.resume();

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
	this._setStatus(shine.SUSPENDING);
	this._stepping = true;
};







(function () {
	
	
	var load = shine.VM.prototype.load;
	
	shine.VM.prototype.load = function (url, execute, coConfig) {
		var args = arguments;

		if (!shine.debug._ready) {
			shine.debug._loadQueue.push([this, arguments]);

			if (!shine.debug._readyInfoTimeout) {
				shine.debug._readyInfoTimeout = window.setTimeout(function () {
					console && console.info && console.info('The Moonshine debugger has suspended execution until a debug UI is found. Have you forgotten to include either local.debug.moonshine.js or remote.debug.moonshine.js in the page?');
				}, 3000);
			}

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
		
		shine.debug._vm = this._vm;

		if (shine.debug._status != shine.RUNNING) {
			if (shine.debug._callbackQueue.length < 100) {
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
			}
		} else {
			return execute.apply(this, arguments);
		}
	};
	
	
	

	var executeInstruction = shine.Closure.prototype._executeInstruction;
	
	shine.Closure.prototype._executeInstruction = function (pc, lineNumber) {
		var debug = shine.debug,
			jsonUrl = this._file.url,
			opcode = this._instructions[pc * 4];

		if (
			this._vm._status == shine.RUNNING &&													// Don't break if we're in the middle of resuming or suspending the VM.
			!debug._resumeStack.length && 															// Don't break if we're in the middle of resuming from the previous debug step.
			lineNumber != debug._currentLine && 													// Don't step more than once per line.
			[35, 36].indexOf(opcode) < 0 && 														// Don't break on closure declarations.
			!(shine.Coroutine._running && shine.Coroutine._running.status == shine.RESUMING)		// Don't break while a coroutine is resuming.
		) {		
			if (
				(debug._stepping && (!debug._steppingTo || debug._steppingTo == this)) || 			// Only break if stepping in, out or over  
				(debug._stopAtBreakpoints && debug._breakpoints[jsonUrl][lineNumber - 1])			// or we've hit a breakpoint.
			) {
				// Break execution

				debug._setStatus(shine.SUSPENDING);
				debug._currentFileUrl = jsonUrl;
				debug._currentLine = lineNumber;
				this._pc--;


				window.setTimeout (function () { 
					debug._setStatus(shine.SUSPENDED, { url: jsonUrl, line: lineNumber });
					// debug._trigger(shine.SUSPENDED, );
				}, 1);

				return;

			} else {
				debug._currentLine = undefined;
			}
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


		if ([30, 35].indexOf(opcode) >= 0 && debug._steppingTo == this) {	// If returning from or closing a function call, step over = step in
			delete debug._steppingTo;
		}

		return result;
	};




	var error = shine.Error,
		errors = [];
	 
	shine.Error = function (message) {
		this._debugData = {
			jsonUrl: shine.debug._lastFileUrl,
			lineNumber: shine.debug._lastLine,
			message: message
		};

		this._debugIndex = errors.length;
		errors[this._debugIndex] = this;

		error.apply(this, [message + ' [shine.Error:' + this._debugIndex + ']']);
	};
	
	shine.Error.prototype = error.prototype;
	shine.Error.catchExecutionError = error.catchExecutionError;	




	var onerror = window.onerror;

	window.onerror = function (message) { 		// Note: window.addEventListener does not supply error info in Firefox.
		var match = message.match(/\[shine.Error:(\d+)\]/),
			index, data;

		if (match) {
			index = parseInt(match[1], 10);
			data = errors[index]._debugData;

			shine.debug._errorLog.push(data);
			shine.debug._trigger('error', [data]);
		}

		if (onerror) return onerror.apply(this, arguments);
		return false;
	};


})();





shine.debug._resumeThread = function () {
	this._setStatus(shine.RESUMING);

	var f = this._resumeStack.pop();

	if (f) {
		try {
			if (f instanceof shine.Coroutine) {
				f.resume();
			} else if (f instanceof shine.Closure) {
				f._run();
			} else {
				f();
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

	while (this._status != shine.SUSPENDING && this._callbackQueue[0]) {
		this._callbackQueue.shift()()
	}

};




shine.debug._init ();






