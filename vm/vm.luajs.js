
var luajs = luajs || {};




luajs.VM = function (env) {
	this._env = env || {};
	this._resetGlobals ();
};



	
luajs.VM.prototype._resetGlobals = function () {
	this._globals = {};
	for (var i in luajs.lib) this._globals[i] = luajs.lib[i];
	for (var i in this._env) this._globals[i] = this._env[i];
};




luajs.VM.prototype.load = function (url, execute) {
	var me = this;
	
	// TODO: Remove dependency on jQuery here!
	jQuery.get (url, function (data) {			
		me._data = JSON.parse (data);
		if (execute || execute === undefined) me.execute ();
	});
};




luajs.VM.prototype.execute = function () {
	if (!this._data) throw new Error ('No data loaded.'); 
	
	try {
		new luajs.VM.Function (this._data, this._globals) ();
	} catch (e) {
		if (e instanceof luajs.Error && console) throw new Error ('[luajs] ' + e.message + '\n    ' + (e.luaStack || []).join ('\n    '));
		throw e;
	}	
};




luajs.VM.prototype.setGlobal = function (name, value) {
	this._globals[name] = value;
};




(function () {
	// Wrap functions passed to setTimeout in order to display formatted debugging.
	// (Not best practice, but practical in this case)
	
	var setTimeout = window.setTimeout;
	
	window.setTimeout = function (func, timeout) {
		return setTimeout (function () {
			try {
				func ();
			} catch (e) {
				if (e instanceof luajs.Error && console) throw new Error ('[luajs] ' + e.message + '\n    ' + (e.luaStack || []).join ('\n    '));
				throw e;
			}
		}, timeout);
	}
	
	
	var setInterval = window.setInterval;
	
	window.setInterval = function (func, interval) {
		return setInterval (function () {
			try {
				func ();
			} catch (e) {
				if (e instanceof luajs.Error && console) throw new Error ('[luajs] ' + e.message + '\n    ' + (e.luaStack || []).join ('\n    '));
				throw e;
			}
		}, interval);
	}
})();








luajs.VM.Closure = function (data, globals, upvalues) {
	this._data = data;
	this._globals = globals;
	this._upvalues = upvalues || {};
	this._index = luajs.VM.Closure._index++;
};


luajs.VM.Closure._index = 0;




luajs.VM.Closure.prototype.getInstance = function () {
	return new luajs.VM.Function (this._data, this._globals, this._upvalues);
};




luajs.VM.Closure.prototype.call = function (obj) {
	var args = [],
		l = arguments.length,
		i;
		
	for (i = 1; i < l; i++) args.push (arguments[i]);
	return this.apply (obj, args);
};




luajs.VM.Closure.prototype.apply = function (obj, args) {
	if (!obj) throw new luajs.Error ('Call to undefined function');
	return this.getInstance ().apply (obj, args);
};




luajs.VM.Closure.prototype.toString = function () {
	return 'function: 0x' + this._index.toString (16);
};








luajs.VM.Function = function (data, globals, upvalues) {

	this._globals = globals;
	this._data = data;

	this._upvalues = upvalues || {};
	this._constants = data.constants;
	this._functions = data.functions;
	this._instructions = data.instructions;

	this._register = [];
	this._pc = 0;
	this._localsUsedAsUpvalues = [];

	
	var me = this,
		result = function () { 
			var args = [];		
			for (var i = 0, l = arguments.length; i < l; i++) args.push (arguments[i]);
			return me.execute (args);
		};
		
	result._instance = this;	
	return result;
};




