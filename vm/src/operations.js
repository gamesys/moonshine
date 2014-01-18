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
 * @fileOverview Operation handlers.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */


'use strict';


var shine = shine || {};
shine.operations = {};




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
		this._register.setItem(a, this.getConstant(bx));
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
		b = this.getConstant(b);
		this._register.setItem(a, getglobal_internal.call(this, b));
	}

		


	function getglobal_internal (key) {
		return (key == '_G')? this._globals : this._globals[key];
	}

		


	function gettable (a, b, c) {
		b = this._register.getItem(b);
		c = (c >= 256)? this.getConstant(c - 256) : this._register.getItem(c);

		this._register.setItem(a, gettable_internal.call(this, b, c));
	}




	function gettable_internal (b, c) {
		var result,
			local,
			i;

		if (b === undefined) throw new shine.Error('Attempt to index a nil value (' + c + ' not present in nil)');

		if (b instanceof shine.Table) {
			result = b.getMember(c);

		} else if (typeof b == 'string' && shine.lib.string[c]) {
			result = shine.lib.string[c];

		} else {
			result = b[c];
		}

		if (result && result instanceof shine.Function) this._localFunctions[c] = result;

		return result;
	}




	function setglobal(a, b) {
		var key = this.getConstant(b),
			value = this._register.getItem(a);

		setglobal_internal.call(this, key, value);
	}





	function setglobal_internal(key, value) {
		var oldValue = this._globals[key];

		shine.gc.incrRef(value);
		shine.gc.decrRef(oldValue);

		this._globals[key] = value;
	}




	function setupval (a, b) {
		this._upvalues[b].setValue (this._register.getItem(a));
	}




	function settable (a, b, c) {
		a = this._register.getItem(a);
		b = (b >= 256)? this.getConstant(b - 256) : this._register.getItem(b);
		c = (c >= 256)? this.getConstant(c - 256) : this._register.getItem(c);

		settable_internal.call(this, a, b, c);
	}




	function settable_internal (a, b, c) {
		if (a === undefined) throw new shine.Error('Attempt to index a missing field (can\'t set "' + b + '" on a nil value)');

		if (a instanceof shine.Table) {
			a.setMember(b, c);		

		} else {
			a[b] = c;
		}
	}




	function newtable (a, b, c) {
		this._register.setItem(a, newtable_internal());
	}




	function newtable_internal () {
		var t = new shine.Table();
		t.__shine.refCount = 0;
		return t;
	}




	function self (a, b, c) {
		b = this._register.getItem(b);
		c = (c >= 256)? this.getConstant(c - 256) : this._register.getItem(c);

		this._register.setItem(a + 1, b);
		this._register.setItem(a, self_internal(b, c));
	}




	function self_internal (b, c) {
		if (b === undefined) throw new shine.Error('Attempt to index a nil value (' + c + ' not present in nil)');
		if (b instanceof shine.Table) return b.getMember(c);
		if (typeof b == 'string' && shine.lib.string[c]) return shine.lib.string[c];

		return b[c];
	}




	function binary_arithmetic (a, b, c, mm, f) {
		b = (b >= 256)? this.getConstant(b - 256) : this._register.getItem(b);
		c = (c >= 256)? this.getConstant(c - 256) : this._register.getItem(c);

		var result = binary_arithmetic_internal.call(this, b, c, mm, f);
		this._register.setItem(a, result);
	}




	function binary_arithmetic_internal (b, c, mm, f) {
		var coerceToNumber = shine.utils.coerceToNumber,
			mt, f;

		if ((b && b instanceof shine.Table && (mt = b.__shine.metatable) && (f = mt.getMember(mm)))
		|| (c && c instanceof shine.Table && (mt = c.__shine.metatable) && (f = mt.getMember(mm)))) {
			return f.apply(null, [b, c], true)[0];
		} 

		if (typeof b != 'number') b = coerceToNumber(b, 'attempt to perform arithmetic on a %type value');
		if (typeof c != 'number') c = coerceToNumber(c, 'attempt to perform arithmetic on a %type value');

		return f(b, c);
	}




	function add (a, b, c) {
		binary_arithmetic.call(this, a, b, c, '__add', add_internal);
	}




	function add_internal (x, y) {
		return x + y;
	}




	function sub (a, b, c) {
		binary_arithmetic.call(this, a, b, c, '__sub', sub_internal);
	}




	function sub_internal (x, y) {
		return x - y;
	}




	function mul (a, b, c) {
		binary_arithmetic.call(this, a, b, c, '__mul', mul_internal);
	}




	function mul_internal (x, y) {
		return x * y;
	}




	function div (a, b, c) {
		binary_arithmetic.call(this, a, b, c, '__div', div_internal);
	}




	function div_internal (x, y) {
		return x / y;
	}




	function mod (a, b, c) {
		binary_arithmetic.call(this, a, b, c, '__mod', mod_internal);
	}



	function mod_internal (b, c) {
		var result, absC;

		if (c === 0 || c === -Infinity || c === Infinity || window.isNaN(b) || window.isNaN(c)) return NaN;

		result = Math.abs(b) % (absC = Math.abs(c));
		if (b * c < 0) result = absC - result;
		if (c < 0) result *= -1;

		return result;
	}




	function pow (a, b, c) {
		binary_arithmetic.call(this, a, b, c, '__pow', Math.pow);
	}




	function unm (a, b) {
		b = this._register.getItem(b);
		this._register.setItem(a, unm_internal(b));
	}




	function unm_internal (b) {
		var mt, f, result;

		if (b && b instanceof shine.Table && (mt = b.__shine.metatable) && (f = mt.getMember('__unm'))) {
			result = shine.gc.createArray();
			result.push(b);
			return f.apply(null, result, true)[0];
		}

		if (typeof b != 'number') b = shine.utils.coerceToNumber(b, 'attempt to perform arithmetic on a %type value');
		return -b;
	}




	function not (a, b) {
		this._register.setItem(a, !this._register.getItem(b));
	}




	function len (a, b) {
		b = this._register.getItem(b);
		this._register.setItem(a, len_internal(b));
	}




	function len_internal (b) {
		var length,
			i;

		if (b == undefined) throw new shine.Error('attempt to get length of a nil value');
		if (b instanceof shine.Table) return shine.lib.table.getn(b);
		
		if (typeof b == 'object') {
			length = 0;
			for (i in b) if (b.hasOwnProperty(i)) length++;
			return length;
		} 

		return b.length;
	}




	function concat (a, b, c) {
		var text = this._register.getItem(c),
			items = [],
			i;

		for (i = c - 1; i >= b; i--) {
			items.push(this._register.getItem(i));
		}

		this._register.setItem(a, concat_internal(text, items));
	}




	function concat_internal (text, additions) {
		var textMetaTable = text && text instanceof shine.Table && (mt = text.__shine.metatable) && (f = mt.getMember('__concat')),
			coerceToString = shine.utils.coerceToString,
			item, i, l, mt, f, args;

		for (i = 0, l = additions.length; i < l; i++) {
			item = additions[i];

			if ((item !== undefined && item instanceof shine.Table && (mt = item.__shine.metatable) && (f = mt.getMember('__concat')))
			|| (f = textMetaTable)) {
				args = shine.gc.createArray();
				args.push(item, text);

				text = f.apply(null, args, true)[0];

			} else {
				text = coerceToString(text, 'attempt to concatenate a %type value');
				item = coerceToString(item, 'attempt to concatenate a %type value');
				text = item + text;
			}
		}

		return text;
	}




	function jmp (a, sbx) {
		this._pc += sbx;
	}




	function eq (a, b, c) {
		b = (b >= 256)? this.getConstant(b - 256) : this._register.getItem(b);
		c = (c >= 256)? this.getConstant(c - 256) : this._register.getItem(c);
		
		if (eq_internal(b, c) != a) this._pc++;
	}




	function eq_internal (b, c) {
		var mtb, mtc, f, result;

		if (b !== c && b && b instanceof shine.Table && (c || shine.EMPTY_OBJ) instanceof shine.Table && (mtb = b.__shine.metatable) && (mtc = c.__shine.metatable) && mtb === mtc && (f = mtb.getMember('__eq'))) {
			result = shine.gc.createArray();
			result.push(b, c);
			return !!f.apply(null, result, true)[0];
		}

		return (b === c);
	}




	function compare (a, b, c, mm, f) {
		b = (b >= 256)? this.getConstant(b - 256) : this._register.getItem(b);
		c = (c >= 256)? this.getConstant(c - 256) : this._register.getItem(c);

		if (compare_internal(b, c, mm, f) != a) this._pc++;
	}




	function compare_internal (b, c, mm, compare) {
		var typeB = (typeof b != 'object' && typeof b) || (b instanceof shine.Table && 'table') || 'userdata',
			typeC = (typeof c != 'object' && typeof c) || (c instanceof shine.Table && 'table') || 'userdata',
			f, result, mtb, mtc;

		if (typeB !== typeC) {
			throw new shine.Error ('attempt to compare ' + typeB + ' with ' + typeC);
			
		} else if (typeB == 'table') {
			if ((mtb = b.__shine.metatable) && (mtc = c.__shine.metatable) && mtb === mtc && (f = mtb.getMember(mm))) {
				result = shine.gc.createArray();
				result.push(b, c);
				return f.apply(null, result, true)[0];

			} else {
				throw new shine.Error('attempt to compare two table values');
			}

		} else {
			return compare(b, c);
		}
	}




	function lt (a, b, c) {
		compare.call(this, a, b, c, '__lt', lt_func);
	}




	function lt_func (b, c) {
		return b < c;
	}




	function le (a, b, c) {
		compare.call(this, a, b, c, '__le', le_func);
	}




	function le_func (b, c) {
		return b <= c;
	}




	function test (a, b, c) {
		a = this._register.getItem(a);
		if (shine.utils.coerceToBoolean(a) !== !!c) this._pc++;
	}




	function testset (a, b, c) {
		b = this._register.getItem(b);

		if (shine.utils.coerceToBoolean(b) === !!c) {
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
			running,
			f, o;


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
			
		} else if ((running = this._vm._coroutineRunning) && running.status == shine.RESUMING) {
			// If we're resuming a coroutine function...
			
			funcToResume = running._resumeStack.pop();
			retvals = funcToResume._run();
			
		} else {
			// Prepare to run this function as usual
			args = call_prep.call(this, a, b);
		}


		if (!funcToResume) {
			f = this._register.getItem(a);
			retvals = call_internal.call(this, f, args);
		}
		
		shine.gc.collect(args);


		if (this._vm._status == shine.SUSPENDING) {
			if (retvals !== undefined && this._vm._resumeVars === undefined) {
				this._vm._resumeVars = (retvals instanceof Array)? retvals : [retvals];
			}

			return;
		}

		if (!(retvals && retvals instanceof Array)) retvals = [retvals];

		if ((running = this._vm._coroutineRunning) && running.status == shine.SUSPENDING) return;


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




	function call_prep (a, b) {
		var i, l, args = [];
//TODO: Try splitting this into two functions and chose at jit-time depending on value of b
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
		return args;
	}




	function call_internal (f, args) {
		var retvals, mt, c;

		if (f !== undefined) {
			if (f instanceof shine.Function) {
				retvals = f.apply(null, args, true);

			} else if (f.apply) {
				retvals = f.apply(null, args);

			} else if (f instanceof shine.Table && (mt = f.__shine.metatable) && (c = mt.getMember('__call')) && c.apply) {
				args.unshift(f);
				retvals = c.apply(null, args, true);

			} else {
	 			throw new shine.Error('Attempt to call non-function');
			}

		} else {
 			throw new shine.Error('Attempt to call a nil value');
		}

		return retvals;
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
			i;

		args.push(this._register.getItem(a + 1), this._register.getItem(a + 2));
		retvals = tforloop_internal(this._register.getItem(a), args);

		for (i = 0; i < c; i++) this._register.setItem(a + i + 3, retvals[i]);

		if ((val = retvals[0]) !== undefined) {
			this._register.setItem(a + 2, val);
		} else {
			this._pc++;
		}
	}




	function tforloop_internal (f, args) {
		var retvals = f.apply(undefined, args),
			val;

		if (!(retvals && retvals instanceof Array)) {
			val = shine.gc.createArray();
			val.push(retvals);
			retvals = val;
		}

		return retvals;
	}




	function setlist (a, b, c) {
		var length = b || this._register.getLength() - a - 1,
		i;
		
		for (i = 0; i < length; i++) {
			this._register.getItem(a).setMember(50 * (c - 1) + i + 1, this._register.getItem(a + i + 1));
		}
	}


// here


	function close (a, b, c) {
		close_internal.call(this, a, close_getValue);
	}




	function close_getValue (index) {
		return this._register.getItem(index);
	}




	function close_internal (a, getValue) {
		
		for (var i = 0, l = this._localsUsedAsUpvalues.length; i < l; i++) {
			var local = this._localsUsedAsUpvalues[i];

			if (local && local.registerIndex >= a) {
				local.upvalue.value = getValue.call(this, local.registerIndex);
				local.upvalue.open = false;

				this._localsUsedAsUpvalues.splice(i--, 1);
				l--;
				this._register.clearItem(local.registerIndex);
			}
		}
	}




// 	function closure (a, bx) {
// 		var x = closure_upvalues.call(this, bx); console.log (x)
// 		var f = new shine.Function(this._vm, this._file, this._functions[bx], this._globals, x);
// 		this._register.setItem(a, f);
// 	};




// 	function closure_upvalues (bx) {
// 		var upvalues = shine.gc.createArray(),
// 			opcode,
// 			offset, A, B, C;

// 		while ((opcode = this._instructions[this._pc * 4]) !== undefined && (opcode === 0 || opcode === 4) && this._instructions[this._pc * 4 + 1] === 0) {	// move, getupval
// 			offset = this._pc * 4;
// 			A = this._instructions[offset + 1];
// 			B = this._instructions[offset + 2];
// 			C = this._instructions[offset + 3];

// 			upvalues.push((opcode? closure_getupval : closure_move).call(this, bx, upvalues.length, A, B, C));
// 			this._pc++;
// 		}

// //console.log (upvalues)
// 		return upvalues;
// 	}



	function closure (a, bx) {
		var upvalueData = shine.gc.createArray(),
			instructions = this._instructions,
			proto = instructions.constructor.prototype,
			slice = proto.slice || proto.subarray,
			opcode, f;

		while ((opcode = instructions[this._pc * 4]) !== undefined && (opcode === 0 || opcode === 4) && this._instructions[this._pc * 4 + 1] === 0) {	// move, getupval
			upvalueData.push.apply(upvalueData, slice.call(instructions, this._pc * 4, this._pc * 4 + 4));
			this._pc++;
		}

		f = new shine.Function(this._vm, this._file, this._functions[bx], this._globals, closure_upvalues.call(this, bx, upvalueData, closure_getUpval, closure_setUpval));
		this._register.setItem(a, f);
	}




	function closure_upvalues (bx, upvalueData, getUpval, setUpval) {
		var upvalues = shine.gc.createArray(),
			opcode, A, B, C, i, l;

		for (i = 0, l = upvalueData.length; i < l; i += 4) {
			opcode = upvalueData[i];
			A = upvalueData[i + 1];
			B = upvalueData[i + 2];
			C = upvalueData[i + 3];

			upvalues.push((opcode? closure_getupval : closure_move).call(this, bx, i / 4, A, B, C, getUpval, setUpval));
		}

		return upvalues;
	}




	function closure_getUpval (b) {
		return this._register.getItem(b);
	}




	function closure_setUpval (b, val) {
		this._register.setItem(b, val);
	}




	function closure_move (funcIndex, index, a, b, c, getUpval, setUpval) {
		var me = this,
			updata, upvalue;

		// move
		for (var j = 0, l = this._localsUsedAsUpvalues.length; j < l; j++) {
			updata = this._localsUsedAsUpvalues[j];
			if (updata.registerIndex === b) {
				upvalue = updata.upvalue;
				break;
			}
		}

		if (!upvalue) {
			upvalue = {
				open: true,
				getValue: function () {
					// return this.open? me._register.getItem(b) : this.value;
					return this.open? getUpval.call(me, b) : this.value;
				},
				setValue: function (val) {
					if (this.open) {
						// me._register.setItem(b, val);
						setUpval.call(me, b, val);
					} else {
						shine.gc.incrRef(val);
						shine.gc.decrRef(this.value);
						this.value = val;
					}
				},
				name: this._functions[funcIndex].upvalues? this._functions[funcIndex].upvalues[index] : '(upvalue)'
			};

			this._localsUsedAsUpvalues.push({
				registerIndex: b,
				upvalue: upvalue
			});
		}

		return upvalue;		
	}




	function closure_getupval (funcIndex, index, a, b, c) {
		var me = this;

		return {
			getValue: function () {
				return me._upvalues[b].getValue();
			},
			setValue: function (val) {
				me._upvalues[b].setValue(val);
			},
			name: this._upvalues[b].name
		};
	}




	function vararg (a, b) {
		var i, l,
			limit = b === 0? Math.max(0, this._params.length - this._data.paramCount) : b - 1;

		for (i = 0; i < limit; i++) {
			this._register.setItem(a + i, this._params[this._data.paramCount + i]);			
		}

		// Assumption: Clear the remaining items in the register.
		for (i = a + limit, l = this._register.getLength(); i < l; i++) {
			this._register.clearItem(i);
		}
	}





	shine.operations.HANDLERS = [move, loadk, loadbool, loadnil, getupval, getglobal, gettable, setglobal, setupval, settable, newtable, self, add, sub, mul, div, mod, pow, unm, not, len, concat, jmp, eq, lt, le, test, testset, call, tailcall, return_, forloop, forprep, tforloop, setlist, close, closure, vararg];
	shine.operations.NAMES = ['move', 'loadk', 'loadbool', 'loadnil', 'getupval', 'getglobal', 'gettable', 'setglobal', 'setupval', 'settable', 'newtable', 'self', 'add', 'sub', 'mul', 'div', 'mod', 'pow', 'unm', 'not', 'len', 'concat', 'jmp', 'eq', 'lt', 'le', 'test', 'testset', 'call', 'tailcall', 'return', 'forloop', 'forprep', 'tforloop', 'setlist', 'close', 'closure', 'vararg'];




	/******************************************************************
	*  Translators
	******************************************************************/


	function formatValue (value) {
		if (typeof value == 'string') {
			value = value.replace(/\n/g, '\\n');
			value = value.replace(/'/g, '\\\'');
			return "'" + value + "'";
		}
		return value;
	}




	function createVar (prefix) {
		// var vars = this.vars,
		// 	i = 0,
		// 	key;

		// while (vars.indexOf(prefix + i) >= 0) i++;
		// vars.push(key = prefix + i);

		var key = prefix + this.pc;
		this.vars.push(key);
		return key;
	}




	function translate_move (a, b) {
		return 'R' + a + '=R' + b + ';';
	}




	function translate_loadk (a, bx) {
		return 'R' + a + '=' + formatValue(this.getConstant(bx)) + ';';
	}




	function translate_loadbool (a, b, c) {
		var result = 'R' + a + '=' + !!b + ';',
			pc;

		if (c) {
			this.jumpDestinations[pc = this.pc + 2] = 1;
			result += 'pc=' + pc + ';break;';
		}

		return result;
	}
		



	function translate_loadnil (a, b) {
		var result = [];
		for (var i = a; i <= b; i++) result.push('R' + i + '=');

		return result.join('') + 'undefined;';
	}




	function translate_getupval (a, b) {
		return '(cl._upvalues[' + b + ']!==undefined)&&(R' + a + '=cl._upvalues[' + b + '].getValue());';
	}




	function translate_getglobal (a, b) {
		return 'R' + a + '=getglobal_internal.call(cl,' + formatValue(this.getConstant(b)) + ');';
	}




	function translate_gettable (a, b, c) {
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R' + c;

		return 'R' + a + '=gettable_internal(R' + b + ',' + c + ');';
	}




	function translate_setglobal(a, b) {
		var key = formatValue(this.getConstant(b));
		return 'setglobal_internal.call(cl,' + key + ',R' + a + ');';
	}




	function translate_setupval (a, b) {
		return 'cl._upvalues[' + b + '].setValue(R' + a + ');';
	}




	function translate_settable (a, b, c) {
		b = (b >= 256)? formatValue(this.getConstant(b - 256)) : 'R' + b;
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R' + c;

		return 'settable_internal.call(cl, R' + a + ',' + b + ',' + c + ');';
	}



	function translate_newtable (a, b, c) {
		return 'R' + a + '=newtable_internal();';
	}




	function translate_self (a, b, c) {
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R' + c;
		return 'R' + (a + 1) + '=R' + b + ';R' + a + '=self_internal(R' + b + ',' + c + ');';
	}




	function translate_binary_arithmetic (a, b, c, name) {
		b = (b >= 256)? formatValue(this.getConstant(b - 256)) : 'R' + b;
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R' + c;

		return 'R' + a + '=' + 'binary_arithmetic_internal(' + b + ',' + c + ",'__" + name + "'," + name + '_internal);';
	}




	function translate_add (a, b, c) {
		return translate_binary_arithmetic.call(this, a, b, c, 'add');
	}




	function translate_sub (a, b, c) {
		return translate_binary_arithmetic.call(this, a, b, c, 'sub');
	}




	function translate_mul (a, b, c) {
		return translate_binary_arithmetic.call(this, a, b, c, 'mul');
	}




	function translate_div (a, b, c) {
		return translate_binary_arithmetic.call(this, a, b, c, 'div');
	}




	function translate_mod (a, b, c) {
		return translate_binary_arithmetic.call(this, a, b, c, 'mod');
	}




	function translate_pow (a, b, c) {
		b = (b >= 256)? formatValue(this.getConstant(b - 256)) : 'R' + b;
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R' + c;

		return 'R' + a + '=' + 'binary_arithmetic_internal(' + b + ',' + c + ",'__pow',Math.pow);";
	}




	function translate_unm (a, b) {
		return 'R' + a + '=unm_internal(R' + b + ');';
	}




	function translate_not (a, b) {
		return 'R' + a + '=!R' + b + ';';
	}




	function translate_len (a, b) {
		return 'R' + a + '=len_internal(R' + b + ');';
	}




	function translate_concat (a, b, c) {
		var items = [],
			i;

		for (i = c - 1; i >= b; i--) {
			items.push('R' + i);
		}

		return 'R' + a + '=concat_internal(R' + c + ',[' + items.join() + ']);';
	}




	function translate_jmp (a, sbx) {
		var i = this.pc + sbx + 1;
		this.jumpDestinations[i] = 1;
		return 'pc=' + i + ';break;';
	}




	function translate_eq (a, b, c) {
		var pc = this.pc + 2;
		this.jumpDestinations[pc] = 1;

		a = a? '!' : '';
		b = (b >= 256)? formatValue(this.getConstant(b - 256)) : 'R' + b;
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R' + c;

		return 'if(' + a + 'eq_internal(' + b + ',' + c + ')){pc=' + pc + ';break}';
	}




	function translate_compare (a, b, c, mm, f) {
		var pc = this.pc + 2;
		this.jumpDestinations[pc] = 1;

		b = (b >= 256)? formatValue(this.getConstant(b - 256)) : 'R' + b;
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R' + c;		

		return 'if(compare_internal(' + b + ',' + c + ",'" + mm + "'," + f +')!=' + a + '){pc=' + pc + ';break;}';
	}




	function translate_lt (a, b, c) {
		return translate_compare.call(this, a, b, c, '__lt', 'lt_func');
	}




	function translate_le (a, b, c) {
		return translate_compare.call(this, a, b, c, '__le', 'le_func');
	}




	function translate_test (a, b, c) {
		var pc = this.pc + 2;
		this.jumpDestinations[pc] = 1;

		return 'if(shine.utils.coerceToBoolean(R' + a + ')!=' + c + '){pc=' + pc + ';break}';
	}




	function translate_testset (a, b, c) {
		var pc = this.pc + 2;
		this.jumpDestinations[pc] = 1;

		return 'if(shine.utils.coerceToBoolean(R' + b + ')==' + c + '){R' + a + '=R' + b + '}else{pc=' + pc + ';break}'
	}




	function translate_call (a, b, c) {
		var args = [],
			cvar = createVar.call(this, 'c'),
			fvar = createVar.call(this, 'f'),
			result, i, l;

		if (b === 0) {
			l = this.stackSize;
		
			for (i = a + 1; i < l; i++) {
				args.push(i);
			}

			// while (l >= 0 && args[--l] === undefined) console.log (l, args.pop());

		} else {
			for (i = 0; i < b - 1; i++) {
				args.push(a + i + 1);
			}
		}


		// result = '_=[' + (args.length? 'R' + args.join(',R') : '') + '];while(_.length&&_[_.length-1]===null)_.pop();';
		// result += cvar + '=call_internal(R' + a + ',_);';

		// if (c == 1) return result;

		// result += 'R' + a + '=(_=' + cvar + ' instanceof Array)?' + cvar + '[0]:' + cvar + ';';

		// for (i = a + 1, l = this.stackSize - 1; i < l; i++) {
		// 	result += 'R' + i + '=_&&' + (i - a + 1) + '<=' + cvar + '.length?' + cvar + '[' + (i - a) + ']:null;';
		// }

		result = '_=[' + (args.length? 'R' + args.join(',R') : '') + '];while(_.length&&_[_.length-1]===undefined)_.pop();';
		result += cvar + '=call_internal(R' + a + ',_);';

		if (c == 1) return result;

		result += 'R' + a + '=(_=' + cvar + ' instanceof Array)?' + cvar + '[0]:' + cvar + ';';

		for (i = a + 1, l = this.stackSize - 1; i < l; i++) {
			result += 'R' + i + '=_&&' + (i - a + 1) + '<=' + cvar + '.length?' + cvar + '[' + (i - a) + ']:undefined;';
		}
// result += 'if(_)for(' + fvar + '=1;' + fvar + '<' + cvar + '.length;' + fvar + '++)eval("R"+(' + fvar + '+' + a + ')+"=' + cvar + '[' + fvar + ']");';
		return result;
	}




	function translate_tailcall (a, b) {
		// TODO
		return translate_call.call(this, a, b, 0);
	}




	function translate_return (a, b) {
		var retvals = shine.gc.createArray(),
			// val,
			i, l;

		if (b === 0) {
			l = this.stackSize;
			
			for (i = a; i < l; i++) {
				retvals.push('R' + i);
			}

		} else {
			b--;
			for (i = 0; i < b; i++) {
				retvals.push('R' + (a + i));
			}
		}

		translate_close.call(this, 0);
		return 'return[' + retvals.join() + '];';
	}	




	function translate_forloop (a, sbx) {
		var step = 'R' + (a + 2),
			limit = 'R' + (a + 1),
			index = 'R' + a + '+' + step,
			forward = step + '/Math.abs(' + step + ')+1',
			pc = this.pc + sbx + 1;

		this.jumpDestinations[pc] = 1;

		return 'R' + a + '=' + index + ';_=' + forward + ';if((_&&R' + a + '<=' + limit + ')||(!_&&R' + a + '>=' + limit + ')){R' + (a + 3) + '=R' + a + ';pc=' + pc + ';break}';
	}




	function translate_forprep (a, sbx) {
		var pc = this.pc + sbx + 1;
		this.jumpDestinations[pc] = 1;

		return 'R' + a + '=R' + a + '-R' + (a + 2) + ';pc=' + pc + ';break;';
	}




	function translate_tforloop (a, b, c) {
		var fvar = createVar.call(this, 'tfor'),
			pc = this.pc + 2,
			result,
			i;

		this.jumpDestinations[pc] = 1;

		result = fvar + '=tforloop_internal(R' + a + ',[R' + (a + 1) + '===null?void 0:R' + (a + 1) + ',R' + (a + 2) + '===null?void 0:R' + (a + 2) + ']);';
		for (i = 0; i < c; i++) result += 'R' + (a + i + 3) + '=' + fvar + '[' + i + '];';
		result += 'if(' + fvar + '[0]!==void 0){R' + (a + 2) + '=' + fvar + '[0]}else{pc=' + pc + ';break}';

		return result;
	}




	function translate_setlist (a, b, c) {
		var length = b || this.stackSize - a - 1,
			result = '',
			i;
		
		for (i = 0; i < length; i++) {
			result += 'R' + a + '.setMember(' + (50 * (c - 1) + i + 1) + ',R' + (a + i + 1) + ');';
		}

		return result;
	}




	function translate_close (a, b, c) {
		return 'close_internal.call(cl,' + a + ',function(x){return eval("R"+x)});';
	}




	function translate_closure (a, bx) {
		var upvalueData = shine.gc.createArray(),
			instructions = this._instructions,
			proto = instructions.constructor.prototype,
			slice = proto.slice || proto.subarray,
			opcode;

		this.pc++;

		while ((opcode = instructions[this.pc * 4]) !== undefined && (opcode === 0 || opcode === 4) && this._instructions[this.pc * 4 + 1] === 0) {	// move, getupval
			upvalueData.push.apply(upvalueData, slice.call(instructions, this.pc * 4, this.pc * 4 + 4));
			this.pc++;
		}

		this.pc--;
		return 'R' + a + '=new shine.Function(cl._vm,cl._file,cl._functions[' + bx + '],cl._globals,closure_upvalues.call(cl,' + bx + ',' + JSON.stringify(upvalueData) + ',function(x){return eval("R"+x)},function(x,y){eval("R"+x+"="+formatValue(y))}));';
	}




	function translate_vararg (a, b) {
		var result = '',
			i, l;

		for (i = 0, l = this.stackSize - a; i < l; i++) {
			result += 'R' + (a + i) + '=arguments[' + (this.paramCount + i) + '];';
		}

		return result;
	}


		// var i, l,
		// 	limit = b === 0? Math.max(0, this._params.length - this._data.paramCount) : b - 1;

		// for (i = 0; i < limit; i++) {
		// 	this._register.setItem(a + i, this._params[this._data.paramCount + i]);			
		// }

		// // Assumption: Clear the remaining items in the register.
		// for (i = a + limit, l = this._register.getLength(); i < l; i++) {
		// 	this._register.clearItem(i);
		// }



	shine.operations.TRANSLATORS = [translate_move, translate_loadk, translate_loadbool, translate_loadnil, translate_getupval, translate_getglobal, translate_gettable, translate_setglobal, translate_setupval, translate_settable, translate_newtable, translate_self, translate_add, translate_sub, translate_mul, translate_div, translate_mod, translate_pow, translate_unm, translate_not, translate_len, translate_concat, translate_jmp, translate_eq, translate_lt, translate_le, translate_test, translate_testset, translate_call, translate_tailcall, translate_return, translate_forloop, translate_forprep, translate_tforloop, translate_setlist, translate_close, translate_closure, translate_vararg];




	var state = {
		getConstant: shine.Closure.prototype.getConstant
	};




	shine.operations.compile = function (func) {
		// return;
		// console.log(func._data.instructions.length)
		// if (func._data.instructions.length > 20000) return;
		// return;
		// for (i = 0, l = func._data.instructions.length; i < l; i += 4) {
		// 	opcode = func._data.instructions[i];
		// 	if (opcode == 28 || opcode == 29) {
		// 		shine.operations.jitFail++;
		// 		return;
		// 	}
		// }
var t = Date.now();
		shine.operations.jitPass++;

		var cl = func.getInstance()._instance,
			instructions = func._data.instructions,
			params = [],
			code = [],
			stackSize = state.stackSize = func._data.maxStackSize,
			pc = state.pc = 0,
			opcode, a, b, c,
			offset,
			i, l, pc;

		state._constants = func._data.constants;
		state._instructions = func._data.instructions;
		state.paramCount = func._data.paramCount;
		state._localsUsedAsUpvalues = cl._localsUsedAsUpvalues;

		state.upvalues = cl._upvalues;
		state.jumpDestinations = [1];
		state.code = [];
		state.vars = [];
		state.cl = cl;

		if (stackSize) {
			for (i = 0; i < stackSize; i++) {
				state.vars.push('R' + i);
				if (i < state.paramCount) params.push('R' + i);
			}
		} 
		

		l = instructions.length / 4;

		while (pc < l) {
			offset = pc * 4;
			opcode = instructions[offset];
	 		a = instructions[offset + 1];
	 		b = instructions[offset + 2];
	 		c = instructions[offset + 3];

	 		// state.code[pc] = 'console.log(' + pc + ',"' + shine.operations.NAMES[opcode] + '");' + shine.operations.TRANSLATORS[opcode].call(state, a, b, c);
	 		state.code[pc] = shine.operations.TRANSLATORS[opcode].call(state, a, b, c);
	 		pc = ++state.pc;
		}


		for (pc in state.jumpDestinations) {
			i = parseInt(pc, 10);
			state.code[i] = 'case ' + pc + ':' + state.code[i];
		}

		code = ['var pc=0,_,' + state.vars.join(',') + ';'];
		// code.push('for(_=0;_<arguments.length;_++){switch(pc){');
		code.push('while(1){switch(pc){');
		code = code.concat(state.code);
		code.push('}}');
// console.log( code.join('\n'))
		eval('func=function(' + params.join() + '){shine.Closure._current=cl;' + code.join('\n') + '}');

		shine.operations.jitTime += Date.now() - t;
// if (++x == 2) {
// 	window.moo = func;
// 	window.moo.cl = cl;
// 	window.moo.code = state.code;
// }
		return func;

	};

	shine.operations.jitTime = 0;
	shine.operations.jitPass = 0;
	shine.operations.jitFail = 0;
	window.top.shine = shine;


// 	function sdf () {
// var pc=0,_,R0,R1,R2,R3,R4,R5,for0;
// while(1){switch(pc){
// case 0:(cl._upvalues[0]!==undefined)&&(R1=cl._upvalues[0].getValue());
// R1=binary_arithmetic_internal(R1,0.2,'__add',add_internal);
// cl._upvalues[0].setValue(R1);
// R1=1;
// (cl._upvalues[1]!==undefined)&&(R2=cl._upvalues[1].getValue());
// R3=1;
// R1=R1-R3;for0=R3/Math.abs(R3)+1;while(R1=R1+R3,(for0&&R1+R3<=R2||!for0&&R1+R3>=R2)&&(R4=R1+R3)){
// (cl._upvalues[2]!==undefined)&&(R5=cl._upvalues[2].getValue());
// R0=gettable_internal(R5,R4);
// R5=gettable_internal(R0,'x');
// R5=binary_arithmetic_internal(R5,0.5,'__add',add_internal);
// settable_internal.call(cl, R0,'x',R5);
// R5=gettable_internal(R0,'scaleX');
// R5=binary_arithmetic_internal(R5,0.0001,'__sub',sub_internal);
// settable_internal.call(cl, R0,'scaleX',R5);
// R5=gettable_internal(R0,'scaleX');
// settable_internal.call(cl, R0,'scaleY',R5);
// R5=gettable_internal(R0,'x');
// if(compare_internal(810,R5,'__lt',lt_func)!=0){pc=20;break;}
// pc=23;break;
// case 20:settable_internal.call(cl, R0,'x',-120);
// settable_internal.call(cl, R0,'scaleX',0.8);
// settable_internal.call(cl, R0,'scaleY',0.8);
// case 23:}
// return[];
// }}
	// }
// var x=0;
})();

