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
 * @fileOverview Closure class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */


'use strict';


var shine = shine || {};


/**
 * Represents an instance of a function and its related closure.
 * @constructor
 * @extends shine.EventEmitter
 * @param {shine.File} file The file in which the function is declared.
 * @param {object} data Object containing the Luac data for the function.
 * @param {object} globals The global variables for the environment in which the function is declared.
 * @param {object} [upvalues] The upvalues passed from the parent closure.
 */
shine.Closure = function (vm, file, data, globals, upvalues) {
	var me = this;
	
	this._vm = vm;
	this._globals = globals;
	this._file = file;
	this._data = data;

	this._upvalues = upvalues || shine.gc.createObject();
	this._constants = data.constants;
	this._functions = data.functions;
	this._instructions = data.instructions;

	this._register = this._register || shine.Register.create();
	this._pc = 0;
	this._localsUsedAsUpvalues = this._localsUsedAsUpvalues || shine.gc.createArray();
	this._funcInstances = this._funcInstances || shine.gc.createArray();
	this._localFunctions = shine.gc.createObject();
	
	var me = this,
		result = function () { 
			var args = shine.gc.createArray();
			for (var i = 0, l = arguments.length; i < l; i++) args.push(arguments[i]);
			return me.execute(args);
		};
		
	result._instance = this;

	result.dispose = function () {
		me.dispose.apply(me, arguments);
		delete this.dispose;
	};

	return result;
};


shine.Closure.prototype = {};
shine.Closure.prototype.constructor = shine.Closure;

shine.Closure._graveyard = [];
shine.Closure._current = undefined;




shine.Closure.create = function (vm, file, data, globals, upvalues) {
	var instance = shine.Closure._graveyard.pop();
	//console.log(instance? 'reusing' : 'creating');
	
	if (instance) {
		return shine.Closure.apply(instance, arguments);
	} else {
		return new shine.Closure(vm, file, data, globals, upvalues);
	}
};




/**
 * Starts execution of the function instance from the beginning.
 * @param {Array} args Array containing arguments to use.
 * @returns {Array} Array of return values.
 */
shine.Closure.prototype.execute = function (args) {
	var me = this;

	if (this._vm._status != shine.RUNNING) {
		this._vm._callbackQueue.push(function () {
			me.execute.apply(me, args);
		});

		return;		
	}


	this._pc = 0;

	//if (this._data && this._data.sourceName) shine.stddebug.write('Executing ' + this._data.sourceName + '...'); //? ' ' + this._data.sourceName : ' function') + '...<br><br>');
	//shine.stddebug.write('\n');

	// ASSUMPTION: Parameter values are automatically copied to R(0) onwards of the function on initialisation. This is based on observation and is neither confirmed nor denied in any documentation. (Different rules apply to v5.0-style VARARG functions)
	this._params = shine.gc.createArray().concat(args);
	this._register.set(args.splice(0, this._data.paramCount));

	if (this._data.is_vararg == 7) {	// v5.0 compatibility (LUA_COMPAT_VARARG)
		var arg = [].concat(args),
			length = arg.length;
					
		arg = new shine.Table(arg);
		arg.setMember('n', length);
		
		this._register.push(arg);
	}
	
	try {
		return this._run();

	} catch (e) {
		if (!((e || shine.EMPTY_OBJ) instanceof shine.Error)) {
			var stack = (e.stack || '');

			e = new shine.Error('Error in host call: ' + e.message);
			e.stack = stack;
			e.luaStack = stack.split('\n');
		}

		if (!e.luaStack) e.luaStack = shine.gc.createArray();
		e.luaStack.push([this, this._pc - 1]);
	
		throw e;
	}
};




/**
 * Continues execution of the function instance from its current position.
 * @returns {Array} Array of return values.
 */
