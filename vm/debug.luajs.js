
var luajs = luajs || {};




luajs.debug = { 
	active: true,
	stepping: false,
	breakpoints: [],
	stopAtBreakpoints: true,
	loaded: {},
	ui: {},
	resumeStack: [],
	status: 'running'
};




luajs.debug._init = function () {
	luajs.debug.ui.container = $('<div>').addClass ('luajs-debug')[0];
	luajs.debug.ui.buttons = $('<div>').text ('luajs.debug ').addClass ('buttons').appendTo (luajs.debug.ui.container)[0];
	luajs.debug.ui.code = $('<ol>').appendTo (luajs.debug.ui.container)[0];


	$('<button>').text ('Pause/resume').addClass ('pause-resume').appendTo (luajs.debug.ui.buttons).click (function () {
		luajs.debug[luajs.debug.status == 'running'? 'pause' : 'resume'] ();
	});
	
	$('<button>').text ('Step in').addClass ('step-in').appendTo (luajs.debug.ui.buttons).click (luajs.debug.stepIn);
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
	var lines = luajs.debug.loaded[jsonUrl].split ('\n'),
		index, li;

	luajs.debug.ui.code.innerHTML = '';
	luajs.debug.ui.lines = [];
	
	for (index in lines) {
		(function (index) {
			li = $('<li>').appendTo (luajs.debug.ui.code).click (function () {
				luajs.debug._toggleBreakpoint (index);
			})[0];
			
			li.innerHTML = '<code>' + lines[index] + '</code>';
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




luajs.debug.highlightLine = function (lineNumber, error) {
	if (luajs.debug.ui.lines) {
		$(luajs.debug.ui.highlighted).removeClass ('highlighted');
		luajs.debug.ui.highlighted = $(luajs.debug.ui.lines[lineNumber - 1]).addClass ('highlighted' + (error? ' error' : ''))[0];	

		if (!luajs.debug.showingCode) luajs.debug._toggleCode ();

		var currentTop = $(luajs.debug.ui.code).scrollTop (),
			offset = currentTop + $(luajs.debug.ui.highlighted).position ().top,
			visibleRange = $(luajs.debug.ui.code).height () - $(luajs.debug.ui.highlighted).height ();
		
		offset -= visibleRange / 2;
		if (offset < 0) offset = 0;
	
		if (Math.abs (offset - currentTop) > (visibleRange / 2) * 0.8) {
			$(luajs.debug.ui.code).scrollTop (offset);
		}
	}
};




luajs.debug._clearLineHighlight = function () {
	$(luajs.debug.ui.highlighted).removeClass ('highlighted');
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




	var execute = luajs.VM.prototype.execute;

	luajs.VM.prototype.execute = function () {
		var result = execute.apply (this, arguments);
	//	if (luajs.debug.stepping) luajs.debug.status = 'suspended';

		return result;
	};
	
	
	

	var executeInstruction = luajs.VM.Function.prototype._executeInstruction;
	
	luajs.VM.Function.prototype._executeInstruction = function (instruction, lineNumber) {

		if ((luajs.debug.stepping || (luajs.debug.stopAtBreakpoints && luajs.debug.breakpoints[lineNumber - 1])) &&		// Only break if stepping through or we've hit a breakpoint.
			!luajs.debug.resumeStack.length && 																			// Don't break if we're in the middle of resuming from the previous debug step.
			lineNumber != luajs.debug.currentLine && 																	// Don't step more than once per line.
			[35, 36].indexOf (instruction.op) < 0 && 																	// Don't break on closure declarations.
			!(luajs.VM.Coroutine._running && luajs.VM.Coroutine._running.status == 'resuming')) {						// Don't break while a coroutine is resuming.

				// Break execution

				luajs.debug.highlightLine (lineNumber);
				luajs.debug.status = 'suspending';
				luajs.debug.currentLine = lineNumber;
				this._pc--;

				return;
//	}
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

		return result;
	};




	var error = luajs.Error;
	
	luajs.Error = function () {
		luajs.debug.highlightLine (luajs.debug.lastLine, true);		
		return error.apply (this, arguments);
	};
	

		
})();




luajs.debug.stepIn = function () {
	luajs.debug.stepping = true;
	luajs.debug._resumeThread ();
};




luajs.debug.resume = function () {
	luajs.debug.stepping = false;
	luajs.debug._resumeThread ();
};




luajs.debug.pause = function () {
	luajs.debug.stepping = true;
};




luajs.debug._resumeThread = function () {
	luajs.debug.status = 'resuming';
	var f = luajs.debug.resumeStack.pop ();

	if (f) {
		try {
			if (f instanceof luajs.VM.Coroutine) {
				f.resume ();
			} else {
				f._run ();
			}
			
		} catch (e) {
			if (e instanceof luajs.Error && console) throw new Error ('[luajs] ' + e.message + '\n    ' + (e.luaStack || []).join ('\n    '));
			throw e;
		}
	}
	
	if (luajs.debug.status == 'running') luajs.debug._clearLineHighlight ();
};




luajs.debug._init ();