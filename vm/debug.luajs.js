
var luajs = luajs || {};




luajs.debug = { 
	active: true,
	breakpoints: [],
	loaded: {},
	ui: {},
	resumeStack: [],
	status: 'running'
};




luajs.debug._init = function () {
	luajs.debug.ui.container = $('<div>').css ({ position: 'fixed', top: 0, right: 0, width: 400 })[0];
	luajs.debug.ui.buttons = $('<div>').css ({ height: 40 }).appendTo (luajs.debug.ui.container)[0];
	luajs.debug.ui.code = $('<ol>').css ({ fontFamily: 'monospace', maxHeight: 500, overflow: 'auto' }).appendTo (luajs.debug.ui.container)[0];


	$('<button>').text ('Step into').appendTo (luajs.debug.ui.buttons).click (function () {
		luajs.debug.resume ();
	});

	$(window).load (function () { 
		$('body').append (luajs.debug.ui.container).append ('<style>li.highlighted { background: #5555ff; color: #ffffff; }</style>'); 
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
		index, p;

	luajs.debug.ui.code.innerHTML = '';
	luajs.debug.ui.lines = [];
	
	for (index in lines) {
		p = $('<li>').css ({ width: 800, whiteSpace: 'pre' }).appendTo (luajs.debug.ui.code)[0];
		p.innerHTML = lines[index];
		luajs.debug.ui.lines.push (p);
	}

};

	


luajs.debug.highlightLine = function (lineNumber) {
	$(luajs.debug.ui.highlighted).removeClass ('highlighted');
	luajs.debug.ui.highlighted = $(luajs.debug.ui.lines[lineNumber - 1]).addClass ('highlighted')[0];	

	if (luajs.debug.ui.highlighted.scrollIntoView) luajs.debug.ui.highlighted.scrollIntoView ();
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
	
		luajs.debug.status = 'suspended';
		luajs.debug.thread = this._thread;

		return result;
	};
	
	
	

	var executeInstruction = luajs.VM.Function.prototype._executeInstruction;
	
	luajs.VM.Function.prototype._executeInstruction = function (instruction, lineNumber) {
		luajs.debug.highlightLine (lineNumber);

		if (!luajs.debug.resumeStack.length && lineNumber != luajs.debug.currentLine && [35, 36].indexOf (instruction.op) < 0) {
console.log (this);
//			luajs.debug.resumeStack.push (this);
			luajs.debug.status = 'suspending';
			luajs.debug.currentLine = lineNumber;
			this._pc--;

console.log ('==>', lastRetval);

			return;
		}
console.log (instruction.op);		
			var result = executeInstruction.apply (this, arguments);
console.log ('result>>', result);
var lastRetval = result;
			return result;
// 		if (luajs.debug.status == 'running') { // && [22, 23, 35, 36].indexOf (instruction.op) < 0) {
// //			luajs.debug.resumeStack.push (this);
		
	};
		
})();




luajs.debug.resume = function () {
	luajs.debug.status = 'resuming';
	var f = luajs.debug.resumeStack.pop ();
	f._run ();
};




luajs.debug.stepping = true;
luajs.debug._init ();