luajs.VM.Function.operations = [
	{
		name: 'MOVE',
		handler: function (a, b) {
			this._register[a] = this._register[b];
		}
	},

			
	{
		name: 'LOADK',
		handler: function (a, bx) {
			this._register[a] = this._getConstant (bx);
		}
	},
			

	{
		name: 'LOADBOOL',
		handler: function (a, b, c) {
			this._register[a] = !!b;
			if (c) this._pc++;
		}
	},
			

	{
		name: 'LOADNIL',
		handler: function (a, b) {
			for (var i = a; i <= b; i++) this._register[i] = undefined;
		}
	},
			

	{
		name: 'GETUPVAL',
		handler: function (a, b) {
			this._register[a] = this._upvalues[b].getValue ();
		}
	},
			

	{
		name: 'GETGLOBAL',
		handler: function (a, b) {

			if (this._globals[this._getConstant (b)] !== undefined) {
				this._register[a] = this._globals[this._getConstant (b)];

			} else {
				this._register[a] = undefined;
			}
		}
	},
			

	{
		name: 'GETTABLE',
		handler: function (a, b, c) {
			c = (c >= 256)? this._getConstant (c - 256) : this._register[c];

			if (this._register[b] === undefined) {
				throw new luajs.Error ('Attempt to index a nil value (' + c + ' not present in nil)');
			} else if (this._register[b] instanceof luajs.Table) {
				this._register[a] = this._register[b].getMember (c);
			} else {
				this._register[a] = this._register[b][c];
			}
		}
	},
			

	{
		name: 'SETGLOBAL',
		handler: function (a, b) {
			this._globals[this._getConstant (b)] = this._register[a];
		}
	},
			

	{
		name: 'SETUPVAL',
		handler: function (a, b) {
			this._upvalues[b].setValue (this._register[a]);
		}
	},
			

	{
		name: 'SETTABLE',
		handler: function (a, b, c) {
			b = (b >= 256)? this._getConstant (b - 256) : this._register[b];
			c = (c >= 256)? this._getConstant (c - 256) : this._register[c];

			if (this._register[a] instanceof luajs.Table) {
				this._register[a].setMember (b, c);
			
			} else if (this._register[a] === undefined) {
				throw new luajs.Error ('Attempt to index a missing field (can\'t set "' + b + '" on a nil value)');
				
			} else {
				this._register[a][b] = c;
			}
		}
	},
			

	{
		name: 'NEWTABLE',
		handler: function (a, b, c) {
			this._register[a] = new luajs.Table ();
		}
	},
			

	{
		name: 'SELF',
		handler: function (a, b, c) {
			c = (c >= 256)? this._getConstant (c - 256) : this._register[c];
			this._register[a + 1] = this._register[b];

			if (this._register[b] === undefined) {
				throw new luajs.Error ('Attempt to index a nil value (' + c + ' not present in nil)');
			} else if (this._register[b] instanceof luajs.Table) {
				this._register[a] = this._register[b].getMember (c);
			} else {
				this._register[a] = this._register[b][c];					
			}
		}
	},
			

	{
		name: 'ADD',
		handler: function (a, b, c) {
			//TODO: Extract the following RK(x) logic into a separate method.
			b = (b >= 256)? this._getConstant (b - 256) : this._register[b];
			c = (c >= 256)? this._getConstant (c - 256) : this._register[c];

			var mt, f;

			if (b instanceof luajs.Table && (mt = b.__luajs.metatable) && (f = mt.getMember ('__add'))) {
				this._register[a] = f.apply ({}, [b, c])[0];
			} else {
				if (typeof b !== 'number' || typeof c !== 'number') throw new luajs.Error ('attempt to perform arithmetic on a non-numeric value'); 
				this._register[a] = b + c;
			}
		}
	},
			

	{
		name: 'SUB',
		handler: function (a, b, c) {
			b = (b >= 256)? this._getConstant (b - 256) : this._register[b];
			c = (c >= 256)? this._getConstant (c - 256) : this._register[c];

			var mt, f;

			if (b instanceof luajs.Table && (mt = b.__luajs.metatable) && (f = mt.getMember ('__sub'))) {
				this._register[a] = f.apply ({}, [b, c])[0];
			} else {
				if (typeof b !== 'number' || typeof c !== 'number') throw new luajs.Error ('attempt to perform arithmetic on a non-numeric value'); 
				this._register[a] = b - c;
			}
		}
	},
			

	{
		name: 'MUL',
		handler: function (a, b, c) {
			b = (b >= 256)? this._getConstant (b - 256) : this._register[b];
			c = (c >= 256)? this._getConstant (c - 256) : this._register[c];

			var mt, f;

			if (b instanceof luajs.Table && (mt = b.__luajs.metatable) && (f = mt.getMember ('__mul'))) {
				this._register[a] = f.apply ({}, [b, c])[0];
			} else {
				if (typeof b !== 'number' || typeof c !== 'number') throw new luajs.Error ('attempt to perform arithmetic on a non-numeric value'); 
				this._register[a] = b * c;
			}
		}
	},
			

	{
		name: 'DIV',
		handler: function (a, b, c) {
			b = (b >= 256)? this._getConstant (b - 256) : this._register[b];
			c = (c >= 256)? this._getConstant (c - 256) : this._register[c];

			var mt, f;

			if (b instanceof luajs.Table && (mt = b.__luajs.metatable) && (f = mt.getMember ('__div'))) {
				this._register[a] = f.apply ({}, [b, c])[0];
			} else {
				if (typeof b !== 'number' || typeof c !== 'number') throw new luajs.Error ('attempt to perform arithmetic on a non-numeric value'); 
				this._register[a] = b / c;
			}
		}
	},
			

	{
		name: 'MOD',
		handler: function (a, b, c) {
			b = (b >= 256)? this._getConstant (b - 256) : this._register[b];
			c = (c >= 256)? this._getConstant (c - 256) : this._register[c];
			var mt, f;

			if (b instanceof luajs.Table && (mt = b.__luajs.metatable) && (f = mt.getMember ('__mod'))) {
				this._register[a] = f.apply ({}, [b, c])[0];
			} else {
				if (typeof b !== 'number' || typeof c !== 'number') throw new luajs.Error ('attempt to perform arithmetic on a non-numeric value'); 
				this._register[a] = b % c;
			}
		}
	},
			

	{
		name: 'POW',
		handler: function (a, b, c) {
			b = (b >= 256)? this._getConstant (b - 256) : this._register[b];
			c = (c >= 256)? this._getConstant (c - 256) : this._register[c];

			var mt, f;

			if (b instanceof luajs.Table && (mt = b.__luajs.metatable) && (f = mt.getMember ('__pow'))) {
				this._register[a] = f.apply ({}, [b, c])[0];
			} else {
				if (typeof b !== 'number' || typeof c !== 'number') throw new luajs.Error ('attempt to perform arithmetic on a non-numeric value'); 
				this._register[a] = Math.pow (b, c);
			}
		}
	},
			

	{
		name: 'UNM',
		handler: function (a, b) {
			var mt, f;

			if (this._register[b] instanceof luajs.Table && (mt = this._register[b].__luajs.metatable) && (f = mt.getMember ('__unm'))) {
				this._register[a] = f.apply ({}, [this._register[b]])[0];
			} else {
				if (typeof this._register[b] !== 'number') throw new luajs.Error ('attempt to perform arithmetic on a non-numeric value'); 
				this._register[a] = -this._register[b];
			}
		}
	},
			

	{
		name: 'NOT',
		handler: function (a, b) {
			this._register[a] = !this._register[b];
		}
	},
			

	{
		name: 'LEN',
		handler: function (a, b) {
			var length = 0;

			if (this._register[b] instanceof luajs.Table) {
				while (this._register[b][length + 1] != undefined) length++;
				this._register[a] = length;

			} else if (typeof this._register[b] == 'object') {				
				for (var i in this._register[b]) if (this._register[b].hasOwnProperty (i)) length++;
				this._register[a] = length;

			} else if (this._register[b] == undefined) {
				throw new luajs.Error ('attempt to get length of a nil value');

			} else if (this._register[b].length === undefined) {
				this._register[a] = undefined;
				
			} else {
				this._register[a] = this._register[b].length;
			}
		}
	},


	{
		name: 'CONCAT',
		handler: function (a, b, c) {

			var text = this._register[c],
				mt, f;

			for (var i = c - 1; i >= b; i--) {
				if (this._register[i] instanceof luajs.Table && (mt = this._register[i].__luajs.metatable) && (f = mt.getMember ('__concat'))) {
					text = f.apply ({}, [this._register[i], text])[0];
				} else {
					if (!(typeof this._register[i] === 'string' || typeof this._register[i] === 'number') || !(typeof text === 'string' || typeof text === 'number')) throw new luajs.Error ('Attempt to concatenate a non-string or non-numeric value');
					text = this._register[i] + text;
				}
			}

			this._register[a] = text;
		}
	},
			

	{
		name: 'JMP',
		handler: function (a, sbx) {
			this._pc += sbx;
		}
	},
	

	{
		name: 'EQ',
		handler: function (a, b, c) {
			b = (b >= 256)? this._getConstant (b - 256) : this._register[b];
			c = (c >= 256)? this._getConstant (c - 256) : this._register[c];

			var mt, f, result;

			if (b !== c && typeof (b) === typeof (c) && b instanceof luajs.Table && (mt = b.__luajs.metatable) && (f = mt.getMember ('__eq'))) {
				result = !!f.apply ({}, [b, c])[0];
			} else {
				result = (b === c);
			}
			
			if (result != a) this._pc++;
		}
	},
			

	{
		name: 'LT',
		handler: function (a, b, c) {
			b = (b >= 256)? this._getConstant (b - 256) : this._register[b];
			c = (c >= 256)? this._getConstant (c - 256) : this._register[c];

			var mt, f, result;

			if (b instanceof luajs.Table && (mt = b.__luajs.metatable) && (f = mt.getMember ('__le'))) {
				result = f.apply ({}, [b, c])[0];
			} else {
				result = (b < c);
			}
			
			if (result != a) this._pc++;
		}
	},
			

	{
		name: 'LE',
		handler: function (a, b, c) {
			b = (b >= 256)? this._getConstant (b - 256) : this._register[b];
			c = (c >= 256)? this._getConstant (c - 256) : this._register[c];

			var mt, f, result;

			if (b !== c && typeof (b) === typeof (c) && b instanceof luajs.Table && (mt = b.__luajs.metatable) && (f = mt.getMember ('__le'))) {
				result = f.apply ({}, [b, c])[0];
			} else {
				result = (b <= c);
			}
			
			if (result != a) this._pc++;
		}
	},
			

	{
		name: 'TEST',
		handler: function (a, b, c) {
			if (this._register[a] === 0 || this._register[a] === '') {
				if (!c) this._pc++;
			} else {
				if (!this._register[a] !== !c) this._pc++;
			}
		}
	},
			

	{
		name: 'TESTSET',
		handler: function (a, b, c) {
			if (!this._register[b] === !c) {
				this._register[a] = !!this._register[b];
			} else {
				this._pc++;
			}
		}
	},
			

	{
		name: 'CALL',
		handler: function (a, b, c) {

			var args = [], 
				i, l,
				retvals;
			
			if (b === 0) {
				l = this._register.length;
				
				for (i = a + 1; i < l; i++) {
					args.push (this._register[i]);
				}

			} else {
				for (i = 0; i < b - 1; i++) {
					args.push (this._register[a + i + 1]);
				}
			}

			if (!this._register[a] || !this._register[a].apply) throw new luajs.Error ('Attempt to call non-function');
			
			retvals = this._register[a].apply ({}, args);
			if (!(retvals instanceof Array)) retvals = [retvals];

			if (this._yielded) return retvals;	// For coroutines


			if (c === 0) {
				l = retvals.length;
				
				for (i = 0; i < l; i++) {
					this._register[a + i] = retvals[i];
				}

				this._register.splice (a + l);
				
			} else {
				for (i = 0; i < c - 1; i++) {
					this._register[a + i] = retvals[i];
				}
			}
			
		}
	},
			

	{
		name: 'TAILCALL',
		handler: function (a, b) {
			var args = [], 
				i, l,
				retvals;
			
			if (b === 0) {
				l = this._register.length;
				
				for (i = a + 1; i < l; i++) {
					args.push (this._register[i]);
				}

			} else {
				for (i = 0; i < b - 1; i++) {
					args.push (this._register[a + i + 1]);
				}
			}

			retvals = this._register[a].apply ({}, args);
			if (!(retvals instanceof Array)) retvals = [retvals];
			
			l = retvals.length;
			
			for (i = 0; i < l; i++) {
				this._register[a + i] = retvals[i];
			}
			
			// NOTE: Currently not replacing stack, so infininately recursive calls WOULD drain memory, unlike how tail calls were intended.
			// TODO: For non-external function calls, replace this stack with that of the new function. Possibly return the Function and handle the call in the RETURN section (for the calling function).
		}
	},
			

	{
		name: 'RETURN',
		handler: function (a, b) {
			var retvals = [],
				i;

			if (b === 0) {
				l = this._register.length;
				
				for (i = a; i < l; i++) {
					retvals.push (this._register[a]);
				}

			} else {
				for (i = 0; i < b - 1; i++) {
					retvals.push (this._register[a + i]);
				}
			}

			// NOTE: Following section copied from CLOSE instruction
			// TODO: Place this is a function that is called by both instructions
			for (var i = 0, l = this._localsUsedAsUpvalues.length; i < l; i++) {
				var local = this._localsUsedAsUpvalues[i];

				local.upvalue.value = this._register[local.registerIndex];
				local.upvalue.open = false;

				this._localsUsedAsUpvalues.splice (i--, 1);
				l--;
				delete this._register[local.registerIndex];
			}

			return retvals;
		}
	},
			

	{
		name: 'FORLOOP',
		handler: function (a, sbx) {
			this._register[a] += this._register[a + 2];
			var parity = this._register[a + 2] / Math.abs (this._register[a + 2]);
			
			if ((parity === 1 && this._register[a] <= this._register[a + 1]) || (parity !== 1 && this._register[a] >= this._register[a + 1])) {	//TODO This could be nicer
				this._register[a + 3] = this._register[a];
				this._pc += sbx;
			}
		}
	},
			

	{
		name: 'FORPREP',
		handler: function (a, sbx) {
			this._register[a] -= this._register[a + 2];
			this._pc += sbx; 
		}
	},
			

	{
		name: 'TFORLOOP',
		handler: function (a, b, c) {
			var args = [this._register[a + 1], this._register[a + 2]],
				retvals = this._register[a].apply ({}, args),
				index;

			if (!(retvals instanceof Array)) retvals = [retvals];
			if (retvals[0] && retvals[0] === '' + (index = parseInt (retvals[0], 10))) retvals[0] = index;
			
			for (var i = 0; i < c; i++) this._register[a + i + 3] = retvals[i];

			if (this._register[a + 3] !== undefined) {
				this._register[a + 2] = this._register[a + 3];
			} else {
				this._pc++;
			}
		}
	},
			

	{
		name: 'SETLIST',
		handler: function (a, b, c) {
			var length = b || this._register.length -  a - 1,
			i;
			
			for (i = 0; i < length; i++) {
				this._register[a].setMember (50 * (c - 1) + i + 1, this._register[a + i + 1]);
			}
		}
	},
			

	{
		name: 'CLOSE',
		handler: function (a, b, c) {
			for (var i = 0, l = this._localsUsedAsUpvalues.length; i < l; i++) {
				var local = this._localsUsedAsUpvalues[i];
				if (local && local.registerIndex >= a) {
					local.upvalue.value = this._register[local.registerIndex];
					local.upvalue.open = false;
					this._localsUsedAsUpvalues.splice (i--, 1);
					l--;
					delete this._register[local.registerIndex];
				}
			}
		}
	},
			

	{
		name: 'CLOSURE',
		handler: function (a, bx) {
			var me = this,
				upvalues = [],
				instruction;
			
			while ((instruction = this._instructions[this._pc]) && (instruction.op === 0 || instruction.op === 4) && instruction.A === 0) {	// move, getupval
	
				(function () {
					var i = instruction,
						upvalue;

					luajs.stddebug.write ('-> ' + me.constructor.operations[i.op].name.toLowerCase () + '\t' + i.A + '\t' + i.B + '\t' + i.C);

					
					if (i.op === 0) {	// move
						for (var j = 0, l = me._localsUsedAsUpvalues.length; j < l; j++) {
							var up = me._localsUsedAsUpvalues[j];
							if (up.registerIndex === i.B) {
								upvalue = up.upvalue;
								break;
							}
						}

						if (!upvalue) {
							upvalue = {
								open: true,
								getValue: function () {
									return this.open? me._register[i.B] : this.value;
								},
								setValue: function (val) {
									this.open? me._register[i.B] = val : this.value = val;
								}
							};

							me._localsUsedAsUpvalues.push ({
								registerIndex: i.B,
								upvalue: upvalue
							});
						}

						
						upvalues.push (upvalue);
						

					} else {	//getupval
						
						upvalues.push ({
							getValue: function () {
								return me._upvalues[i.B].getValue ();
							},
							setValue: function (val) {
								me._upvalues[i.B].setValue (val);
							}
						});
					}
					
				})();
				
				this._pc++;
			}

			this._register[a] = new luajs.VM.Closure (this._functions[bx], this._globals, upvalues);
		}
	},
			

	{
		name: 'VARARG',
		handler: function (a, b) {
			var i,
				limit = b === 0? this._params.length : b - 1;
			
			for (i = 0; i < limit; i++) {
				this._register[a + i] = this._params[this._data.paramCount + i];
			}

			// Assumption: Clear the remaining items in the register.
			for (i = a + limit; i < this._register.length; i++) {
				delete this._register[i];
			}
		}
	}
];

	


