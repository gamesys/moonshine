/*
 * Moonshine - a Lua virtual machine.
 *
 * Email: moonshine@gamesys.co.uk
 * http://moonshinejs.org
 *
 * Copyright (c) 2013-2015 Gamesys Limited. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * @fileOverview Operation handlers.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */

/*
	** Notes: 
	1. A shine.Closure instance is passed in as the context for the operation handlers.
	2. The main operation functions are the entry point for the interpretor.
	3. The internal functions are used by the JIT compiler where the main functions use registers.
*/


(function (shine) {
	shine.operations = {};
	

	/******************************************************************
	*  Operations
	******************************************************************/




	/******************************************************************/
	// move

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

			


	/******************************************************************/
	// loadk

	function loadk (a, bx) {
		this._register.setItem(a, this.getConstant(bx));
	}




	/******************************************************************/
	// loadbool

	function loadbool (a, b, c) {
		this._register.setItem(a, !!b);
		if (c) this._pc++;
	}
		



	/******************************************************************/
	// loadnil

	function loadnil (a, b) {
		for (var i = a; i <= b; i++) this._register.setItem(i, undefined);
	}




	/******************************************************************/
	// getupval

	function getupval (a, b) {
		// if (this._upvalues[b] === undefined) return;
		var value = (this._upvalues[b] === undefined)? undefined : this._upvalues[b].getValue();
		this._register.setItem(a, value);
	}




	/******************************************************************/
	// getglobal

	function getglobal (a, b) {
		b = this.getConstant(b);
		this._register.setItem(a, getglobal_internal.call(this, b));
	}

		


	function getglobal_internal (key) {
		return (key == '_G')? this._globals : this._globals[key];
	}

		


	/******************************************************************/
	// gettable

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

		if (this && this._localFunctions && result && result instanceof shine.Function) this._localFunctions[c] = result;

		return result;
	}




	/******************************************************************/
	// setglobal

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




	/******************************************************************/
	// setupval

	function setupval (a, b) {
		this._upvalues[b].setValue(this._register.getItem(a));
	}




	/******************************************************************/
	// settable

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




	/******************************************************************/
	// newtable

	function newtable (a, b, c) {
		this._register.setItem(a, newtable_internal());
	}




	function newtable_internal () {
		var t = new shine.Table();
		t.__shine.refCount = 0;
		return t;
	}




	/******************************************************************/
	// self

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




	/******************************************************************/
	// add, sub, mul, div, mod, pow

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




	/*****************/
	// add

	function add (a, b, c) {
		binary_arithmetic.call(this, a, b, c, '__add', add_internal);
	}




	function add_internal (x, y) {
		return x + y;
	}




	/*****************/
	// sub

	function sub (a, b, c) {
		binary_arithmetic.call(this, a, b, c, '__sub', sub_internal);
	}




	function sub_internal (x, y) {
		return x - y;
	}




	/*****************/
	// mul

	function mul (a, b, c) {
		binary_arithmetic.call(this, a, b, c, '__mul', mul_internal);
	}




	function mul_internal (x, y) {
		return x * y;
	}




	/*****************/
	// div

	function div (a, b, c) {
		binary_arithmetic.call(this, a, b, c, '__div', div_internal);
	}




	function div_internal (x, y) {
		if (y === undefined) throw new shine.Error('attempt to perform arithmetic on a nil value');
		return x / y;
	}




	/*****************/
	// mod

	function mod (a, b, c) {
		binary_arithmetic.call(this, a, b, c, '__mod', mod_internal);
	}



	function mod_internal (b, c) {
		var result, absC;

		if (c === 0 || c === -Infinity || c === Infinity || window.isNaN(b) || window.isNaN(c)) return NaN;

		result = Math.abs(b) % (absC = Math.abs(c));
		if (b * c < 0 && result != 0) result = absC - result;
		if (c < 0) result *= -1;

		return result;
	}




	/*****************/
	// pow

	function pow (a, b, c) {
		binary_arithmetic.call(this, a, b, c, '__pow', Math.pow);
	}




	/******************************************************************/
	// unm

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




	/******************************************************************/
	// not

	function not (a, b) {
		this._register.setItem(a, !this._register.getItem(b));
	}




	/******************************************************************/
	// len

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




	/******************************************************************/
	// concat

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




	/******************************************************************/
	// jmp

	function jmp (a, sbx) {
		this._pc += sbx;
	}




	/******************************************************************/
	// eq

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




	/******************************************************************/
	// lt, le

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




	/*****************/
	// lt

	function lt (a, b, c) {
		compare.call(this, a, b, c, '__lt', lt_func);
	}




	function lt_func (b, c) {
		return b < c;
	}




	/*****************/
	// le

	function le (a, b, c) {
		compare.call(this, a, b, c, '__le', le_func);
	}




	function le_func (b, c) {
		return b <= c;
	}




	/******************************************************************/
	// test

	function test (a, b, c) {
		a = this._register.getItem(a);
		if (shine.utils.coerceToBoolean(a) !== !!c) this._pc++;
	}




	/******************************************************************/
	// testset

	function testset (a, b, c) {
		b = this._register.getItem(b);

		if (shine.utils.coerceToBoolean(b) === !!c) {
			this._register.setItem(a, b);
		} else {
			this._pc++;
		}
	}




	/******************************************************************/
	// call

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
		//TODO: Try splitting this into two functions and chose at jit-time depending on value of b

		var i, l, args = [];

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
			if (f.apply) {
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




	/******************************************************************/
	// tailcall

	function tailcall (a, b) {	
		return call.call(this, a, b, 0);
		
		// NOTE: Currently not replacing stack, so infinately recursive calls WOULD drain memory, unlike how tail calls were intended.
		// TODO: For non-external function calls, replace this stack with that of the new function. Possibly return the Function and handle the call in the RETURN section (for the calling function).
	}




	/******************************************************************/
	// return

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




	/******************************************************************/
	// forloop

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




	/******************************************************************/
	// forprep

	function forprep (a, sbx) {
		this._register.setItem(a, this._register.getItem(a) - this._register.getItem(a + 2));
		this._pc += sbx; 
	}




	/******************************************************************/
	// tforloop

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




	/******************************************************************/
	// setlist

	function setlist (a, b, c) {
		var length = b || this._register.getLength() - a - 1,
		i;
		
		for (i = 0; i < length; i++) {
			this._register.getItem(a).setMember(50 * (c - 1) + i + 1, this._register.getItem(a + i + 1));
		}
	}




	/******************************************************************/
	// close

	function close (a, b, c) {
		close_internal.call(this, a, close_getValue, close_clearItem);
	}




	function close_getValue (index) {
		return this._register.getItem(index);
	}




	function close_clearItem (index) {
		this._register.clearItem(index);
	}

				


	function close_internal (a, getValue, clearItem) {
		
		for (var i = 0, l = this._localsUsedAsUpvalues.length; i < l; i++) {
			var local = this._localsUsedAsUpvalues[i];

			if (local && local.registerIndex >= a) {
				local.upvalue.value = getValue.call(this, local.registerIndex);
				local.upvalue.open = false;

				this._localsUsedAsUpvalues.splice(i--, 1);
				l--;

				if (clearItem) clearItem.call(this, local.registerIndex);
			}
		}
	}




	/******************************************************************/
	// closure

	function closure (a, bx) {
		var upvalueData = shine.gc.createArray(),
			instructions = this._instructions,
			slice = instructions.slice || instructions.subarray,
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




	/******************************************************************/
	// vararg

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




	/*****************************************************************/


	var // GC
		incr = shine.gc.incrRef,
		decr = shine.gc.decrRef.bind(shine.gc),
		collect = shine.gc.collect.bind(shine.gc),
		createArray = shine.gc.createArray.bind(shine.gc),
		cacheArray = shine.gc.cacheArray.bind(shine.gc),

		// Constants
		EMPTY_ARR = shine.EMPTY_ARR;


	function get_upv (x) {
		return this[x]
	}


	function set_upv (x,y) {
		setR(this,x,y)
	};


	function setR (register, index, value) {
		incr(value);
		decr(register[index]);
		register[index] = value;
	}


	function clearR (register, index) {
		for (var i = index, l = register.length; i < l; i++) decr(register[i]);
		register.length = index - 1;
	}


	function setRArr (register, index, limit, arr) {
		var toDecr = register.splice(index, Infinity),
			i, l;
 
		if (!(arr instanceof Array)) {
			i = createArray();
			i.push(arr);
			arr = i;
		}
 
		for (i = 0, l = limit || arr.length; i < l; i++) {
			incr(register[index + i] = arr[i]);
		}
 
		for (i = 0, l = toDecr.length; i < l; i++) {
			decr(register.shift());
		}

		cacheArray(arr);
	}
 

	function callR (register, index, c, argStart, argEnd) {
		var args = createArray(),
			result, i, limit, toDecr;
 
 
		if (argStart) {
			limit = argEnd? argEnd : register.length;
 
			for (i = argStart; i < limit; i++) {
				args.push(register[i]);
			}
		}
 
		result = call_internal(register[index],args);
		toDecr = register.splice(index, Infinity);
 
		if (c == 1) {
			// NOOP
		 
		} else if (!(result instanceof Array)) {
			setR(register, index, result);
		 
		} else {
			for (i = 0, limit = result.length; i < limit; i++) incr(result[i]);
		 
			result.unshift(index, 0);
			Array.prototype.splice.apply(register, result);
			 
			cacheArray(result);
		}

		for (i = 0, limit = toDecr.length; i < limit; i++) {
			decr(toDecr.shift());
		}

 		cacheArray(args);
	}
 
 
	function setlistT (R, t, index, keyStart, length) {
		t.setMember(keyStart, R[index]);
		if (--length) setlistT(R, t, index + 1, keyStart + 1, length);
	}
 
 
	function create_func (def, upvals, cl) {
		return new shine.Function(cl._vm,cl._file,def,cl._globals,upvals);
	}
 



	/*****************************************************************/


	/**
	 * Array of operation handlers indexed by opcode.
	 * @type Array
	 * @constant
	 */
	shine.operations.HANDLERS = [move, loadk, loadbool, loadnil, getupval, getglobal, gettable, setglobal, setupval, settable, newtable, self, add, sub, mul, div, mod, pow, unm, not, len, concat, jmp, eq, lt, le, test, testset, call, tailcall, return_, forloop, forprep, tforloop, setlist, close, closure, vararg];


	/**
	 * Array of instruction names indexed by opcode.
	 * @type Array
	 * @constant
	 */
	shine.operations.NAMES = ['move', 'loadk', 'loadbool', 'loadnil', 'getupval', 'getglobal', 'gettable', 'setglobal', 'setupval', 'settable', 'newtable', 'self', 'add', 'sub', 'mul', 'div', 'mod', 'pow', 'unm', 'not', 'len', 'concat', 'jmp', 'eq', 'lt', 'le', 'test', 'testset', 'call', 'tailcall', 'return', 'forloop', 'forprep', 'tforloop', 'setlist', 'close', 'closure', 'vararg'];




	/**
	 * Creates a new JavaScript function in the current scope. 
	 * Can be used by the JIT compiler to make use of the operation handlers.
	 * @param {string} funcDef String containing a JavaScript function definition.
	 * @returns {function} Resulting JavaScript function.
	 */
	shine.operations.evaluateInScope = function (funcDef, vm) {
		var func,
			shine_g = (vm || shine.getCurrentVM())._globals;


		eval('func=' + funcDef);

		return func;
	};




	shine.operations.internal = {
		getglobal: getglobal_internal,
		gettable: gettable_internal,
		setglobal: setglobal_internal,
		settable: settable_internal,
		newtable: newtable_internal,
		self: self_internal,
		binary_arithmetic: binary_arithmetic_internal,
		add: add_internal,
		sub: sub_internal,
		mul: mul_internal,
		div: div_internal,
		mod: mod_internal,
		unm: unm_internal,
		len: len_internal,
		concat: concat_internal,
		eq: eq_internal,
		compare: compare_internal,
		call: call_internal,
		tforloop: tforloop_internal,
		close: close_internal,
		closure_upvalues: closure_upvalues,
		lt_func: lt_func,
		le_func: le_func
	};

})(shine || {});

