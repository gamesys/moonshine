
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
		p = $('<li>').css ({ width: 800 }).appendTo (luajs.debug.ui.code)[0];
		p.innerHTML = lines[index];
		luajs.debug.ui.lines.push (p);
	}

};

	


luajs.debug.highlightLine = function (lineNumber) {
	$(luajs.debug.ui.highlighted).removeClass ('highlighted');
	luajs.debug.ui.highlighted = $(luajs.debug.ui.lines[lineNumber - 1]).addClass ('highlighted')[0];	
};


	

(function () {
	
	var load = luajs.VM.prototype.load
	
	luajs.VM.prototype.load = function (url, execute, asCoroutine) {
		luajs.debug.loadScript (url);
		return load.apply (this, arguments);
	};




	var executeInstruction = luajs.VM.Function.prototype._executeInstruction;
	
	luajs.VM.Function.prototype._executeInstruction = function (instruction, lineNumber) {
		
		var result = executeInstruction.apply (this, arguments);

		if (luajs.debug.status == 'running') {
			luajs.debug.resumeStack.push (this);
			luajs.debug.status = 'suspending';
			luajs.debug.yieldVars = result;
		}
		
		return result;
	};
		
})();




luajs.debug.stepping = true;
luajs.debug._init ();