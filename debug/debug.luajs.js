/**
 * @fileOverview Debug engine.
 * @author <a href="http://paulcuth.me.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
 * @todo Refactor the entirety of this.
 */


var luajs = luajs || {};




luajs.debug = { 
	active: true,
	stepping: false,
	breakpoints: [],
	stopAtBreakpoints: true,
	loaded: {},
	ui: {},
	resumeStack: [],
	callbackQueue: [],
	status: 'running'
};




luajs.debug._init = function () {
	luajs.debug.ui.container = $('<div>').addClass ('luajs-debug')[0];
	luajs.debug.ui.buttons = $('<div>').text ('luajs.debug ').addClass ('buttons').appendTo (luajs.debug.ui.container)[0];
	luajs.debug.ui.codeWrap = $('<div>').addClass ('code').appendTo (luajs.debug.ui.container)[0];
	luajs.debug.ui.code = $('<ol>').appendTo (luajs.debug.ui.codeWrap)[0];

	luajs.debug.ui.inspector = $('<div>').addClass ('inspector').appendTo (luajs.debug.ui.container)[0];	
	$('<h6>Locals</h6>').appendTo (luajs.debug.ui.inspector);
	luajs.debug.ui.locals = $('<dl>').addClass ('locals').appendTo (luajs.debug.ui.inspector)[0];
	$('<h6>Upvalues</h6>').appendTo (luajs.debug.ui.inspector);
	luajs.debug.ui.upvalues = $('<dl>').addClass ('upvalues').appendTo (luajs.debug.ui.inspector)[0];

	luajs.debug.ui.tableInspector = $('<p>').addClass ('table-inspector').appendTo (luajs.debug.ui.container).mouseleave (function (e) {
		$(this).hide ();
	})[0];

	luajs.debug.ui.error = $('<p>').addClass ('error').appendTo (luajs.debug.ui.container)[0];


	$('<button>').text ('Pause/resume').addClass ('pause-resume').appendTo (luajs.debug.ui.buttons).click (function () {
		luajs.debug[luajs.debug.status == 'running'? 'pause' : 'resume'] ();
	});
	
	$('<button>').text ('Step over').addClass ('step-over').appendTo (luajs.debug.ui.buttons).click (luajs.debug.stepOver);
	$('<button>').text ('Step in').addClass ('step-in').appendTo (luajs.debug.ui.buttons).click (luajs.debug.stepIn);
	$('<button>').text ('Step out').addClass ('step-out').appendTo (luajs.debug.ui.buttons).click (luajs.debug.stepOut);
	$('<button>').text ('Toggle breakpoints').addClass ('breakpoints').appendTo (luajs.debug.ui.buttons).click (luajs.debug._toggleStopAtBreakpoints);
	$('<button>').text ('Toggle code').addClass ('toggle-code').appendTo (luajs.debug.ui.buttons).click (luajs.debug._toggleCode);


	$(window).load (function () { 
		$('body').append (luajs.debug.ui.container); 
	});
	
	if (window.sessionStorage) {
		var data = JSON.parse (window.sessionStorage.getItem ('breakpoints') || '{}'),
			i;
		
		for (i in data) luajs.debug.breakpoints[i] = data[i];
		
		luajs.debug.stopAtBreakpoints = (window.sessionStorage.getItem ('stopAtBreakpoints') == 'true');
		if (luajs.debug.stopAtBreakpoints === null) luajs.debug.stopAtBreakpoints = true;
	}


	if (luajs.debug.stopAtBreakpoints) $(luajs.debug.ui.container).addClass ('stop-at-breakpoints');
};


	

luajs.debug.loadScript = function (jsonUrl, callback) {
	var url = jsonUrl.replace (/.json$/, '.lua');
	
	jQuery.ajax ({
		url: url, 
		success: function (data) {
			luajs.debug.loaded[jsonUrl] = data;
			luajs.debug.showScript (jsonUrl);
		
			callback ();
		},
		error: function () {
			$(luajs.debug.ui.code).html ('<li class="load-error">' + url + ' could not be loaded.</li>');
			callback ();
		}
	});
};


	

