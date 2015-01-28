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

(function (shine) {

	function jsToLua (obj) {
		var t, mt;

		mt = new shine.Table({

			__index: function (t, key) {
				var property = obj[key],
					i, children, child;

				// Bind methods to object and convert args and return values
				if (typeof property == 'function' || (property && property.prototype && typeof property.prototype.constructor == 'function')) {	// KLUDGE: Safari reports native constructors as objects, not functions :-s
					var f = function () {
						var args = convertArguments(arguments, luaToJS),
							retval = property.apply(args.shift(), args);

						if (typeof retval == 'object') return jsToLua(retval);
						return [retval];
					};

					// Add static methods, etc
					if (Object.getOwnPropertyNames) {
						children = Object.getOwnPropertyNames(property);

						for (i = 0; child = children[i]; i++) {
							if (child == 'caller' || child == 'callee' || child == 'arguments') continue;	// Avoid issues in strict mode. Fixes #24. 
							f[child] = property[child];
						}
					}

					// Add a new method for instantiating classes
					f.new = function () { 
						var args = convertArguments(arguments, luaToJS),
							argStr,
							obj,
							i, l;

						argStr = (l = args.length)? 'args[0]' : '';
						for (i = 1; i < l; i++) argStr += ',args[' + i + ']';

						obj = eval('new property(' + argStr + ')');
						return jsToLua(obj);
					};

					return f;
				}

				// Recurse down properties
				if (typeof property == 'object') return jsToLua(property);

				// Return primatives as is
				return property;
			},


			__newindex: function (t, key, val) {
				obj[key] = luaToJS(val);
			}

		});

		mt.source = obj;


		t = new shine.Table();
		shine.gc.incrRef(t);

		// Return proxy table
		return shine.lib.setmetatable(t, mt);
	}




	function luaToJS (val) {
		var mt;

		// Make shine.Functions invokable
		if (val instanceof shine.Function) {
			return function () { 
				return jsToLua(val.apply(undefined, convertArguments(arguments, jsToLua)));
			};
		}

		if (val instanceof shine.Table) {
			// If object has been wrapped by jsToLua(), use original object instead
			if ((mt = shine.lib.getmetatable(val)) && mt.source) return mt.source;

			// Else iterate over table
			var isArr = shine.lib.table.getn(val) > 0,
				result = shine.gc['create' + (isArr? 'Array' : 'Object')](),
				numValues = val.__shine.numValues,
				i,
				l = numValues.length;

			for (i = 1; i < l; i++) {
				result[i - 1] = ((numValues[i] || shine.EMPTY_OBJ) instanceof shine.Table)? luaToJS(numValues[i]) : numValues[i];
			}

			for (i in val) {
				if (val.hasOwnProperty(i) && !(i in shine.Table.prototype) && i !== '__shine') {
					result[i] = ((val[i] || shine.EMPTY_OBJ) instanceof shine.Table)? luaToJS(val[i]) : val[i];
				}
			}
			
			return result;
		}


		// Convert tables to objects
		if (typeof val == 'object') return shine.utils.toObject(val);

		// return primatives as is
		return val;
	}




	function convertArguments (arguments, translateFunc) {
		var args = [], i, l;

		for (i = 0, l = arguments.length; i < l; i++) {
			args.push(translateFunc(arguments[i]));
		}

		return args;
	};




	// Create wrapped window API
	shine.DOMAPI = { window: jsToLua(window) };


	// Add expand method
	shine.DOMAPI.window.extract = function () {
		var vm = shine.getCurrentVM(),
			keys = Object.getOwnPropertyNames && Object.getOwnPropertyNames(window);

		for (var i in keys || window) {
			if (keys) i = keys[i];

			if (i !== 'print' && i !== 'window' && window[i] !== null) {
				vm.setGlobal(i, shine.DOMAPI.window.getMember(i));
			}
		}
	};


})(shine || {});