luajs.VM.Function.prototype._executeInstruction = function (instruction, line) {
	var op = this.constructor.operations[instruction.op];
	if (!op || !op.handler) throw new Error ('Operation not implemented! (' + instruction.op + ')');

	var tab = '';
	for (var i = 0; i < this._index; i++) tab += '\t';
	luajs.stddebug.write (tab + '[' + this._pc + ']\t' + line + '\t' + op.name.toLowerCase () + '\t' + instruction.A + '\t' + instruction.B + (instruction.C !== undefined? '\t' + instruction.C : ''));
		
	return op.handler.call (this, instruction.A, instruction.B, instruction.C);
};
	



luajs.VM.Function.prototype.execute = function (args) {
	this._pc = 0;

	if (this._data && this._data.sourceName) luajs.stddebug.write ('Executing ' + this._data.sourceName + '...'); //? ' ' + this._data.sourceName : ' function') + '...<br><br>');
	luajs.stddebug.write ('\n');

	// ASSUMPTION: Parameter values are automatically copied to R(0) onwards of the function on initialisation. This is based on observation and is neither confirmed nor denied in any documentation. (Different rules apply to VARARG functions)
	this._register = [].concat (this._params = [].concat (args));
	
	try {
		var retval = this._run ();
		// if (this._data.sourceName) luajs.stddebug.write ('<br>Execution ended normally.');
		// 
		// luajs.stddebug.write ('\n');
		return retval;
		
	} catch (e) {
	
		if (e instanceof luajs.Error) {
			if (!e.luaStack) e.luaStack = [];
			e.luaStack.push ('at ' + (this._data.sourceName || 'function') + ' on line ' + this._data.linePositions[this._pc - 1])
			//luajs.lib.print ('ERROR in Lua script on line ' + this._data.linePositions[this._pc - 1] + ': ' + e.message);
			//e = new Error ('Error occurred in Lua script on line ' + this._data.linePositions[this._pc - 1]);
		} 
		// else {
		// 	luajs.lib.print ('ERROR in VM while executing script on line ' + this._data.linePositions[this._pc - 1] + ': ' + e.message);
		// 	e = new Error ('Error occurred while executing line ' + this._data.linePositions[this._pc - 1]);
		// }
	
		throw e;
	}
};