luajs.debug.showScript = function (jsonUrl) {
	var lines = luajs.debug.loaded[jsonUrl].toString ().split ('\n'),
		index, li, code;

	luajs.debug.ui.code.innerHTML = '';
	luajs.debug.ui.lines = [];
	
	for (index in lines) {
		(function (index) {
			li = $('<li>').appendTo (luajs.debug.ui.code).click (function (e) {
				if (e.pageX < $(this).offset ().left) luajs.debug._toggleBreakpoint (index);
			})[0];
			
			$('<code>').text (lines[index]).appendTo (li);
			if (luajs.debug.breakpoints[index]) $(li).addClass ('breakpoint');

			luajs.debug.ui.lines.push (li);
		})(index);
	}

};

	


luajs.debug._toggleBreakpoint = function (lineNumber) {
	var breakOn = luajs.debug.breakpoints[lineNumber] = !luajs.debug.breakpoints[lineNumber];
	$(luajs.debug.ui.lines[lineNumber])[breakOn? 'addClass' : 'removeClass'] ('breakpoint');
	
	if (window.sessionStorage) window.sessionStorage.setItem ('breakpoints', JSON.stringify (luajs.debug.breakpoints));
};




luajs.debug._toggleCode = function () {
	var showing = luajs.debug.showingCode = !luajs.debug.showingCode;
	$(luajs.debug.ui.container)[showing? 'addClass' : 'removeClass'] ('showing-code'); 
};




luajs.debug._toggleStopAtBreakpoints = function () {
	var stop = luajs.debug.stopAtBreakpoints = !luajs.debug.stopAtBreakpoints;
	
	window.sessionStorage.setItem ('stopAtBreakpoints', stop);
	$(luajs.debug.ui.container)[stop? 'addClass' : 'removeClass'] ('stop-at-breakpoints'); 
};




luajs.debug._formatValue = function (val) {
	if (typeof val == 'string') {
		val = '"' + val + '"';

	} else if (val === undefined) {
		val = 'nil';

	} else if (val.constructor == luajs.Table) {	// In case table has a toString field in the Lua code.
		val = luajs.Table.prototype.toString.call (val);

	} else {
		val = '' + val;
	}
	
	return val;
};



	
luajs.debug._showVariables = function () {
	var index = 0,
		dd;
	
	
	// locals
	$(luajs.debug.ui.locals).empty ();
	for (var i in luajs.debug.resumeStack[0]._data.locals) {
		(function (i) {
			var local = luajs.debug.resumeStack[0]._data.locals[i],
				pc = luajs.debug.resumeStack[0]._pc + 1;
			
			if (local.startpc < pc && local.endpc >= pc) {
				var val = luajs.debug.resumeStack[0]._register[index++];
				
				$('<dt>').attr ({ title: local.varname }).text (local.varname).appendTo (luajs.debug.ui.locals);
				dd = $('<dd>').text (luajs.debug._formatValue (val)).appendTo (luajs.debug.ui.locals)[0];
				
				luajs.debug._addToolTip (dd, val);
			}
		})(i);
	}
	

	// upvalues
	$(luajs.debug.ui.upvalues).empty ();
	for (var i in luajs.debug.resumeStack[0]._upvalues) {
		var up = luajs.debug.resumeStack[0]._upvalues[i];
		
		$('<dt>').text (up.name).appendTo (luajs.debug.ui.upvalues);
		dd = $('<dd>').text (luajs.debug._formatValue (up.getValue ())).appendTo (luajs.debug.ui.upvalues)[0];

		luajs.debug._addToolTip (dd, up.getValue ());
	}
	
};




