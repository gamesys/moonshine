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
 * @fileOverview Lua register class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */


'use strict';


var shine = shine || {};
shine.jit = {};




(function () {


	/******************************************************************
	*  Helpers
	******************************************************************/


	function createNumberString (last, prefix, first) { 
		prefix = '' + (prefix || '');
		var x = first || 0; 
		if (last < x) return '';
		return Array(last - x + 1).join().replace(new RegExp('','g'), function () { return prefix + x++; }); 
	}




	function formatValue (value) {
		if (typeof value == 'string') {
			value = value.replace(/\n/g, '\\n');
			value = value.replace(/'/g, '\\\'');
			return "'" + value + "'";
		}
		return value;
	}




	function createVar (prefix) {
		var key = prefix + this.pc;
		this.vars.push(key);
		return key;
	}




	/******************************************************************
	*  Translators
	******************************************************************/


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

		for (i = c - 1; i >= b; i--) items.push('R' + i);
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
			result, i, l, setupArr, limit, tos, notArrClause;

		if (b === 0) { // Arguments from R(A+1) to top
			setupArr = '_=[];for(' + fvar + '=' + (a + 1) + ';' + fvar + '<=tos;' + fvar + '++)_.push(eval("R"+' + fvar + '));';

		} else { // Arguments from R(A+1) to R(A+B-1)
			setupArr = '_=[' + createNumberString(a + b - 1, 'R', a + 1) + '];';
		}

		result = setupArr; // + 'while(_.length&&_[_.length-1]===undefined)_.pop();';
		result += cvar + '=call_internal(R' + a + ',_);';

		if (c == 1) return result;

		if (c == 0) {
			// Set registers from R(A) and set the top of stack dependent on length;
			limit = cvar + '.length';
			tos = (a - 1) + '+' + cvar + '.length';

			notArrClause = 'R' + a + '=' + cvar + ';tos=' + a;

		} else {
			// Set registers from R(A) to R(A+C-2);
		  	limit = c - 1;
		  	tos = a + c - 2;

			notArrClause = 'R' + a + '=' + cvar + ';for(_=1;_<' + limit + ';_++)eval("R"+(' + a + '+_)+"=undefined");';
		}

		result += 'if(' + cvar + ' instanceof Array){';
		result += 'for(_=0;_<' + limit + ';_++)eval("R"+(' + a + '+_)+"=' + cvar + '[_]");tos=' + tos
		result += '}else{' + notArrClause + '}';

		return result;
	}




	function translate_tailcall (a, b) {
		// TODO
		return translate_call.call(this, a, b, 0);
	}




	function translate_return (a, b) {
		var result = '',
			i;

		result = translate_close.call(this, 0);

		if (b === 0) {
			i = createVar.call(this, 'i');
			result += '_=[];for(' + i + '=' + a + ';' + i + '<=tos;' + i + '++)_.push(eval("R"+' + i + '));return _;';

		} else {
			result += 'return[' + createNumberString(a + b - 2, 'R', a) + '];';
		}

		return result;
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
		var last = b == 0? 'tos' : b,
			offset = 50 * (c - 1);
		
		return 'for(_=1;_<=' + last + ';_++)R' + a + '.setMember(' + offset + '+_,eval("R"+(' + a + '+_)));';
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

		if (b === 0) {
			result = 'for(_=' + this.paramCount + ';_<arguments.length;_++)eval("R"+(_+' + (a - this.paramCount) + ')+"=arguments[_]");tos=' + (a - this.paramCount - 1) + '+arguments.length;';

		} else {
			for (i = 0, l = this.stackSize - a; i < l; i++) {
				result += 'R' + (a + i) + '=' + (i >= b - 1? 'undefined' : 'arguments[' + (this.paramCount + i) + ']') + ';';
			}

			result += 'tos=' + (a + b - 2) + ';';
		}

		return result;
	}




	shine.jit.TRANSLATORS = [translate_move, translate_loadk, translate_loadbool, translate_loadnil, translate_getupval, translate_getglobal, translate_gettable, translate_setglobal, translate_setupval, translate_settable, translate_newtable, translate_self, translate_add, translate_sub, translate_mul, translate_div, translate_mod, translate_pow, translate_unm, translate_not, translate_len, translate_concat, translate_jmp, translate_eq, translate_lt, translate_le, translate_test, translate_testset, translate_call, translate_tailcall, translate_return, translate_forloop, translate_forprep, translate_tforloop, translate_setlist, translate_close, translate_closure, translate_vararg];




	/******************************************************************
	*  Compiler
	******************************************************************/


	shine.jit.compile = function (func) {
		var instructions = func._data.instructions,
			paramCount = func._data.paramCount,
			isVararg = func._data.is_vararg > 0,

			code = [],
			pc = 0,

			state,
			opcode, a, b, c,
			offset,
			compatibility,
			func,
			i, l;


		// Setup state
		state = {
			getConstant: shine.Closure.prototype.getConstant,
			paramCount: paramCount,
			isVararg: isVararg,
			stackSize: func._data.maxStackSize,

			pc: pc,
			code: [],
			vars: [],
			jumpDestinations: [1],

			_constants: func._data.constants,
			_instructions: func._data.instructions,
		};


		// Get code representation of instructions
		l = instructions.length / 4;

		while (pc < l) {
			offset = pc * 4;
			opcode = instructions[offset];
	 		a = instructions[offset + 1];
	 		b = instructions[offset + 2];
	 		c = instructions[offset + 3];

	 		state.code[pc] = shine.jit.TRANSLATORS[opcode].call(state, a, b, c);
	 		pc = ++state.pc;
		}


		// Insert jump entry points
		for (pc in state.jumpDestinations) {
			i = parseInt(pc, 10);
			state.code[i] = 'case ' + pc + ':' + state.code[i];
		}


		// v5.0 compatibility (LUA_COMPAT_VARARG)
		if (func._data.is_vararg == 7) {	
			var v = 'R' + paramCount;
			compatibility =  '' + v + '=new shine.Table(Array.prototype.slice.call(arguments,' + paramCount + '));' + v + '.setMember("n", arguments.length-' + paramCount + ');';
		}


		// Add boilerplate
		code = ['var cl=this,pc=0,tos,_,' + createNumberString(256, 'R') + (state.vars.length? ',' + state.vars.join(',') : '') + ';'];
		code.push(compatibility);
		code.push('shine.Closure._current=cl;while(1){switch(pc){');
		code = code.concat(state.code);
		code.push('}}');


		// Create compiled function
		return shine.operations.evaluateInScope('function(' + createNumberString(paramCount - 1, 'R') + '){' + code.join('\n') + '}');
	};




})();