luajs.VM.Function.prototype._run = function () {
	var instruction,
		line,
		retval;


	if (this._yielded) {
		// Coroutine is resuming
		
		var a = this._yielded.A,
			b = this._yielded.B,
			c = this._yielded.C,
			retvals = [];
		
		for (var i = 0, l = arguments.length; i < l; i++) retvals.push (arguments[i]);

		if (c === 0) {
			l = retvals.length;
			
			for (i = 0; i < l; i++) {
				this._register[a + i] = retvals[i];
			}

			this._register.splice (a + l);
			
		} else {
			for (i = 0; i < c - 1; i++) {
				this._register[a + i] = retvals[i];
			}
		}
		
		delete this._yielded;
	}


	this.terminated = false;
	
	while (instruction = this._instructions[this._pc]) {
		line = this._data.linePositions[this._pc];
		
		this._pc++;
		
		retval = this._executeInstruction (instruction, line);
		
		if (this._yielded) {
			this._yielded = instruction;
		} else if (retval) {
			this.terminated = true;
		}	

		if (retval !== undefined) return retval;
	}
	
	this.terminated = true;
};




luajs.VM.Function.prototype._getConstant = function (index) {
	if (this._constants[index] === null) return;
	return this._constants[index];
};












luajs.VM.Coroutine = function (closure) {
	
	this._func = closure.getInstance ();

	this._index = luajs.VM.Coroutine._index++;
	this._started = false;
	this.status = 'suspended';

	this._addFunctions ();
};