luajs.debug._addToolTip = function (dd, val) {

	if (val && (val.constructor == luajs.Table || val instanceof luajs.Function)) {
		var p = $('<p>').addClass ('table-inspector').appendTo (dd)[0],
			text = '';
			
		if (val instanceof luajs.Table) {
			for (var j in val) {
				if (val.hasOwnProperty (j) && !(j in luajs.Table.prototype) && j !== '__luajs') text += j + ' = ' + luajs.debug._formatValue (val[j]) + '</br>';
			}
			
		} else {
			var vars = [];
			for (var j = 0; j < val._data.paramCount; j++) vars.push (val._data.locals[j].varname);
			text = vars.join (', ');
			if (val._data.is_vararg) text += ', ...';
			text = 'function (' + text + ') &hellip; end';
		}
		
		p.innerHTML = text;

		$(dd).mouseenter (function () {
			var ppos = $(p).show ().offset (),
				contpos = $(luajs.debug.ui.container).offset ();
			
			$(p).hide ();
			$(luajs.debug.ui.tableInspector).css ({ top: ppos.top - contpos.top, left: ppos.left - contpos.left }).html ($(p).html ()).show ();

		}).mouseleave (function (e) {
			if (e.toElement != luajs.debug.ui.tableInspector) $(luajs.debug.ui.tableInspector).hide ();
		});					
	}
};




luajs.debug._clearVariables = function () {
	$(luajs.debug.ui.locals).empty ();
	$(luajs.debug.ui.upvalues).empty ();
};




luajs.debug.highlightLine = function (lineNumber, error) {
	if (luajs.debug.ui.lines) {
		$(luajs.debug.ui.highlighted).removeClass ('highlighted');
		luajs.debug.ui.highlighted = $(luajs.debug.ui.lines[lineNumber - 1]).addClass ('highlighted' + (error? ' error' : ''))[0];	

		if (!luajs.debug.showingCode) luajs.debug._toggleCode ();

		var currentTop = $(luajs.debug.ui.codeWrap).scrollTop (),
			offset = currentTop + $(luajs.debug.ui.highlighted).position ().top,
			visibleRange = $(luajs.debug.ui.codeWrap).height () - $(luajs.debug.ui.highlighted).height ();
		
		offset -= visibleRange / 2;
		if (offset < 0) offset = 0;
	
		if (Math.abs (offset - currentTop) > (visibleRange / 2) * 0.8) {
			$(luajs.debug.ui.codeWrap).scrollTop (offset);
		}
		
		if (error) {
			var containerOffset = $(luajs.debug.ui.container).offset (),
				codeOffset = $(luajs.debug.ui.highlighted).offset (),
				top = codeOffset.top - containerOffset.top - 5;
				
			$(luajs.debug.ui.error).css ({ top: top + 'px' }).text (error);
			$(luajs.debug.ui.container).addClass ('showing-error');
			
			$(luajs.debug.ui.codeWrap).bind ('scroll.error', function () { 
				$(luajs.debug.ui.container).removeClass ('showing-error');
				$(this).unbind ('scroll.error');
			});
		}
	}
};




luajs.debug._clearLineHighlight = function () {
	$(luajs.debug.ui.highlighted).removeClass ('highlighted');
	$(luajs.debug.ui.error).hide ();

	luajs.debug.ui.highlighted = null;
};

	