shine.Closure.prototype._run = function () {
	var instruction,
		line,
		retval,
		yieldVars;

	this.terminated = false;
	
	
	if (this._vm._status == shine.RESUMING) {
	 	if (this._vm._resumeStack.length) {
			this._pc--;
			
		} else {
			this._vm._status = shine.RUNNING;

			yieldVars = this._vm._resumeVars;
			delete this._vm._resumeVars;
		}

	} else if (shine.debug && shine.debug._status == shine.RESUMING) {
	 	if (shine.debug._resumeStack.length) {
			this._pc--;
			
		} else {
			shine.debug._setStatus(shine.RUNNING);
		}

	} else if (shine.Coroutine._running && shine.Coroutine._running.status == shine.RESUMING) {
	 	if (shine.Coroutine._running._resumeStack.length) {
			this._pc--;
			
		} else {
			shine.Coroutine._running.status = shine.RUNNING;
			//shine.stddebug.write('[coroutine resumed]\n');
	
			yieldVars = shine.Coroutine._running._yieldVars;
		}
	}	
	

	if (yieldVars) {
		// instruction = this._instructions[this._pc - 1];

		var offset = (this._pc - 1) * 4,
			a = this._instructions[offset + 1],
			b = this._instructions[offset + 2],
			c = this._instructions[offset + 3],
			retvals = shine.gc.createArray();

		for (var i = 0, l = yieldVars.length; i < l; i++) retvals.push(yieldVars[i]);

		if (c === 0) {
			l = retvals.length;
		
			for (i = 0; i < l; i++) {
				this._register.setItem(a + i, retvals[i]);
			}

			this._register.splice(a + l);
		
		} else {
			for (i = 0; i < c - 1; i++) {
				this._register.setItem(a + i, retvals[i]);
			}
		}

		shine.gc.collect(retvals);
	}


	while (this._instructions[this._pc * 4] !== undefined) {
		line = this._data.linePositions && this._data.linePositions[this._pc];
		retval = this._executeInstruction(this._pc++, line);

		if (shine.Coroutine._running && shine.Coroutine._running.status == shine.SUSPENDING) {
			shine.Coroutine._running._resumeStack.push(this);

			if (shine.Coroutine._running._func._instance == this) {
				retval = shine.Coroutine._running._yieldVars;

				shine.Coroutine._running.status = shine.SUSPENDED;
				shine.Coroutine._remove();

				//shine.stddebug.write('[coroutine suspended]\n');
				
				return retval;
			}
			
			return;
		}

		if (this._vm._status == shine.SUSPENDING && !retval) {
			this._vm._resumeStack.push(this);
			return;
		}
		
		if (shine.debug && shine.debug._status == shine.SUSPENDING && !retval) {
			shine.debug._resumeStack.push(this);
			return;
		}
		
		
		if (retval !== undefined) {
			this.terminated = true;
			this.dispose();
			
			return retval;
		}
	}
	
	this.terminated = true;
	this.dispose();
};




/**
 * Executes a single instruction.
 * @param {object} instruction Information about the instruction.
 * @param {number} line The line number on which to find the instruction (for debugging).
 * @returns {Array} Array of the values that make be returned from executing the instruction.
 */
shine.Closure.prototype._executeInstruction = function (pc, line) {
	this.constructor._current = this;

	var offset = pc * 4,
		opcode = this._instructions[offset],
		op = this.constructor.OPERATIONS[opcode],
		A = this._instructions[offset + 1],
		B = this._instructions[offset + 2],
		C = this._instructions[offset + 3];

	// if (!op) throw new Error('Operation not implemented! (' + opcode + ')');
	return op.call(this, A, B, C);
};
	



/**
 * Returns the value of the constant registered at a given index.
 * @param {number} index Array containing arguments to use.
 * @returns {object} Value of the constant.
 */
shine.Closure.prototype._getConstant = function (index) {
	if (this._constants[index] === null) return;
	return this._constants[index];
};


	


/**
 * Returns whether or not the closure has retained child scopes.
 * @returns {boolean} Has retained child scopes.
 */
shine.Closure.prototype.hasRetainedScope = function () {

	if (this._localsUsedAsUpvalues.length) return true;
	if (this._upvalues.length) return true;

	// for (var i in this._upvalues) {
	// 	if (this._funcInstances.hasOwnProperty(i) && this._upvalues[i].open) return true;
	// }

	for (var i in this._funcInstances) {
		if (this._funcInstances.hasOwnProperty(i) && this._funcInstances[i].isRetained()) return true;
	}

	return false;
};