luajs.VM.Coroutine._index = 0;




luajs.VM.Coroutine.yield = function () {
	var args = [];
	for (var i = 0, l = arguments.length; i < l; i++) args.push (arguments[i]);	

	this._func._instance._yielded = true;
	return args;
};




luajs.VM.Coroutine.running = function () {
	return this;
};




luajs.VM.Coroutine.prototype._addFunctions = function () {

	var globalsClone = {},
		coroutineLib = {},
		me = this;

	for (var i in this._func._instance._globals) globalsClone[i] = this._func._instance._globals[i];
	for (var i in globalsClone.coroutine) coroutineLib[i] = globalsClone[i];
	
	coroutineLib.yield = function () { return luajs.VM.Coroutine.yield.apply (me, arguments); };
	coroutineLib.running = function () { return luajs.VM.Coroutine.running.apply (me, arguments); };
	
	globalsClone.coroutine = coroutineLib;
	this._func._instance._globals = globalsClone;

};




luajs.VM.Coroutine.prototype.resume = function () {

	var retval;

	try {
		if (this.status == 'dead') throw new luajs.Error ('cannot resume dead coroutine');
		
		if (!this._started) {
			this._started = true;
			retval = this._func.apply ({}, arguments);

		} else {
			retval = this._func._instance._run.apply (this._func._instance, arguments);
		}	
	
		this.status = this._func._instance.terminated? 'dead' : 'suspended';	
		retval.unshift (true);

	} catch (e) {
		retval = [false, e];
		this.status = 'dead';
	}

	return retval;
};




luajs.VM.Coroutine.prototype.toString = function () {
	return 'thread: 0x' + this._index.toString (16);
};