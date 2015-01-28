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
 * @fileOverview The Moonshine Distillery. Converts Lua byte code to JSON.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */


'use strict';


var shine = shine || {};


(function () {


	var LUA_TNIL = 0,
		LUA_TBOOLEAN = 1,
		LUA_TNUMBER = 3,
		LUA_TSTRING = 4;




	function Parser () {
		this._data = null;
		this._pointer = null;
		this._tree = null;
	}




	Parser.prototype.parse = function (filename, config, callback) {
		if (callback === undefined) {
			callback = config;
			config = {};
		}

		this._runConfig = config || {};

		var me = this,
			version,
			fs;

		if (filename.substr(0, 4) == String.fromCharCode(27, 76, 117, 97)) {
			// Lua byte code string
			version = filename.charCodeAt(4).toString(16);
			if (version != '51') throw new SyntaxError('The specified file was compiled with Lua v' + version[0] + '.' + version[1] + '; Moonshine can only parse bytecode created using the Lua v5.1 compiler.');

			this._parseData(filename);
			if (callback) callback(this._tree);

			return this._tree;
		}


		// Load file
		fs = require('fs');

		fs.readFile(filename, 'binary', function (err, data) {
			if (err) throw err;

			me._parseData('' + data);
			if (callback) callback(me._tree);
		});
	}




	Parser.prototype._parseData = function (data) {
		this._data = data;
		this._pointer = 0;

		this._readGlobalHeader();	
		this._tree = this._readChunk();

		delete this._runConfig;
	};




	Parser.prototype.getTree = function () {
		return this._tree;
	};




	/* --------------------------------------------------
	 * Parse input file
	 * -------------------------------------------------- */


	Parser.prototype._readGlobalHeader = function () {

		this._config = {
			signature: this._readByte(4),
			version: this._readByte().toString(16).split('', 2).join('.'),
			formatVersion: this._readByte(),
			endianness: this._readByte(),

			sizes: {
				int: this._readByte(),
				size_t: this._readByte(),
				instruction: this._readByte(),
				number: this._readByte(),
			},
		
			integral: this._readByte()
		};	
	};




	Parser.prototype._readByte = function (length) {
		if (length === undefined) return this._data.charCodeAt(this._pointer++) & 0xFF;

		length = length || 1;
		return this._data.substr((this._pointer += length) - length, length);
	};




	Parser.prototype._readString = function () {
	
		var byte = this._readByte(this._config.sizes.size_t),
			length = 0,
			result,
			pos,
			i, l;

		if (this._config.endianness) {
			for (i = this._config.sizes.size_t - 1; i >= 0; i--) length = length * 256 + byte.charCodeAt(i);
		} else {
			for (i = 0, l = this._config.sizes.size_t; i < l; i++) length = length * 256 + byte.charCodeAt(i);
		}

		if (!length) return '';

		result = this._readByte(length);
		if (result.charCodeAt(length - 1) == 0) result = result.substr(0, length - 1);
//		pos = result.indexOf(String.fromCharCode(0));

//		if (pos >= 0) result = result.substr(0, pos);
		return result;
	};




	Parser.prototype._readInteger = function () {
		var b = this._readByte (this._config.sizes.int),
			hex = '', char,
			i, l;
	
		for (var i = 0, l = b.length; i < l; i++) {
			char = ('0' + b.charCodeAt(i).toString(16)).substr(-2);
			hex = this._config.endianness? char + hex : hex + char;
		}

		return parseInt(hex, 16);
	};




    Parser.prototype._readNumber = function () {
 
        // Double precision floating-point format
        //    http://en.wikipedia.org/wiki/Double_precision_floating-point_format
        //    http://babbage.cs.qc.edu/IEEE-754/Decimal.html
 
        var number = this._readByte(this._config.sizes.number),
            data = '';
     
        for (var i = 0, l = number.length; i < l; i++) {
            data = ('0000000' + number.charCodeAt(i).toString(2)).substr(-8) + data;    // Beware: may need to be different for other endianess
        }
 
        var sign = parseInt(data.substr(-64, 1), 2),
            exponent = parseInt(data.substr(-63, 11), 2),
            mantissa = Parser.binFractionToDec(data.substr(-52, 52), 2);
 
        if (exponent === 0) return 0;
        if (exponent === 2047) return Infinity;
 
        return Math.pow(-1, sign) * (1 + mantissa) * Math.pow(2, exponent - 1023);
    };
 
 
 
 
    Parser.binFractionToDec = function (mantissa) {
        var result = 0;
     
        for (var i = 0, l = mantissa.length; i < l; i++) {
            if (mantissa.substr(i, 1) === '1') result += 1 / Math.pow(2, i + 1);
        }
 
        return result;
    };




	Parser.prototype._readInstruction = function () {
		return this._readByte(this._config.sizes.instruction);
	};




	Parser.prototype._readConstant = function () {
		var type = this._readByte();

		switch (type) {
			case LUA_TNIL: 		return;
			case LUA_TBOOLEAN: 	return !!this._readByte ();
			case LUA_TNUMBER: 	return this._readNumber ();
			case LUA_TSTRING:	return this._readString ();

			default: throw new Error('Unknown constant type: ' + type);
		}
	};




	Parser.prototype._readInstructionList = function () {
	
		var length = this._readInteger(),
			result = [],
			index;
	
		for (index = 0; index < length; index++) result.push(this._readInstruction ());	
		return result;
	};




	Parser.prototype._readConstantList = function () {
	
		var length = this._readInteger(),
			result = [],
			index;
	
		for (index = 0; index < length; index++) result.push(this._readConstant());

		return result;
	};




	Parser.prototype._readFunctionList = function () {
	
		var length = this._readInteger(),
			result = [],
			index;

		for (index = 0; index < length; index++) result.push(this._readChunk());
		return result;
	};




	Parser.prototype._readStringList = function () {
	
		var length = this._readInteger(),
			result = [],
			index;

		for (index = 0; index < length; index++) result.push(this._readString());
		return result;
	};




	Parser.prototype._readIntegerList = function () {
	
		var length = this._readInteger(),
			result = [],
			index;

		for (index = 0; index < length; index++) result.push(this._readInteger());
		return result;
	};




	Parser.prototype._readLocalsList = function () {
	
		var length = this._readInteger(),
			result = [],
			index;

		for (index = 0; index < length; index++) {
			result.push({
				varname: this._readString(),
				startpc: this._readInteger(),
				endpc: this._readInteger()
			});
		}
	
		return result;
	};




	Parser.prototype._readChunk = function () {
	
		var result = {
			sourceName: this._readString(),
			lineDefined: this._readInteger(),
			lastLineDefined: this._readInteger(),
			upvalueCount: this._readByte(),
			paramCount: this._readByte(),
			is_vararg: this._readByte(),
			maxStackSize: this._readByte(),
			instructions: this._parseInstructions(this._readInstructionList()),
			constants: this._readConstantList(),
			functions: this._readFunctionList(),
			linePositions: this._readIntegerList(),
			locals: this._readLocalsList(),
			upvalues: this._readStringList()
		};

		if (this._runConfig.stripDebugging) {
			delete result.linePositions;
			delete result.locals;
			delete result.upvalues;
		}
	
		return result;
	};




	Parser.prototype._parseInstructions = function (instructions) {
		var result = [];
		for (var i = 0, l = instructions.length; i < l; i++) result.push.apply(result, this._parseInstruction(instructions[i]));
		return result;
	};




	Parser.prototype._parseInstruction = function (instruction) {
		var data = 0,
			result = [0, 0, 0, 0],
			i, l;
	
		if (this._config.endianness) {
			for (i = instruction.length; i >= 0; i--) data =  (data << 8) + instruction.charCodeAt(i);
		} else {
			for (i = 0, l = instruction.length; i < l; i++) data = (data << 8) + instruction.charCodeAt(i);
		}

		result[0] = data & 0x3f;
		result[1] = data >> 6 & 0xff;

		switch (result[0]) {
		
			// iABx
			case 1: //loadk
			case 5: //getglobal
			case 7: //setglobal
			case 36: //closure
				result[2] = data >> 14 & 0x3fff;
				break;

			// iAsBx
			case 22: //jmp
			case 31: //forloop
			case 32: //forprep
				result[2] = (data >>> 14) - 0x1ffff;
				break;
					
			// iABC
			default:
				result[2] = data >> 23 & 0x1ff;
				result[3] = data >> 14 & 0x1ff;
		}
	
		if (!this._runConfig.useInstructionObjects) return result;

		// Old file format for backward compatibility:
		return [{
			op: result[0],
			A: result[1],
			B: result[2],
			C: result[3]
		}];
	};




	shine.distillery = {
		Parser: Parser
	};


})();




if (typeof module != 'undefined') module.exports = shine.distillery;

