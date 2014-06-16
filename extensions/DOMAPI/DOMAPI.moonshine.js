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