/**
 * Dump memory associtated with closure.
 */
shine.Closure.prototype.dispose = function (force) {

	if (force || !this.hasRetainedScope()) {
		delete this._vm;
		delete this._globals;
		delete this._file;
		delete this._data;
	
		delete this._functions;
		delete this._instructions;
	
		delete this._pc;
		// delete this._funcInstances;
	
		shine.gc.collect(this._params);
		shine.gc.collect(this._localFunctions);

		delete this._params;
	
		delete this._constants;

//		delete this._localsUsedAsUpvalues;
		delete this._upvalues;

		this._register.reset();
		this._funcInstances.length = 0;
		this._localsUsedAsUpvalues.length = 0;

		shine.Closure._graveyard.push(this);
	}
	
};






// Operation handlers:
// Note: The Closure instance is passed in as the "this" object for these handlers.
(function () {
	

	function move (a, b) {
		var val = this._register.getItem(b),
			local,
			i;

		this._register.setItem(a, val);

		if (this._data.locals && val && val instanceof shine.Function) {
			for (i = this._data.locals.length - 1; i >= 0; i--) {
				local = this._data.locals[i];
				if (local.startpc == this._pc - 1) this._localFunctions[local.varname] = val;
			}
		}
	}

			


	function loadk (a, bx) {
		this._register.setItem(a, this._getConstant(bx));
	}




	function loadbool (a, b, c) {
		this._register.setItem(a, !!b);
		if (c) this._pc++;
	}
		



	function loadnil (a, b) {
		for (var i = a; i <= b; i++) this._register.setItem(i, undefined);
	}




	function getupval (a, b) {
		if (this._upvalues[b] === undefined) return;
		this._register.setItem(a, this._upvalues[b].getValue());
	}




	function getglobal (a, b) {
		var result;

		if (this._getConstant(b) == '_G') {	// Special case
			result = new shine.Table(this._globals);
			
		} else if (this._globals[this._getConstant(b)] !== undefined) {
			result = this._globals[this._getConstant(b)];
		}

		this._register.setItem(a, result);
	}

		


	function gettable (a, b, c) {
		var result,
			local,
			i;

		b = this._register.getItem(b);
		c = (c >= 256)? this._getConstant(c - 256) : this._register.getItem(c);

		if (b === undefined) throw new shine.Error('Attempt to index a nil value (' + c + ' not present in nil)');

		if (b instanceof shine.Table) {
			result = b.getMember(c);

		} else if (typeof b == 'string' && shine.lib.string[c]) {
			result = shine.lib.string[c];

		} else {
			result = b[c];
		}

		this._register.setItem(a, result);

		if (result && result instanceof shine.Function) this._localFunctions[c] = result;
	}




	function setglobal(a, b) {
		var varName = this._getConstant(b),
			oldValue = this._globals[varName],
			newValue = this._register.getItem(a);

		shine.gc.incrRef(newValue);
		shine.gc.decrRef(oldValue);

		this._globals[varName] = newValue;
	}




	function setupval (a, b) {
		this._upvalues[b].setValue (this._register.getItem(a));
	}




	function settable (a, b, c) {
		a = this._register.getItem(a);
		b = (b >= 256)? this._getConstant(b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant(c - 256) : this._register.getItem(c);

		if (a === undefined) throw new shine.Error('Attempt to index a missing field (can\'t set "' + b + '" on a nil value)');

		if (a instanceof shine.Table) {
			a.setMember(b, c);		

		} else {
			a[b] = c;
		}
	}




	function newtable (a, b, c) {
		var t = new shine.Table();
		t.__shine.refCount = 0;
		this._register.setItem(a, t);
	}




	function self (a, b, c) {
		var result;
		b = this._register.getItem(b);
		c = (c >= 256)? this._getConstant(c - 256) : this._register.getItem(c);

		this._register.setItem(a + 1, b);

		if (b === undefined) throw new shine.Error('Attempt to index a nil value (' + c + ' not present in nil)');

		if (b instanceof shine.Table) {
			result = b.getMember(c);

		} else if (typeof b == 'string' && shine.lib.string[c]) {
			result = shine.lib.string[c];

		} else {
			result = b[c];
		}

		this._register.setItem(a, result);
	}




	function add (a, b, c) {
		//TODO: Extract the following RK(x) logic into a separate method.
		b = (b >= 256)? this._getConstant(b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant(c - 256) : this._register.getItem(c);

		var coerce = shine.utils.coerce,
			mt, f, bn, cn;

		if (((b || shine.EMPTY_OBJ) instanceof shine.Table && (mt = b.__shine.metatable) && (f = mt.getMember('__add')))
		|| ((c || shine.EMPTY_OBJ) instanceof shine.Table && (mt = c.__shine.metatable) && (f = mt.getMember('__add')))) {
			this._register.setItem(a, f.apply(null, [b, c], true)[0]);

		} else {
			b = coerce(b, 'number', 'attempt to perform arithmetic on a non-numeric value');
			c = coerce(c, 'number', 'attempt to perform arithmetic on a non-numeric value');
			this._register.setItem(a, b + c);
		}
	}




	function sub (a, b, c) {
		b = (b >= 256)? this._getConstant(b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant(c - 256) : this._register.getItem(c);

		var coerce = shine.utils.coerce,
			mt, f;

		if (((b || shine.EMPTY_OBJ) instanceof shine.Table && (mt = b.__shine.metatable) && (f = mt.getMember('__sub')))
		|| ((c || shine.EMPTY_OBJ) instanceof shine.Table && (mt = c.__shine.metatable) && (f = mt.getMember('__sub')))) {
			this._register.setItem(a, f.apply(null, [b, c], true)[0]);

		} else {
			b = coerce(b, 'number', 'attempt to perform arithmetic on a non-numeric value');
			c = coerce(c, 'number', 'attempt to perform arithmetic on a non-numeric value');
			this._register.setItem(a, b - c);
		}
	}




	function mul (a, b, c) {
		b = (b >= 256)? this._getConstant(b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant(c - 256) : this._register.getItem(c);

		var coerce = shine.utils.coerce,
			mt, f;

		if (((b || shine.EMPTY_OBJ) instanceof shine.Table && (mt = b.__shine.metatable) && (f = mt.getMember('__mul')))
		|| ((c || shine.EMPTY_OBJ) instanceof shine.Table && (mt = c.__shine.metatable) && (f = mt.getMember('__mul')))) {
			this._register.setItem(a, f.apply(null, [b, c], true)[0]);

		} else {
			b = coerce(b, 'number', 'attempt to perform arithmetic on a non-numeric value');
			c = coerce(c, 'number', 'attempt to perform arithmetic on a non-numeric value');
			this._register.setItem(a, b * c);
		}
	}




	function div (a, b, c) {
		b = (b >= 256)? this._getConstant(b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant(c - 256) : this._register.getItem(c);

		var coerce = shine.utils.coerce,
			mt, f;

		if (((b || shine.EMPTY_OBJ) instanceof shine.Table && (mt = b.__shine.metatable) && (f = mt.getMember('__div')))
		|| ((c || shine.EMPTY_OBJ) instanceof shine.Table && (mt = c.__shine.metatable) && (f = mt.getMember('__div')))) {
			this._register.setItem(a, f.apply(null, [b, c], true)[0]);

		} else {
			b = coerce(b, 'number', 'attempt to perform arithmetic on a non-numeric value');
			c = coerce(c, 'number', 'attempt to perform arithmetic on a non-numeric value');
			this._register.setItem(a, b / c);
		}
	}




	function mod (a, b, c) {
		b = (b >= 256)? this._getConstant(b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant(c - 256) : this._register.getItem(c);
		
		var coerce = shine.utils.coerce,
			mt, f, result, absC;

		if (((b || shine.EMPTY_OBJ) instanceof shine.Table && (mt = b.__shine.metatable) && (f = mt.getMember('__mod')))
		|| ((c || shine.EMPTY_OBJ) instanceof shine.Table && (mt = c.__shine.metatable) && (f = mt.getMember('__mod')))) {
			this._register.setItem(a, f.apply(null, [b, c], true)[0]);

		} else {
			b = coerce(b, 'number', 'attempt to perform arithmetic on a non-numeric value');
			c = coerce(c, 'number', 'attempt to perform arithmetic on a non-numeric value');

			if (c === 0 || c === -Infinity || c === Infinity || window.isNaN(b) || window.isNaN(c)) {
				result = NaN;

			} else {
				// result = b - Math.floor(b / c) * c; // Working, but slower on some devices.

				result = Math.abs(b) % (absC = Math.abs(c));
                if (b * c < 0) result = absC - result;
                if (c < 0) result *= -1;
			}

			this._register.setItem(a, result);
		}
	}




	function pow (a, b, c) {
		b = (b >= 256)? this._getConstant(b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant(c - 256) : this._register.getItem(c);

		var coerce = shine.utils.coerce,
			mt, f;

		if (((b || shine.EMPTY_OBJ) instanceof shine.Table && (mt = b.__shine.metatable) && (f = mt.getMember('__pow')))
		|| ((c || shine.EMPTY_OBJ) instanceof shine.Table && (mt = c.__shine.metatable) && (f = mt.getMember('__pow')))) {
			this._register.setItem(a, f.apply(null, [b, c], true)[0]);

		} else {
			b = coerce(b, 'number', 'attempt to perform arithmetic on a non-numeric value');
			c = coerce(c, 'number', 'attempt to perform arithmetic on a non-numeric value');
			this._register.setItem(a, Math.pow(b, c));
		}
	}




	function unm (a, b) {
		var mt, f, result;

		b = this._register.getItem(b);

		if ((b || shine.EMPTY_OBJ) instanceof shine.Table && (mt = b.__shine.metatable) && (f = mt.getMember('__unm'))) {
			result = shine.gc.createArray();
			result.push(b);
			result = f.apply(null, [b], true)[0];

		} else {
			b = shine.utils.coerce(b, 'number', 'attempt to perform arithmetic on a non-numeric value');
			result = -b;
		}

		this._register.setItem(a, result);
	}




	function not (a, b) {
		this._register.setItem(a, !this._register.getItem(b));
	}




	function len (a, b) {
		var length,
			i;

		b = this._register.getItem(b);

		if ((b || shine.EMPTY_OBJ) instanceof shine.Table) {
			length = shine.lib.table.getn(b);

		} else if (typeof b == 'object') {
			length = 0;
			for (i in b) if (b.hasOwnProperty(i)) length++;

		} else if (b == undefined) {
			throw new shine.Error('attempt to get length of a nil value');

		} else {
			length = b.length;
		}

		this._register.setItem(a, length);
	}




	function concat (a, b, c) {

		var text = this._register.getItem(c),
			i, item, mt, f, args;

		for (i = c - 1; i >= b; i--) {
			item = this._register.getItem(i);

			if ((item !== undefined && item instanceof shine.Table && (mt = item.__shine.metatable) && (f = mt.getMember('__concat')))
			|| (text !== undefined && text instanceof shine.Table && (mt = text.__shine.metatable) && (f = mt.getMember('__concat')))) {
				args = shine.gc.createArray();
				args.push(item, text);

				text = f.apply(null, args, true)[0];

			} else {
				if (!(typeof item === 'string' || typeof item === 'number') || !(typeof text === 'string' || typeof text === 'number')) throw new shine.Error('Attempt to concatenate a non-string or non-numeric value');
				text = item + text;
			}
		}

		this._register.setItem(a, text);
	}




	function jmp (a, sbx) {
		this._pc += sbx;
	}




	function eq (a, b, c) {
		b = (b >= 256)? this._getConstant(b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant(c - 256) : this._register.getItem(c);

		var mtb, mtc, f, result;

		if (b !== c && (b || shine.EMPTY_OBJ) instanceof shine.Table && (c || shine.EMPTY_OBJ) instanceof shine.Table && (mtb = b.__shine.metatable) && (mtc = c.__shine.metatable) && mtb === mtc && (f = mtb.getMember('__eq'))) {
			result = !!f.apply(null, [b, c], true)[0];			
		} else {
			result = (b === c);
		}
		
		if (result != a) this._pc++;
	}




	function lt (a, b, c) {
		b = (b >= 256)? this._getConstant(b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant(c - 256) : this._register.getItem(c);

		var typeB = (typeof b != 'object' && typeof b) || ((b || shine.EMPTY_OBJ) instanceof shine.Table && 'table') || 'userdata',
			typeC = (typeof c != 'object' && typeof b) || ((c || shine.EMPTY_OBJ) instanceof shine.Table && 'table') || 'userdata',
			f, result, mtb, mtc;

		if (typeB !== typeC) {
			throw new shine.Error ('attempt to compare ' + typeB + ' with ' + typeC);
			
		} else if (typeB == 'table') {
			if ((mtb = b.__shine.metatable) && (mtc = c.__shine.metatable) && mtb === mtc && (f = mtb.getMember('__lt'))) {
				result = f.apply(null, [b, c], true)[0];
			} else {
				throw new shine.Error('attempt to compare two table values');
			}

		} else {
			result = (b < c);
		}
		
		if (result != a) this._pc++;
	}




	function le (a, b, c) {
		b = (b >= 256)? this._getConstant(b - 256) : this._register.getItem(b);
		c = (c >= 256)? this._getConstant(c - 256) : this._register.getItem(c);

		var typeB = (typeof b != 'object' && typeof b) || ((b || shine.EMPTY_OBJ) instanceof shine.Table && 'table') || 'userdata',
			typeC = (typeof c != 'object' && typeof b) || ((c || shine.EMPTY_OBJ) instanceof shine.Table && 'table') || 'userdata',
			f, result, mtb, mtc;

		if (typeB !== typeC) {
			throw new shine.Error('attempt to compare ' + typeB + ' with ' + typeC);
			
		} else if (typeB == 'table') {
			if ((mtb = b.__shine.metatable) && (mtc = c.__shine.metatable) && mtb === mtc && (f = mtb.getMember('__le'))) {
				result = f.apply(null, [b, c], true)[0];
			} else {
				throw new shine.Error('attempt to compare two table values');
			}

		} else {
			result = (b <= c);
		}
		
		if (result != a) this._pc++;
	}




	function test (a, b, c) {
		a = this._register.getItem(a);
		if (shine.utils.coerce(a, 'boolean') !== !!c) this._pc++;
	}




	function testset (a, b, c) {
		b = this._register.getItem(b);

		if (shine.utils.coerce(b, 'boolean') === !!c) {
			this._register.setItem(a, b);
		} else {
			this._pc++;
		}
	}




	function call (a, b, c) {

		var args = shine.gc.createArray(), 
			i, l,
			retvals,
			funcToResume,
			f, o, mt;


		if (this._vm._status == shine.RESUMING) {
			// If we're resuming from the VM being suspended.
			funcToResume = this._vm._resumeStack.pop();
		
		} else if (shine.debug && shine.debug._status == shine.RESUMING) {
			// If we're resuming from a breakpoint/stepping, resume call stack first.
			funcToResume = shine.debug._resumeStack.pop();
		}	

		if (funcToResume) {		
			if (funcToResume instanceof shine.Coroutine) {
				retvals = funcToResume.resume();
				if (retvals) retvals.shift();

			} else if (funcToResume instanceof shine.Closure) {
				retvals = funcToResume._run();

			} else {
				retvals = funcToResume();
			}
			
		} else if (shine.Coroutine._running && shine.Coroutine._running.status == shine.RESUMING) {
			// If we're resuming a coroutine function...
			
			funcToResume = shine.Coroutine._running._resumeStack.pop();
			retvals = funcToResume._run();
			
		} else {
			// Prepare to run this function as usual

			if (b === 0) {
				l = this._register.getLength();
			
				for (i = a + 1; i < l; i++) {
					args.push(this._register.getItem(i));
				}

			} else {
				for (i = 0; i < b - 1; i++) {
					args.push(this._register.getItem(a + i + 1));
				}
			}
		}


		if (!funcToResume) {
			o = this._register.getItem(a);

			if ((o || shine.EMPTY_OBJ) instanceof shine.Function) {
				retvals = o.apply(null, args, true);

			} else if (o && o.apply) {
				retvals = o.apply(null, args);

			} else if (o && (o || shine.EMPTY_OBJ) instanceof shine.Table && (mt = o.__shine.metatable) && (f = mt.getMember('__call')) && f.apply) {
				args.unshift(o);
				retvals = f.apply(null, args, true);

			} else {
	 			throw new shine.Error('Attempt to call non-function');
			}
		}
		
		shine.gc.collect(args);


		if (this._vm._status == shine.SUSPENDING) {
			if (retvals !== undefined && this._vm._resumeVars === undefined) {
				this._vm._resumeVars = (retvals instanceof Array)? retvals : [retvals];
			}

			return;
		}

		if (!(retvals && retvals instanceof Array)) retvals = [retvals];

		if (shine.Coroutine._running && shine.Coroutine._running.status == shine.SUSPENDING) return;


		if (c === 0) {
			l = retvals.length;
			
			for (i = 0; i < l; i++) {
				this._register.setItem(a + i, (o = retvals[i]) == null? undefined : o);		// null comparison for Flash API calls
			}

			this._register.splice(a + l);
			
		} else {
			for (i = 0; i < c - 1; i++) {
				this._register.setItem(a + i, (o = retvals[i]) == null? undefined : o);		// null comparison for Flash API calls
			}
		}
		
	}




	function tailcall (a, b) {	
		return call.call(this, a, b, 0);
		
		// NOTE: Currently not replacing stack, so infinately recursive calls WOULD drain memory, unlike how tail calls were intended.
		// TODO: For non-external function calls, replace this stack with that of the new function. Possibly return the Function and handle the call in the RETURN section (for the calling function).
	}




	function return_ (a, b) {
		var retvals = shine.gc.createArray(),
			val,
			i, l;

		if (b === 0) {
			l = this._register.getLength();
			
			for (i = a; i < l; i++) {
				retvals.push(this._register.getItem(i));
			}

		} else {
			for (i = 0; i < b - 1; i++) {
				retvals.push(val = this._register.getItem(a + i));
				shine.gc.incrRef(val);
			}
		}

		close.call(this, 0);
		
//		this._register.reset();
		this.dead = true;
		
		return retvals;
	}




	function forloop (a, sbx) {
		var step = this._register.getItem(a + 2),
			limit = this._register.getItem(a + 1),
			index = this._register.getItem(a) + step,
			parity = step / Math.abs(step);
		
		this._register.setItem(a, index);
		
		if ((parity === 1 && index <= limit) || (parity !== 1 && index >= limit)) {
			this._register.setItem(a + 3, index);
			this._pc += sbx;
		}
	}




	function forprep (a, sbx) {
		this._register.setItem(a, this._register.getItem(a) - this._register.getItem(a + 2));
		this._pc += sbx; 
	}




	function tforloop (a, b, c) {
		var args = shine.gc.createArray(),
			retvals,
			val,
			index;

		args.push(this._register.getItem(a + 1), this._register.getItem(a + 2));
		retvals = this._register.getItem(a).apply(undefined, args);

		if (!((retvals || shine.EMPTY_OBJ) instanceof Array)) {
			val = shine.gc.createArray();
			val.push(retvals);
			retvals = val;
		}

		if ((val = retvals[0]) && val === '' + (index = parseInt(val, 10))) retvals[0] = index;
		for (var i = 0; i < c; i++) this._register.setItem(a + i + 3, retvals[i]);

		if ((val = this._register.getItem(a + 3)) !== undefined) {
			this._register.setItem(a + 2, val);
		} else {
			this._pc++;
		}
	}




	function setlist (a, b, c) {
		var length = b || this._register.getLength() - a - 1,
		i;
		
		for (i = 0; i < length; i++) {
			this._register.getItem(a).setMember(50 * (c - 1) + i + 1, this._register.getItem(a + i + 1));
		}
	}




	function close (a, b, c) {
		for (var i = 0, l = this._localsUsedAsUpvalues.length; i < l; i++) {
			var local = this._localsUsedAsUpvalues[i];

			if (local && local.registerIndex >= a) {
				local.upvalue.value = this._register.getItem(local.registerIndex);
				local.upvalue.open = false;

				this._localsUsedAsUpvalues.splice(i--, 1);
				l--;
				this._register.clearItem(local.registerIndex);
			}
		}
	}




	function closure (a, bx) {
		var me = this,
			upvalues = shine.gc.createArray(),
			opcode;

		while ((opcode = this._instructions[this._pc * 4]) !== undefined && (opcode === 0 || opcode === 4) && this._instructions[this._pc * 4 + 1] === 0) {	// move, getupval

			(function () {
				var op = opcode,
					offset = me._pc * 4,
					A = me._instructions[offset + 1],
					B = me._instructions[offset + 2],
					C = me._instructions[offset + 3],
					upvalue;

				// shine.stddebug.write('-> ' + me.constructor.OPERATION_NAMES[op] + '\t' + A + '\t' + B + '\t' + C);

				
				if (op === 0) {	// move
					for (var j = 0, l = me._localsUsedAsUpvalues.length; j < l; j++) {
						var up = me._localsUsedAsUpvalues[j];
						if (up.registerIndex === B) {
							upvalue = up.upvalue;
							break;
						}
					}

					if (!upvalue) {
						upvalue = {
							open: true,
							getValue: function () {
								return this.open? me._register.getItem(B) : this.value;
							},
							setValue: function (val) {
								if (this.open) {
									me._register.setItem(B, val);
								} else {
									shine.gc.incrRef(val);
									shine.gc.decrRef(this.value);
									this.value = val;
								}
							},
							name: me._functions[bx].upvalues? me._functions[bx].upvalues[upvalues.length] : '(upvalue)'
						};

						me._localsUsedAsUpvalues.push({
							registerIndex: B,
							upvalue: upvalue
						});
					}

					upvalues.push(upvalue);
					

				} else {	//getupval
					
					upvalues.push({
						getValue: function () {
							return me._upvalues[B].getValue();
						},
						setValue: function (val) {
							me._upvalues[B].setValue(val);
						},
						name: me._upvalues[B].name
					});
				}
				
			})();
			
			this._pc++;
		}

		var func = new shine.Function(this._vm, this._file, this._functions[bx], this._globals, upvalues);
		//this._funcInstances.push(func);
		this._register.setItem(a, func);
	}




	function vararg (a, b) {
		var i, l,
			limit = b === 0? this._params.length - this._data.paramCount : b - 1;
		
		for (i = 0; i < limit; i++) {
			this._register.setItem(a + i, this._params[this._data.paramCount + i]);
		}

		// Assumption: Clear the remaining items in the register.
		for (i = a + limit, l = this._register.getLength(); i < l; i++) {
			this._register.clearItem(i);
		}
	}



	shine.Closure.OPERATIONS = [move, loadk, loadbool, loadnil, getupval, getglobal, gettable, setglobal, setupval, settable, newtable, self, add, sub, mul, div, mod, pow, unm, not, len, concat, jmp, eq, lt, le, test, testset, call, tailcall, return_, forloop, forprep, tforloop, setlist, close, closure, vararg];
	shine.Closure.OPERATION_NAMES = ['move', 'loadk', 'loadbool', 'loadnil', 'getupval', 'getglobal', 'gettable', 'setglobal', 'setupval', 'settable', 'newtable', 'self', 'add', 'sub', 'mul', 'div', 'mod', 'pow', 'unm', 'not', 'len', 'concat', 'jmp', 'eq', 'lt', 'le', 'test', 'testset', 'call', 'tailcall', 'return', 'forloop', 'forprep', 'tforloop', 'setlist', 'close', 'closure', 'vararg'];

})();



