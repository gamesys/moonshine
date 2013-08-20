/**
 * @fileOverview Debug engine.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
 * @todo Refactor the entirety of this.
 */


var shine = shine || {};




shine.debug = { 
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




shine.debug._init = function () {
	shine.debug.ui.container = $('<div>').addClass ('shine-debug')[0];
	shine.debug.ui.buttons = $('<div>').text ('shine.debug ').addClass ('buttons').appendTo (shine.debug.ui.container)[0];
	shine.debug.ui.codeWrap = $('<div>').addClass ('code').appendTo (shine.debug.ui.container)[0];
	shine.debug.ui.code = $('<ol>').appendTo (shine.debug.ui.codeWrap)[0];

	shine.debug.ui.inspector = $('<div>').addClass ('inspector').appendTo (shine.debug.ui.container)[0];	
	$('<h6>Locals</h6>').appendTo (shine.debug.ui.inspector);
	shine.debug.ui.locals = $('<dl>').addClass ('locals').appendTo (shine.debug.ui.inspector)[0];
	$('<h6>Upvalues</h6>').appendTo (shine.debug.ui.inspector);
	shine.debug.ui.upvalues = $('<dl>').addClass ('upvalues').appendTo (shine.debug.ui.inspector)[0];

	shine.debug.ui.tableInspector = $('<p>').addClass ('table-inspector').appendTo (shine.debug.ui.container).mouseleave (function (e) {
		$(this).hide ();
	})[0];

	shine.debug.ui.error = $('<p>').addClass ('error').appendTo (shine.debug.ui.container)[0];


	$('<button>').text ('Pause/resume').addClass ('pause-resume').appendTo (shine.debug.ui.buttons).click (function () {
		shine.debug[shine.debug.status == 'running'? 'pause' : 'resume'] ();
	});
	
	$('<button>').text ('Step over').addClass ('step-over').appendTo (shine.debug.ui.buttons).click (shine.debug.stepOver);
	$('<button>').text ('Step in').addClass ('step-in').appendTo (shine.debug.ui.buttons).click (shine.debug.stepIn);
	$('<button>').text ('Step out').addClass ('step-out').appendTo (shine.debug.ui.buttons).click (shine.debug.stepOut);
	$('<button>').text ('Toggle breakpoints').addClass ('breakpoints').appendTo (shine.debug.ui.buttons).click (shine.debug._toggleStopAtBreakpoints);
	$('<button>').text ('Toggle code').addClass ('toggle-code').appendTo (shine.debug.ui.buttons).click (shine.debug._toggleCode);


	$(window).load (function () { 
		$('body').append (shine.debug.ui.container); 
	});
	
	if (window.sessionStorage) {
		var data = JSON.parse (window.sessionStorage.getItem ('breakpoints') || '{}'),
			i;
		
		for (i in data) shine.debug.breakpoints[i] = data[i];
		
		shine.debug.stopAtBreakpoints = (window.sessionStorage.getItem ('stopAtBreakpoints') == 'true');
		if (shine.debug.stopAtBreakpoints === null) shine.debug.stopAtBreakpoints = true;
	}


	if (shine.debug.stopAtBreakpoints) $(shine.debug.ui.container).addClass ('stop-at-breakpoints');
};


	

shine.debug.loadScript = function (jsonUrl, callback) {
	var url = jsonUrl.replace (/(.lua)?.json$/, '.lua');
	
	jQuery.ajax ({
		url: url, 
		success: function (data) {
			shine.debug.loaded[jsonUrl] = data;
			shine.debug.showScript (jsonUrl);
		
			callback ();
		},
		error: function () {
			$(shine.debug.ui.code).html ('<li class="load-error">' + url + ' could not be loaded.</li>');
			callback ();
		}
	});
};


	

shine.debug.showScript = function (jsonUrl) {
	var lines = shine.debug.loaded[jsonUrl].toString ().split ('\n'),
		index, li, code;

	shine.debug.ui.code.innerHTML = '';
	shine.debug.ui.lines = [];
	
	for (index in lines) {
		(function (index) {
			li = $('<li>').appendTo (shine.debug.ui.code).click (function (e) {
				if (e.pageX < $(this).offset ().left) shine.debug._toggleBreakpoint (index);
			})[0];
			
			$('<code>').text (lines[index]).appendTo (li);
			if (shine.debug.breakpoints[index]) $(li).addClass ('breakpoint');

			shine.debug.ui.lines.push (li);
		})(index);
	}

};

	


shine.debug._toggleBreakpoint = function (lineNumber) {
	var breakOn = shine.debug.breakpoints[lineNumber] = !shine.debug.breakpoints[lineNumber];
	$(shine.debug.ui.lines[lineNumber])[breakOn? 'addClass' : 'removeClass'] ('breakpoint');
	
	if (window.sessionStorage) window.sessionStorage.setItem ('breakpoints', JSON.stringify (shine.debug.breakpoints));
};




shine.debug._toggleCode = function () {
	var showing = shine.debug.showingCode = !shine.debug.showingCode;
	$(shine.debug.ui.container)[showing? 'addClass' : 'removeClass'] ('showing-code'); 
};




shine.debug._toggleStopAtBreakpoints = function () {
	var stop = shine.debug.stopAtBreakpoints = !shine.debug.stopAtBreakpoints;
	
	window.sessionStorage.setItem ('stopAtBreakpoints', stop);
	$(shine.debug.ui.container)[stop? 'addClass' : 'removeClass'] ('stop-at-breakpoints'); 
};




shine.debug._formatValue = function (val) {
	if (typeof val == 'string') {
		val = '"' + val + '"';

	} else if (val === undefined) {
		val = 'nil';

	} else if (val.constructor == shine.Table) {	// In case table has a toString field in the Lua code.
		val = shine.Table.prototype.toString.call (val);

	} else {
		val = '' + val;
	}
	
	return val;
};



	
shine.debug._showVariables = function () {
	var index = 0,
		dd;
	
	
	// locals
	$(shine.debug.ui.locals).empty ();
	for (var i in shine.debug.resumeStack[0]._data.locals) {
		(function (i) {
			var local = shine.debug.resumeStack[0]._data.locals[i],
				pc = shine.debug.resumeStack[0]._pc + 1;
			
			if (local.startpc < pc && local.endpc >= pc) {
				var val = shine.debug.resumeStack[0]._register[index++];
				
				$('<dt>').attr ({ title: local.varname }).text (local.varname).appendTo (shine.debug.ui.locals);
				dd = $('<dd>').text (shine.debug._formatValue (val)).appendTo (shine.debug.ui.locals)[0];
				
				shine.debug._addToolTip (dd, val);
			}
		})(i);
	}
	

	// upvalues
	$(shine.debug.ui.upvalues).empty ();
	for (var i in shine.debug.resumeStack[0]._upvalues) {
		var up = shine.debug.resumeStack[0]._upvalues[i];
		
		$('<dt>').text (up.name).appendTo (shine.debug.ui.upvalues);
		dd = $('<dd>').text (shine.debug._formatValue (up.getValue ())).appendTo (shine.debug.ui.upvalues)[0];

		shine.debug._addToolTip (dd, up.getValue ());
	}
	
};




shine.debug._addToolTip = function (dd, val) {

	if (val && (val.constructor == shine.Table || val instanceof shine.Function)) {
		var p = $('<p>').addClass ('table-inspector').appendTo (dd)[0],
			text = '';
			
		if (val instanceof shine.Table) {
			for (var j in val) {
				if (val.hasOwnProperty (j) && !(j in shine.Table.prototype) && j !== '__shine') text += j + ' = ' + shine.debug._formatValue (val[j]) + '</br>';
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
				contpos = $(shine.debug.ui.container).offset ();
			
			$(p).hide ();
			$(shine.debug.ui.tableInspector).css ({ top: ppos.top - contpos.top, left: ppos.left - contpos.left }).html ($(p).html ()).show ();

		}).mouseleave (function (e) {
			if (e.toElement != shine.debug.ui.tableInspector) $(shine.debug.ui.tableInspector).hide ();
		});					
	}
};




shine.debug._clearVariables = function () {
	$(shine.debug.ui.locals).empty ();
	$(shine.debug.ui.upvalues).empty ();
};




shine.debug.highlightLine = function (lineNumber, error) {
	if (shine.debug.ui.lines) {
		$(shine.debug.ui.highlighted).removeClass ('highlighted');
		shine.debug.ui.highlighted = $(shine.debug.ui.lines[lineNumber - 1]).addClass ('highlighted' + (error? ' error' : ''))[0];	

		if (!shine.debug.showingCode) shine.debug._toggleCode ();

		var currentTop = $(shine.debug.ui.codeWrap).scrollTop (),
			offset = currentTop + $(shine.debug.ui.highlighted).position ().top,
			visibleRange = $(shine.debug.ui.codeWrap).height () - $(shine.debug.ui.highlighted).height ();
		
		offset -= visibleRange / 2;
		if (offset < 0) offset = 0;
	
		if (Math.abs (offset - currentTop) > (visibleRange / 2) * 0.8) {
			$(shine.debug.ui.codeWrap).scrollTop (offset);
		}
		
		if (error) {
			var containerOffset = $(shine.debug.ui.container).offset (),
				codeOffset = $(shine.debug.ui.highlighted).offset (),
				top = codeOffset.top - containerOffset.top - 5;
				
			$(shine.debug.ui.error).css ({ top: top + 'px' }).text (error);
			$(shine.debug.ui.container).addClass ('showing-error');
			
			$(shine.debug.ui.codeWrap).bind ('scroll.error', function () { 
				$(shine.debug.ui.container).removeClass ('showing-error');
				$(this).unbind ('scroll.error');
			});
		}
	}
};




shine.debug._clearLineHighlight = function () {
	$(shine.debug.ui.highlighted).removeClass ('highlighted');
	$(shine.debug.ui.error).hide ();

	shine.debug.ui.highlighted = null;
};

	

(function () {
	
	
	var load = shine.VM.prototype.load;
	
	shine.VM.prototype.load = function (url, execute, asCoroutine) {
		var me = this,
			args = arguments;
		
		shine.debug.loadScript (url, function () {
			load.apply (me, args);
		});
	};




	var execute = shine.Closure.prototype.execute;

	shine.Closure.prototype.execute = function () {
		var me = this,
			args = arguments;
		
		if (shine.debug.status != 'running') {
			shine.debug.callbackQueue.push (function () {

			try {
				me.execute.apply (me, args);
			
			} catch (e) {
				if (e instanceof shine.Error && console) throw new Error ('[shine] ' + e.message + '\n    ' + (e.luaStack || []).join ('\n    '));
				throw e;
			}

			});
		} else {
			return execute.apply (this, arguments);
		}
	};
	
	
	

	var executeInstruction = shine.Closure.prototype._executeInstruction;
	
	shine.Closure.prototype._executeInstruction = function (instruction, lineNumber) {
		if ((
				(shine.debug.stepping && (!shine.debug.steppingTo || shine.debug.steppingTo == this)) || 				// Only break if stepping in, out or over  
				(shine.debug.stopAtBreakpoints && shine.debug.breakpoints[lineNumber - 1])								// or we've hit a breakpoint.
			) &&		
			!shine.debug.resumeStack.length && 																			// Don't break if we're in the middle of resuming from the previous debug step.
			lineNumber != shine.debug.currentLine && 																	// Don't step more than once per line.
			[35, 36].indexOf (instruction.op) < 0 && 																	// Don't break on closure declarations.
			!(shine.Coroutine._running && shine.Coroutine._running.status == 'resuming')) {						// Don't break while a coroutine is resuming.

				// Break execution

				shine.debug.highlightLine (lineNumber);
				shine.debug.status = 'suspending';
				shine.debug.currentLine = lineNumber;
				this._pc--;


				window.setTimeout (function () { 
					shine.debug.status = 'suspended';
					shine.debug._showVariables ();
				}, 1);

				return;
		}


		shine.debug.lastLine = lineNumber;


		try {
			var result = executeInstruction.apply (this, arguments);

		} catch (e) {
			if (e instanceof shine.Error) {
				if (!e.luaStack) e.luaStack = [];
				var message = 'at ' + (this._data.sourceName || 'function') + ' on line ' + this._data.linePositions[this._pc - 1];	
				if (message != e.luaStack[e.luaStack.length - 1]) e.luaStack.push ();
			} 
	
			throw e;
		}

		if ([30, 35].indexOf (instruction.op) >= 0) {	// If returning from or closing a function call, step out = step over = step in
			delete shine.debug.steppingTo;
		}

		return result;
	};




	var error = shine.Error;
	 
	shine.Error = function (message) {
		shine.debug.highlightLine (shine.debug.lastLine, message);
		error.apply (this, arguments);

	};
	
	shine.Error.prototype = error.prototype;	
	shine.Error.catchExecutionError = error.catchExecutionError;	
		
})();




shine.debug.stepIn = function () {
	shine.debug.stepping = true;
	delete shine.debug.steppingTo;
	shine.debug._resumeThread ();
};




shine.debug.stepOver = function () {
	shine.debug.stepping = true;
	shine.debug.steppingTo = shine.debug.resumeStack[0];
	shine.debug._resumeThread ();
};




shine.debug.stepOut = function () {
	if (shine.debug.resumeStack.length < 2) return shine.debug.resume ();
	
	shine.debug.stepping = true;
	shine.debug.steppingTo = shine.debug.resumeStack[1];
	shine.debug._resumeThread ();
};




shine.debug.resume = function () {
	shine.debug.stepping = false;
	delete shine.debug.steppingTo;
	shine.debug._resumeThread ();
};




shine.debug.pause = function () {
	shine.debug.stepping = true;
};




shine.debug._resumeThread = function () {
	shine.debug.status = 'resuming';
	shine.debug._clearLineHighlight ();

	var f = shine.debug.resumeStack.pop ();


	if (f) {
		try {
			if (f instanceof shine.Coroutine) {
				f.resume ();
			} else {
				f._run ();
			}
			
		} catch (e) {
			if (e instanceof shine.Error && console) throw new Error ('[shine] ' + e.message + '\n    ' + (e.luaStack || []).join ('\n    '));
			throw e;
		}
	}
	
	if (shine.debug.status == 'running') shine.debug._clearVariables ();

	while (shine.debug.callbackQueue[0]) shine.debug.callbackQueue.shift () ();
};




shine.debug._init ();