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
 * @fileOverview JIT compilation functionality.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */


'use strict';



(function (shine) {
	

	/**
	 * Namespace for functions related to the just-in-time compiler.
	 * @namespace
	 */
	shine.jit = shine.jit || {};




	/**
	 * Flag with which to switch JIT compiler on and off.
	 * @type boolean
	 */
	shine.jit.enabled = shine.jit.enabled || false;




	/**
	 * The number of times that a function is interpreted before it is set to be compiled.
	 * @type number
	 */
	shine.jit.INVOCATION_TOLERANCE = 2;




	/**
	 * The minimum FPS required before the compiler will kick in.
	 * Set to zero for synchronous compile.
	 * @type number
	 */
	shine.jit.MIN_FPS_TO_COMPILE = 59;




	/**
	 * The length of interval between checks on FPS before compile, in ms.
	 * @type number
	 */
	shine.jit.COMPILE_INTERVAL = 500;




	var SET_REG_PATTERN = /^setR\(R,(\d+),([^;]*?)\);$/,
		gc = shine.gc,
		Function_apply = shine.Function.prototype.apply,
		compileQueue = gc.createArray(),
		frameCounter = 0,
		waitingToCompile = false,
		getNow = Date['now']? Date['now'] : function () { return new Date().getTime(); },
		waitTimerStarted;




	/******************************************************************
	*  Hooks to elsewhere
	******************************************************************/

	shine.Function.prototype.apply = function () {
		var data,
			compiled;

		if (shine.jit.enabled) {
			data = this._data;

			// If function has already been compiled...
			if (compiled = data._compiled) {
				this.apply = createRunner(this, data, compiled);
				return this.apply.apply(this, arguments);
			}

			this._runCount = this._runCount || 0;

			if (!this._compiling && ++this._runCount == shine.jit.INVOCATION_TOLERANCE) {
				this._compile();
			}
		}

		return Function_apply.apply(this, arguments);
	};




	/**
	 * Compiles the function to JavaScript.
	 */
	shine.Function.prototype._compile = function () {
		var me = this,
			data = this._data;

		if (!data._compiling) {
			data._compiling = true;

			shine.jit.compile(this, function (compiled) {
				if (data._compiled = compiled) {
					data._compiling = false;
					me.apply = createRunner(me, data, compiled);
				}
			});
		}
	};




	function createRunner (instance, data, compiled) {
		return function (context, args) {
			var closure = gc.createObject(),
				retvals;

			closure._vm = instance._vm;
			closure._globals = instance._globals;
			closure._upvalues = instance._upvalues;
			closure._constants = data.constants;
			closure._functions = data.functions;
			closure._localsUsedAsUpvalues = gc.createArray();

			return compiled.apply(closure, args); 
		};
	}


	/******************************************************************
	*  Hooks from elsewhere (event handlers)
	******************************************************************/


	shine.jit.onCompile = function () {};   // Overwrite to monitor jit compiler activity.




	/******************************************************************
	*  Compile Queue
	******************************************************************/


	function enableCompileTimer () {
		if (!waitingToCompile) {
			waitingToCompile = true;
			waitTimerStarted = getNow();
			frameCounter = 0;

			window.setTimeout(onWaitTimerTick, shine.jit.COMPILE_INTERVAL);
			window.requestAnimationFrame(onAnimationFrame);
		}
	}




	function onAnimationFrame () {
		if (waitingToCompile) {
			frameCounter++;
			window.requestAnimationFrame(onAnimationFrame);
		}
	}




	function onWaitTimerTick () {
		if (!shine || !shine.jit) return;
		
		var now = getNow(),
			fps = 1000 * frameCounter / (now - waitTimerStarted);

		if (fps >= shine.jit.MIN_FPS_TO_COMPILE) { 
			processQueue();

		} else {
			frameCounter = 0;
			waitTimerStarted = now;
			window.setTimeout(onWaitTimerTick, shine.jit.COMPILE_INTERVAL);
		}
	}




	function processQueue () {
		waitingToCompile = false;
		shine.jit.onCompile();

		while (compileQueue.length) {
			var item = compileQueue.shift()
			compile(item[0], item[1]);
			gc.collect(item);
		}
	}




	function compile (func, callback) {
		var js = shine.jit.toJS(func);
		callback(shine.operations.evaluateInScope(js, func._vm));
	}




	/******************************************************************
	*  Helpers
	******************************************************************/


	var NEWLINE_PATTERN = /\n/g,
		APOS_PATTERN = /'/g;


	/**
	 * Returns a parsable string representation of a primative value.
	 * @param {object} value The input value.
	 * @returns {string} A string-encoded representation.
	 */
	function formatValue (value) {
		if (typeof value == 'string') {
			value = value.replace(NEWLINE_PATTERN, '\\n');
			value = value.replace(APOS_PATTERN, '\\\'');
			return "'" + value + "'";
		}

		return value;
	}




	/**
	 * Adds a new unique variable to the scope of a function.
	 * @this {object} The state of the function object being compiled.
	 * @param {string} prefix The prefix to the resulting variable name.
	 * @returns {string} The name of the new variable.
	 */
	function createVar (prefix) {
		var key = prefix + this.pc;
		this.vars.push(key);
		return key;
	}




	/******************************************************************
	*  Translators
	******************************************************************/


	function translate_move (a, b) {
		return 'setR(R,' + a + ',R[' + b + ']);';
	}




	function translate_loadk (a, bx) {
		return 'setR(R,' + a + ',' + formatValue(this.getConstant(bx)) + ');';
	}




	function translate_loadbool (a, b, c) {
		var result = 'setR(R,' + a + ',' + !!b + ');',
			pc;

		if (c) {
			this.jumpDestinations[pc = this.pc + 2] = 1;
			result += 'pc=' + pc + ';break;';
		}

		return result;
	}
		



	function translate_loadnil (a, b) {
		var nils = gc.createArray(),
			result;

		for (var i = a; i <= b; i++) nils.push('setR(R,' + i + ');');
		result = nils.join('');

		gc.collect(nils);

		return result;
	}




	function translate_getupval (a, b) {
		return 'setR(R,' + a + ',cl._upvalues[' + b + ']===void 0?void 0:cl._upvalues[' + b + '].getValue());';
	}




	function translate_getglobal (a, b) {
		var key = this.getConstant(b);
		return 'setR(R,' + a + ',shine_g' + ((key == '_G')? '' : '[' + formatValue(key) + ']') + ');';
	}




	function translate_gettable (a, b, c) {
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R[' + c + ']';
		return 'setR(R,' + a + ',gettable_internal(R[' + b + '],' + c + '));';
	}




	function translate_setglobal(a, b) {
		var key = formatValue(this.getConstant(b));
		return 'setglobal_internal.call(cl,' + key + ',R[' + a + ']);';
	}




	function translate_setupval (a, b) {
		return 'cl._upvalues[' + b + '].setValue(R[' + a + ']);';
	}




	function translate_settable (a, b, c) {
		b = (b >= 256)? formatValue(this.getConstant(b - 256)) : 'R[' + b + ']';
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R[' + c + ']';

		return 'settable_internal(R[' + a + '],' + b + ',' + c + ');';
	}



	function translate_newtable (a, b, c) {
		return 'setR(R,' + a + ',newtable_internal());';
	}




	function translate_self (a, b, c) {
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R[' + c + ']';
		return 'setR(R,' + (a + 1) + ',R[' + b + ']);setR(R,' + a + ',self_internal(R[' + b + '],' + c + '));';
	}




	function translate_binary_arithmetic (a, b, c, name) {
		b = (b >= 256)? formatValue(this.getConstant(b - 256)) : 'R[' + b + ']';
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R[' + c + ']';

		return 'setR(R,' + a + ',' + 'binary_arithmetic_internal(' + b + ',' + c + ",'__" + name + "'," + name + '_internal));';
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
		b = (b >= 256)? formatValue(this.getConstant(b - 256)) : 'R[' + b + ']';
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R[' + c + ']';

		return 'setR(R,' + a + ',binary_arithmetic_internal(' + b + ',' + c + ",'__pow',Math.pow));";
	}




	function translate_unm (a, b) {
		return 'setR(R,' + a + ',unm_internal(R[' + b + ']));';
	}




	function translate_not (a, b) {
		return 'setR(R,' + a + ',!R[' + b + ']);';
	}




	function translate_len (a, b) {
		return 'setR(R,' + a + ',len_internal(R[' + b + ']));';
	}




	function translate_concat (a, b, c) {
		return 'setR(R,' + a + ',concat_internal(R[' + c + '],R.slice(' + b + ',' + c + ').reverse()));';
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
		b = (b >= 256)? formatValue(this.getConstant(b - 256)) : 'R[' + b + ']';
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R[' + c + ']';

		return 'if(' + a + 'eq_internal(' + b + ',' + c + ')){pc=' + pc + ';break}';
	}




	function translate_compare (a, b, c, mm, f) {
		var pc = this.pc + 2;
		this.jumpDestinations[pc] = 1;

		b = (b >= 256)? formatValue(this.getConstant(b - 256)) : 'R[' + b + ']';
		c = (c >= 256)? formatValue(this.getConstant(c - 256)) : 'R[' + c + ']';

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

		return 'if(shine.utils.coerceToBoolean(R[' + a + '])!=' + c + '){pc=' + pc + ';break}';
	}




	function translate_testset (a, b, c) {
		var pc = this.pc + 2;
		this.jumpDestinations[pc] = 1;

		return 'if(shine.utils.coerceToBoolean(R[' + b + '])==' + c + '){R[' + a + ']=R[' + b + ']}else{pc=' + pc + ';break}'
	}




	function translate_call (a, b, c) {
		var argLimits,
			result;

		if (b === 0) { // Arguments from R(A+1) to top
			argLimits = (a + 1) + ',void 0';
 
		} else if (b === 1) { // No arguments
			argLimits = 'void 0,void 0';
 
		} else { // Arguments from R(A+1) to R(A+B-1)
			argLimits = (a + 1) + ',' + (a + b);

			var canRestructure = true,
				i, l,
				params = gc.createArray(),
				match, func;

			for (i = 1; i < b; i++) {
				if (!((match = this.code[this.pc - i]) && match.match(SET_REG_PATTERN)) || match[1] != "" + (a + b - i)) {
					canRestructure = false;
					break;
				// } else if (match[2].indexOf('setR(') >= 0) {
				//  canRestructure = false;
				//  break;
				} else {
					params.unshift(match[2]);
				}
			}

			if (canRestructure) {
				match = this.code[this.pc - b].match(SET_REG_PATTERN);

				if (match && match[1] == '' + a) {
					func = match[2];
					for (i = 1; i <= b; i++) this.code[this.pc - i] = '';

					if (c == 1) {
						result = func + '.call(void 0,' + params.join(',') + ');';
					} else {
						result = 'setRArr(R,' + a + ',' + (c? c - 1 : 'void 0') + ',' + func + '.call(void 0,' + params.join(',') + '));';
					}
				}
			} 
		}
 
		gc.collect(params);
		return result || 'callR(R,' + a + ',' + c + ',' + argLimits + ');';
	}





	function translate_tailcall (a, b) {
		// TODO
		return translate_call.call(this, a, b, 0);
	}




	function translate_return (a, b) {
		var close = translate_close.call(this, 0),
			i;

		if (b === 0) {
			i = createVar.call(this, 'i');
			return '_=R.slice(' + a + ');' + close + 'return _;';

		} else if (b == 1) {
			return close + 'return createArray();';
 
		} else {
			return '_=R.slice(' + a + ',' + (a + b - 1) + ');' + close + 'return _;';
		}
	}   



	function translate_forloop (a, sbx) {
		var step = 'R[' + (a + 2) + ']',
			limit = 'R[' + (a + 1) + ']',
			index = 'R[' + a + ']+' + step,
			forward = step + '>0',
			limitVar = createVar.call(this, 'limit'),
			pc = this.pc + sbx + 1;

		// Try to reconstruct the for loop
		var canLoop = true,
			loopVar, i;

		for (i = pc; i < this.pc; i++) {
			if (this.jumpDestinations[i] || (this.code[i] && this.code[i].indexOf('pc=') >= 0)) {
				canLoop = false;
				break;
			}
		}

		if (canLoop) {
			loopVar = 'R[' + (a + 3) + ']';
			this.code[pc - 1] = 'for(' + loopVar + '=R[' + a + '],' + limitVar + '=' + limit + ';' + forward + '?' + loopVar  + '<=' + limitVar + ':' + loopVar  + '>=' + limitVar + ';' + loopVar + '+=' + step +'){';
			delete this.jumpDestinations[this.pc];
			return '}';
		}


		// Can't reconstruct due to internal jumps, fallback to jumps...
		this.jumpDestinations[pc] = 1;
		return 'setR(R,' + a + ',' + index + ');_=' + forward + ';if((_&&R[' + a + ']<=' + limit + ')||(!_&&R[' + a + ']>=' + limit + ')){setR(R,' + (a + 3) + ',R[' + a + ']);pc=' + pc + ';break}';
	}




	function translate_forprep (a, sbx) {
		var pc = this.pc + sbx + 1;
		this.jumpDestinations[pc] = 1;

		return 'setR(R,' + a + ',R[' + a + ']-R[' + (a + 2) + ']);pc=' + pc + ';break;';
	}




	function translate_tforloop (a, b, c) {
		var fvar = createVar.call(this, 'tfor'),
			pc = this.pc + 2,
			result,
			i;

		// Try to reconstruct the for loop
		var startpc = this.pc + this._instructions[this.pc * 4 + 6] + 1,
			canLoop = true,
			loopVar, i;

		for (i = startpc + 1; i < this.pc; i++) {
			if (this.jumpDestinations[i] || (this.code[i] && this.code[i].indexOf('pc=') >= 0)) {
				canLoop = false;
				break;
			}
		}

		if (canLoop) {
			delete this.jumpDestinations[this.pc];
			this.code[this.pc + 1] = '/* noop */'

			result = 'while(1){';
			result += fvar + '=tforloop_internal(R[' + a + '],R.slice(' + (a + 1) + ',' + (a + 3) + '));';
			for (i = 0; i < c; i++) result += 'setR(R,' + (a + i + 3) + ',' + fvar + '[' + i + ']);';
			result += 'if(' + fvar + '[0]!==void 0){setR(R,' + (a + 2) + ',' + fvar + '[0])}else{break}';

			this.code[startpc] = result;
			return '}';
		}


		// Can't reconstruct due to internal jumps, fallback to jumps...
		this.jumpDestinations[pc] = 1;

		result = fvar + '=tforloop_internal(R[' + a + '],R.slice(' + (a + 1) + ',' + (a + 3) + '));';
		for (i = 0; i < c; i++) result += 'setR(R,' + (a + i + 3) + ',' + fvar + '[' + i + ']);';
		result += 'if(' + fvar + '[0]!==void 0){setR(R,' + (a + 2) + ',' + fvar + '[0])}else{pc=' + pc + ';break}';

		return result;
	}




	function translate_setlist (a, b, c) {
		return 'setlistT(R,R[' + a + '],' + (a + 1) + ',' + (50 * (c - 1) + 1) + ',' + (b == 0? 'R.length-1' : b) + ');';
	}




	function translate_close (a, b, c) {
		if (this.vars.indexOf('getupval') < 0) this.vars.push('getupval');
		return 'close_internal.call(cl,' + a + ',getupval);';
	}




	function translate_closure (a, bx) {
		var upvalueData = gc.createArray(),
			instructions = this._instructions,
			process = process,
			slice = instructions.slice || instructions.subarray,
			opcode, result;

		this.pc++;
		if (this.vars.indexOf('getupval') < 0) this.vars.push('getupval');
		if (this.vars.indexOf('setupval') < 0) this.vars.push('setupval');

		while ((opcode = instructions[this.pc * 4]) !== undefined && (opcode === 0 || opcode === 4) && this._instructions[this.pc * 4 + 1] === 0) { // move, getupval
			upvalueData.push.apply(upvalueData, slice.call(instructions, this.pc * 4, this.pc * 4 + 4));
			this.pc++;
		}

		this.pc--;

		if (upvalueData.length || typeof process == 'undefined') {
			result = 'setR(R,' + a + ',create_func(cl._functions[' + bx + '],closure_upvalues.call(cl,' + bx + ',' + JSON.stringify(upvalueData) + ',getupval,setupval),cl));';
		} else {
			result = 'setR(R,' + a + ',cl._functions[' + bx + ']);';
		}

		gc.collect(upvalueData);
		return result;
	}




	function translate_vararg (a, b) {
		var result = 'R.length=' + a + ';',
			i, l;

		if (b === 0) {
			result = 'for(_=' + this.paramCount + ';_<arguments.length;_++)setR(R,_+' + (a - this.paramCount) + ',arguments[_]);';

		} else {
			for (i = 0, l = b - 1; i < l; i++) {
				result += 'setR(R,' + (a + i) + ',arguments[' + (this.paramCount + i) + ']);';
			}
		}

		return result;
	}




	shine.jit.TRANSLATORS = [translate_move, translate_loadk, translate_loadbool, translate_loadnil, translate_getupval, translate_getglobal, translate_gettable, translate_setglobal, translate_setupval, translate_settable, translate_newtable, translate_self, translate_add, translate_sub, translate_mul, translate_div, translate_mod, translate_pow, translate_unm, translate_not, translate_len, translate_concat, translate_jmp, translate_eq, translate_lt, translate_le, translate_test, translate_testset, translate_call, translate_tailcall, translate_return, translate_forloop, translate_forprep, translate_tforloop, translate_setlist, translate_close, translate_closure, translate_vararg];




	/******************************************************************
	*  Compiler
	******************************************************************/


	/**
	 * Compiles a Moonshine function definition to a JavaScript function.
	 * @param {shine.Function} func The input Moonshine function definition.
	 * @returns {function} A JavaScript representation of the function.
	 */
	shine.jit.compile = function (func, callback) {
		if (shine.jit.MIN_FPS_TO_COMPILE) {
			var args = gc.createArray();
			args.push(func, callback);

			compileQueue.push(args);
			enableCompileTimer();

		} else {
			compile(func, callback);
		}
	};


	/**
	 * Translates a Moonshine function definition to a JavaScript function definition.
	 * @param {shine.Function} func The input Moonshine function definition.
	 * @returns {string} JavaScript source of the function.
	 */
	shine.jit.toJS = function (func) {

		var instructions = func._data.instructions,
			paramCount = func._data.paramCount,
			isVararg = func._data.is_vararg > 0,

			code = gc.createArray(),
			pc = 0,

			state,
			opcode, a, b, c,
			offset,
			compatibility,
			upvalCode = '',
			paramNames = gc.createArray(),
			func,
			result,
			i, l, v;


		// Setup state
		state = {
			paramCount: paramCount,
			isVararg: isVararg,
			stackSize: func._data.maxStackSize,

			pc: pc,
			code: gc.createArray(),
			vars: gc.createArray(),
			jumpDestinations: gc.createArray(),

			_constants: func._data.constants,
			_instructions: func._data.instructions,

			getConstant: function (index) {
				var val = this._constants[index];
				return this._constants[index] === null? void 0 : val;
			}           
		};

		state.jumpDestinations.push(1);

		// Get code representation of instructions
		l = instructions.length / 4;

		while (pc < l) {
			offset = pc * 4;
			opcode = instructions[offset];
			a = instructions[offset + 1];
			b = instructions[offset + 2];
			c = instructions[offset + 3];

			if (!state.code[pc]) state.code[pc] = shine.jit.TRANSLATORS[opcode].call(state, a, b, c);
			pc = ++state.pc;
		}


		// Insert jump entry points
		for (pc in state.jumpDestinations) {
			i = parseInt(pc, 10);
			state.code[i] = 'case ' + pc + ':' + state.code[i];
		}


		// v5.0 compatibility (LUA_COMPAT_VARARG)
		if (func._data.is_vararg == 7) {    
			compatibility =  'setR(R,' + paramCount + ',new shine.Table(Array.prototype.slice.call(arguments,' + paramCount + ')));R[' + paramCount + '].setMember("n", arguments.length-' + paramCount + ');';
		}


		// Upvalue optimisation
		if (state.vars.indexOf('getupval') >= 0) upvalCode += 'getupval=get_upv.bind(R);';
		if (state.vars.indexOf('setupval') >= 0) upvalCode += 'setupval=set_upv.bind(R);';


		// Add boilerplate
		code = ['/* ' + (func._file && func._file.url) + ":" + func._data.lineDefined + ' */', 'var cl=this,R=createArray(),pc=0,_' + (state.vars.length? ',' + state.vars.join(',') : '') + ';'];
		// for (i = 0; i < paramCount; i++) code.push('setR(R,' + i + ',arguments[' + i + ']);');
		for (i = 0; i < paramCount; i++) {
			code.push('setR(R,' + i + ',A' + i + ');');
			paramNames.push('A' + i);
		}

		if (compatibility) code.push(compatibility);
		code.push(upvalCode);
		code.push('shine.Closure._current=cl;while(1){switch(pc){');
		code = code.concat(state.code);
		code.push('}}');



		// Output JS function
		// return 'function(){' + code.join('\n') + '}';
		result = 'function(' + paramNames.join() + '){' + code.join('\n') + '}';

		gc.collect(code);
		gc.collect(paramNames);

		gc.collect(state.code);
		gc.collect(state.vars);
		gc.collect(state.jumpDestinations);

		gc.collect(state);

		return result;
	};


})(shine || {});

if (typeof module != 'undefined') module.exports = shine.jit;