(function () {
	
	
	var load = luajs.VM.prototype.load;
	
	luajs.VM.prototype.load = function (url, execute, asCoroutine) {
		var me = this,
			args = arguments;
		
		luajs.debug.loadScript (url, function () {
			load.apply (me, args);
		});
	};




	var execute = luajs.Closure.prototype.execute;

	luajs.Closure.prototype.execute = function () {
		var me = this,
			args = arguments;
		
		if (luajs.debug.status != 'running') {
			luajs.debug.callbackQueue.push (function () {

			try {
				me.execute.apply (me, args);
			
			} catch (e) {
				if (e instanceof luajs.Error && console) throw new Error ('[luajs] ' + e.message + '\n    ' + (e.luaStack || []).join ('\n    '));
				throw e;
			}

			});
		} else {
			return execute.apply (this, arguments);
		}
	};
	
	
	

	var executeInstruction = luajs.Closure.prototype._executeInstruction;
	
	luajs.Closure.prototype._executeInstruction = function (instruction, lineNumber) {
		if ((
				(luajs.debug.stepping && (!luajs.debug.steppingTo || luajs.debug.steppingTo == this)) || 				// Only break if stepping in, out or over  
				(luajs.debug.stopAtBreakpoints && luajs.debug.breakpoints[lineNumber - 1])								// or we've hit a breakpoint.
			) &&		
			!luajs.debug.resumeStack.length && 																			// Don't break if we're in the middle of resuming from the previous debug step.
			lineNumber != luajs.debug.currentLine && 																	// Don't step more than once per line.
			[35, 36].indexOf (instruction.op) < 0 && 																	// Don't break on closure declarations.
			!(luajs.Coroutine._running && luajs.Coroutine._running.status == 'resuming')) {						// Don't break while a coroutine is resuming.

				// Break execution

				luajs.debug.highlightLine (lineNumber);
				luajs.debug.status = 'suspending';
				luajs.debug.currentLine = lineNumber;
				this._pc--;


				window.setTimeout (function () { 
					luajs.debug.status = 'suspended';
					luajs.debug._showVariables ();
				}, 1);

				return;
		}


		luajs.debug.lastLine = lineNumber;


		try {
			var result = executeInstruction.apply (this, arguments);

		} catch (e) {
			if (e instanceof luajs.Error) {
				if (!e.luaStack) e.luaStack = [];
				var message = 'at ' + (this._data.sourceName || 'function') + ' on line ' + this._data.linePositions[this._pc - 1];	
				if (message != e.luaStack[e.luaStack.length - 1]) e.luaStack.push ();
			} 
	
			throw e;
		}

		if ([30, 35].indexOf (instruction.op) >= 0) {	// If returning from or closing a function call, step out = step over = step in
			delete luajs.debug.steppingTo;
		}

		return result;
	};




	var error = luajs.Error;
	 
	luajs.Error = function (message) {
		luajs.debug.highlightLine (luajs.debug.lastLine, message);
		error.apply (this, arguments);

	};
	
	luajs.Error.prototype = error.prototype;	
	luajs.Error.catchExecutionError = error.catchExecutionError;	
		
})();




luajs.debug.stepIn = function () {
	luajs.debug.stepping = true;
	delete luajs.debug.steppingTo;
	luajs.debug._resumeThread ();
};




luajs.debug.stepOver = function () {
	luajs.debug.stepping = true;
	luajs.debug.steppingTo = luajs.debug.resumeStack[0];
	luajs.debug._resumeThread ();
};




luajs.debug.stepOut = function () {
	if (luajs.debug.resumeStack.length < 2) return luajs.debug.resume ();
	
	luajs.debug.stepping = true;
	luajs.debug.steppingTo = luajs.debug.resumeStack[1];
	luajs.debug._resumeThread ();
};




luajs.debug.resume = function () {
	luajs.debug.stepping = false;
	delete luajs.debug.steppingTo;
	luajs.debug._resumeThread ();
};




luajs.debug.pause = function () {
	luajs.debug.stepping = true;
};




luajs.debug._resumeThread = function () {
	luajs.debug.status = 'resuming';
	luajs.debug._clearLineHighlight ();

	var f = luajs.debug.resumeStack.pop ();


	if (f) {
		try {
			if (f instanceof luajs.Coroutine) {
				f.resume ();
			} else {
				f._run ();
			}
			
		} catch (e) {
			if (e instanceof luajs.Error && console) throw new Error ('[luajs] ' + e.message + '\n    ' + (e.luaStack || []).join ('\n    '));
			throw e;
		}
	}
	
	if (luajs.debug.status == 'running') luajs.debug._clearVariables ();

	while (luajs.debug.callbackQueue[0]) luajs.debug.callbackQueue.shift () ();
};




luajs.debug._init ();