
var luajs = luajs || {};




luajs.debug = { 
	active: true,
	stepping: true,
	breakpoints: [],
	stopAtBreakpoints: true,
	loaded: {},
	ui: {},
	resumeStack: [],
	status: 'running'
};




luajs.debug._init = function () {
	luajs.debug.ui.container = $('<div>').addClass ('luajs-debug')[0];
	luajs.debug.ui.buttons = $('<div>').addClass ('buttons').appendTo (luajs.debug.ui.container)[0];
	luajs.debug.ui.code = $('<ol>').appendTo (luajs.debug.ui.container)[0];


	$('<button>').text ('Step in').addClass ('step-in').appendTo (luajs.debug.ui.buttons).click (luajs.debug.resume);
	$('<button>').text ('Toggle breakpoints').addClass ('breakpoints').appendTo (luajs.debug.ui.buttons).click (luajs.debug._toggleStopAtBreakpoints);
	$('<button>').text ('Toggle code').addClass ('toggle-code').appendTo (luajs.debug.ui.buttons).click (luajs.debug._toggleCode);


	$(window).load (function () { 
		$('body').append (luajs.debug.ui.container); 
	});
};


	

luajs.debug.loadScript = function (jsonUrl) {
	var url = jsonUrl.replace (/.json$/, '.lua');
	
	jQuery.get (url, function (data) {
		luajs.debug.loaded[jsonUrl] = data;
		luajs.debug.showScript (jsonUrl);
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
			luajs.debug.ui.lines.push (li);
		})(index);
	}

};

	


luajs.debug._toggleBreakpoint = function (lineNumber) {
	var breakOn = luajs.debug.breakpoints[lineNumber] = !luajs.debug.breakpoints[lineNumber];
	$(luajs.debug.ui.lines[lineNumber])[breakOn? 'addClass' : 'removeClass'] ('breakpoint');
};




luajs.debug._toggleCode = function () {
	var showing = luajs.debug.showingCode = !luajs.debug.showingCode;
	$(luajs.debug.ui.container)[showing? 'addClass' : 'removeClass'] ('showing-code'); 
};




luajs.debug._toggleStopAtBreakpoints = function () {
	var stop = luajs.debug.stopAtBreakpoints = !luajs.debug.stopAtBreakpoints;
	$(luajs.debug.ui.container)[showing? 'addClass' : 'removeClass'] ('stopAtBreakpoints'); 
};




luajs.debug.highlightLine = function (lineNumber, error) {
	$(luajs.debug.ui.highlighted).removeClass ('highlighted');
	luajs.debug.ui.highlighted = $(luajs.debug.ui.lines[lineNumber - 1]).addClass ('highlighted' + (error? ' error' : ''))[0];	

	var offset = $(luajs.debug.ui.highlighted).offset ().top;
	offset += ($(luajs.debug.code).height () - $(luajs.debug.ui.highlighted).height ()) / 2;
	if (offset < 0) offset = 0;

	$(luajs.debug.ui.code).scrollTop (offset);
	if (!luajs.debug.showingCode) luajs.debug._toggleCode ();
};


	

(function () {
	
	
	var load = luajs.VM.prototype.load;
	
	luajs.VM.prototype.load = function (url, execute, asCoroutine) {
		luajs.debug.loadScript (url);
		return load.apply (this, arguments);
	};




	var execute = luajs.VM.prototype.execute;

	luajs.VM.prototype.execute = function () {
		var result = execute.apply (this, arguments);
		if (luajs.debug.stepping) luajs.debug.status = 'suspended';

		return result;
	};
	
	
	

	var executeInstruction = luajs.VM.Function.prototype._executeInstruction;
	
	luajs.VM.Function.prototype._executeInstruction = function (instruction, lineNumber) {

		if ((luajs.debug.stepping || luajs.debug.breakpoints[lineNumber]) && !luajs.debug.resumeStack.length && lineNumber != luajs.debug.currentLine && [35, 36].indexOf (instruction.op) < 0) {
			luajs.debug.highlightLine (lineNumber);
			luajs.debug.status = 'suspending';
			luajs.debug.currentLine = lineNumber;
			this._pc--;

			return;
		}

		luajs.debug.lastLine = lineNumber;
		return executeInstruction.apply (this, arguments);		
	};




	var error = luajs.Error;
	
	luajs.Error = function () {
		luajs.debug.highlightLine (luajs.debug.lastLine, true);		
		return error.apply (this, arguments);
	};
	

		
})();




luajs.debug.resume = function () {
	luajs.debug.status = 'resuming';
	var f = luajs.debug.resumeStack.pop ();
	if (f) f._run ();
};




luajs.debug._init ();