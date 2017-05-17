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
 * @fileOverview The Lua standard library.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */


'use strict';


(function (shine) {

	var RANDOM_MULTIPLIER = 16807,
		RANDOM_MODULUS = 2147483647,

		ROSETTA_STONE = {
			'([^a-zA-Z0-9%(])-': '$1*?',
	        '(.)-([^a-zA-Z0-9?])': '$1*?$2',
			'(.)-$': '$1*?',
			'%a': '[a-zA-Z]',
			'%A': '[^a-zA-Z]',
			'%c': '[\x00-\x1f]',
			'%C': '[^\x00-\x1f]',
			'%d': '\\d',
			'%D': '[^\d]',
			'%l': '[a-z]',
			'%L': '[^a-z]',
			'%p': '[\.\,\"\'\?\!\;\:\#\$\%\&\(\)\*\+\-\/\<\>\=\@\[\]\\\^\_\{\}\|\~]',
			'%P': '[^\.\,\"\'\?\!\;\:\#\$\%\&\(\)\*\+\-\/\<\>\=\@\[\]\\\^\_\{\}\|\~]',
			'%s': '[ \\t\\n\\f\\v\\r]',
			'%S': '[^ \t\n\f\v\r]',
			'%u': '[A-Z]',
			'%U': '[^A-Z]',
			'%w': '[a-zA-Z0-9]',
			'%W': '[^a-zA-Z0-9]',
			'%x': '[a-fA-F0-9]',
			'%X': '[^a-fA-F0-9]',
			'%([^a-zA-Z])': '\\$1'
		},

		DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
		
		MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
		
		DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
				
		DATE_FORMAT_HANDLERS = {
			'%a': function (d, utc) { return DAYS[d['get' + (utc? 'UTC' : '') + 'Day']()].substr(0, 3); },
			'%A': function (d, utc) { return DAYS[d['get' + (utc? 'UTC' : '') + 'Day']()]; },
			'%b': function (d, utc) { return MONTHS[d['get' + (utc? 'UTC' : '') + 'Month']()].substr(0, 3); },
			'%B': function (d, utc) { return MONTHS[d['get' + (utc? 'UTC' : '') + 'Month']()]; },
			'%c': function (d, utc) { return d['to' + (utc? 'UTC' : '') + 'LocaleString'](); },
			'%d': function (d, utc) { return ('0' + d['get' + (utc? 'UTC' : '') + 'Date']()).substr(-2); },
			'%H': function (d, utc) { return ('0' + d['get' + (utc? 'UTC' : '') + 'Hours']()).substr(-2); },
			'%I': function (d, utc) { return ('0' + ((d['get' + (utc? 'UTC' : '') + 'Hours']() + 11) % 12 + 1)).substr(-2); },
			'%j': function (d, utc) {
				var result = d['get' + (utc? 'UTC' : '') + 'Date'](),
					m = d['get' + (utc? 'UTC' : '') + 'Month']();
					
				for (var i = 0; i < m; i++) result += DAYS_IN_MONTH[i];
				if (m > 1 && d['get' + (utc? 'UTC' : '') + 'FullYear']() % 4 === 0) result +=1;

				return ('00' + result).substr(-3);
			},
			'%m': function (d, utc) { return ('0' + (d['get' + (utc? 'UTC' : '') + 'Month']() + 1)).substr(-2); },
			'%M': function (d, utc) { return ('0' + d['get' + (utc? 'UTC' : '') + 'Minutes']()).substr(-2); },
			'%p': function (d, utc) { return (d['get' + (utc? 'UTC' : '') + 'Hours']() < 12)? 'AM' : 'PM'; },
			'%S': function (d, utc) { return ('0' + d['get' + (utc? 'UTC' : '') + 'Seconds']()).substr(-2); },
			'%U': function (d, utc) { return getWeekOfYear(d, 0, utc); },
			'%w': function (d, utc) { return '' + (d['get' + (utc? 'UTC' : '') + 'Day']()); },
			'%W': function (d, utc) { return getWeekOfYear(d, 1, utc); },
			'%x': function (d, utc) { return DATE_FORMAT_HANDLERS['%m'](d, utc) + '/' + DATE_FORMAT_HANDLERS['%d'](d, utc) + '/' + DATE_FORMAT_HANDLERS['%y'](d, utc); },
			'%X': function (d, utc) { return DATE_FORMAT_HANDLERS['%H'](d, utc) + ':' + DATE_FORMAT_HANDLERS['%M'](d, utc) + ':' + DATE_FORMAT_HANDLERS['%S'](d, utc); },
			'%y': function (d, utc) { return DATE_FORMAT_HANDLERS['%Y'](d, utc).substr (-2); },
			'%Y': function (d, utc) { return '' + d['get' + (utc? 'UTC' : '') + 'FullYear'](); },
			'%Z': function (d, utc) { var m; return (utc && 'UTC') || ((m = d.toString().match(/[A-Z][A-Z][A-Z]/)) && m[0]); },
			'%%': function () { return '%' }
		},


		randomSeed = 1,
		stringMetatable;




	function getRandom () {
		randomSeed = (RANDOM_MULTIPLIER * randomSeed) % RANDOM_MODULUS;
		return randomSeed / RANDOM_MODULUS;
	}




	function getVM (context) {
		if (context && context instanceof shine.VM) return context;

		var vm = shine.getCurrentVM();
		if (!vm) throw new shine.Error("Can't call library function without passing a VM object as the context");

		return vm;
	}




	function ipairsIterator (table, index) {
		if (index === undefined) throw new shine.Error('Bad argument #2 to ipairs() iterator');

		var nextIndex = index + 1,
			numValues = table.__shine.numValues;

		if (!numValues.hasOwnProperty(nextIndex) || numValues[nextIndex] === void 0) return void 0;
		return [nextIndex, numValues[nextIndex]];
	}
	



	function getWeekOfYear (d, firstDay, utc) { 
		var dayOfYear = parseInt(DATE_FORMAT_HANDLERS['%j'](d), 10),
			jan1 = new Date(d.getFullYear (), 0, 1, 12),
			offset = (8 - jan1['get' + (utc? 'UTC' : '') + 'Day']() + firstDay) % 7;

		return ('0' + (Math.floor((dayOfYear - offset) / 7) + 1)).substr(-2);
	}




	function translatePattern (pattern) {
		// TODO Add support for balanced character matching (not sure this is easily achieveable).
		pattern = '' + pattern;

		var n = 0,
			i, l, character, addSlash;
					
		for (i in ROSETTA_STONE) if (ROSETTA_STONE.hasOwnProperty(i)) pattern = pattern.replace(new RegExp(i, 'g'), ROSETTA_STONE[i]);
		l = pattern.length;

		for (i = 0; i < l; i++) {
			character = pattern.substr(i, 1);
			addSlash = false;

			if (character == '[') {
				if (n) addSlash = true;
				n++;

			} else if (character == ']') {
				n--;
				if (n) addSlash = true;
			}

			if (addSlash) {
				// pattern = pattern.substr(0, i) + '\\' + pattern.substr(i++);
				pattern = pattern.substr(0, i) + pattern.substr(i++ + 1);
				l++;
			}
		}			

		return pattern;	
	}
	



	function loadfile (filename, callback) {
		var vm = getVM(this),
			file,
			pathData;

		vm.fileManager.load(filename, function (err, file) {
			if (err) {
				vm._trigger('module-load-error', [file, err]);

				if (err == 404 && /\.lua$/.test(filename)) {
					loadfile.call(vm, filename + '.json', callback);
				} else {
					callback();
				}

				return;
			}

			var func = new shine.Function(vm, file, file.data, vm._globals);
			vm._trigger('module-loaded', [file, func]);
			
			callback(func);
		});

		vm._trigger('loading-module', filename);
	}




	shine.lib = {
	
		
		assert: function (v, m) {
			if (v === false || v === undefined) throw new shine.Error(m || 'Assertion failed!');
			return [v, m];
		},
	
	
	
	
		collectgarbage: function (opt, arg) {
			// Unimplemented
		},
	
	
	
	
		dofile: function (filename) {
			// Unimplemented
		},
		
		
		
		
		error: function (message) {	
			throw new shine.Error(message);
		},
	
	
	
		
		getfenv: function (f) {
			// Unimplemented
		},
		
		
		
		
		/**
		 * Implementation of Lua's getmetatable function.
		 * @param {object} table The table from which to obtain the metatable.
		 */
		getmetatable: function (table) {
			var mt;

			if (table instanceof shine.Table) {
				if ((mt = table.__shine.metatable) && (mt = mt.__metatable)) return mt;
				return table.__shine.metatable;

			} else if (typeof table == 'string') {
				return stringMetatable;
			}
		},
		
	
	
	
		ipairs: function (table) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in ipairs(). Table expected');
			return [ipairsIterator, table, 0];
		},
	
	
	
		
		load: function (func, chunkname) {
			var vm = getVM(this),
				chunk = '', piece, lastPiece;

			while ((piece = func.apply(func)) && (piece = piece[0])) {
				chunk += (lastPiece = piece);
			}

			return shine.lib.loadstring.call(vm, chunk);
		},
	
	
	
		
		loadfile: function (filename) {
			var vm = getVM(this),
				callback = function (result) {
					vm.resume(result || []);
				};

			vm.suspend();
			loadfile.call(vm, filename, callback);
		},
	
	
	
		
		loadstring: function (string, chunkname) {
			var vm = getVM(this);
			
			if (typeof string != 'string') throw new shine.Error('bad argument #1 to \'loadstring\' (string expected, got ' + shine.utils.coerce(string, 'string') + ')');
			if (!string) return new shine.Function(vm);

			vm.suspend();

			vm.fileManager.load(string, function (err, file) {
				if (err) {
					vm.resume([]);
					return;
				}

				var func = new shine.Function(vm, file, file.data, vm._globals, shine.gc.createArray());
				vm.resume([func]);
			});
		},
	
	
			
	
		/**
		 * Implementation of Lua's next function.
		 * @param {object} table The table that will receive the metatable.
		 * @param {object} index Index of the item to return.
		 */
		next: function (table, index) {	
			// SLOOOOOOOW...
			var found = (index === undefined),
				numValues = table.__shine.numValues,
				keys,
				key, value,
				i, l;

			if (found || (typeof index == 'number' && index > 0 && index == index >> 0)) {
				if ('keys' in Object) {
					// Use Object.keys, if available.
					keys = Object['keys'](numValues);
					
					if (found) {
						// First pass
						i = 1;

					} else if (i = keys.indexOf('' + index) + 1) {
						found = true;
					} 

					if (found) {
						while ((key = keys[i]) !== void 0 && (value = numValues[key]) === void 0) i++;
						if (value !== void 0) return [key >>= 0, value];
					}

				} else {
					// Else use for-in (faster than for loop on tables with large holes)

					for (l in numValues) {	
						i = l >> 0;

						if (!found) {
							if (i === index) found = true;
			
						} else if (numValues[i] !== undefined) {
							return [i, numValues[i]];
						}
					}
				}
			}
			
			for (i in table) {
				if (table.hasOwnProperty(i) && !(i in shine.Table.prototype) && i !== '__shine') {
					if (!found) {
						if (i == index) found = true;
	
					} else if (table.hasOwnProperty(i) && table[i] !== undefined && ('' + i).substr(0, 2) != '__') {
						return [i, table[i]];
					}
				}
			}
	
			for (i in table.__shine.keys) {
				if (table.__shine.keys.hasOwnProperty(i)) {
					var key = table.__shine.keys[i];
	
					if (!found) {
						if (key === index) found = true;
		
					} else if (table.__shine.values[i] !== undefined) {
						return [key, table.__shine.values[i]];
					}
				}
			}
		
			return shine.gc.createArray();
		},
	
	
	
	
		/**
		 * Implementation of Lua's pairs function.
		 * @param {object} table The table to be iterated over.
		 */
		pairs: function (table) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in pairs(). Table expected');
			return [shine.lib.next, table];
		},
	
		
	
	
		pcall: function (func) {
			var args = shine.gc.createArray(),
				result;
				
			for (var i = 1, l = arguments.length; i < l; i++) args.push (arguments[i]);
	
			try {			
				if (typeof func == 'function') {
					result = func.apply(null, args);
					
				} else if ((func || shine.EMPTY_OBJ) instanceof shine.Function) {
					result = func.apply(null, args, true);

				} else {
					throw new shine.Error('Attempt to call non-function');
				}
	
			} catch (e) {
				return [false, e && e.message || e];
			}
			
			if (!((result || shine.EMPTY_OBJ) instanceof Array)) result = [result];
			result.unshift(true);
			
			return result;
		},
	

		
	
		print: function () {
			var output = shine.gc.createArray(),
				item;
			
			for (var i = 0, l = arguments.length; i< l; i++) {
				output.push(shine.lib.tostring(arguments[i]));
			}
	
			return shine.stdout.write(output.join('\t'));
		},
	
	
	
	
		rawequal: function (v1, v2) {
			return (v1 === v2);
		},
	
	
	
	
		rawget: function (table, index) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in rawget(). Table expected');
			return table[index];
		},
	
	
	
	
		rawset: function (table, index, value) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in rawset(). Table expected');
			if (index == undefined) throw new shine.Error('Bad argument #2 in rawset(). Nil not allowed');
	
			table[index] = value;
			return table;
		},
	



		require: function (modname) {
			var vm = getVM(this),
				packageLib = vm._globals['package'],
				current = shine.Closure._current,
				module,
				preload,
				paths,
				path,
				filename, 
				data,
				failedPaths = shine.gc.createArray();


			function curryLoad (func) {
				return function () {
					return load(func);
				}
			};


			function load (preloadFunc) {
				var result;

				if (vm._resumeStack.length) {
					result = vm._resumeStack.pop()._run();

				} else if (shine.debug && shine.debug._resumeStack && shine.debug._resumeStack.length) {
					result = shine.debug._resumeStack.pop()._run();

				} else {
					packageLib.loaded[modname] = true;
					result = preloadFunc.call(null, modname);
				}

				if (vm._status == shine.SUSPENDING && !result) {
					current._pc--;
					vm._resumeStack.push(curryLoad(preloadFunc));
					return;

				} else if (shine.debug && shine.debug._status == shine.SUSPENDING && !result) {
					current._pc--;
					shine.debug._resumeStack.push(curryLoad(preloadFunc));
					return;
				}
		

				if (!result) return;
				module = result[0];

				if (module !== undefined) packageLib.loaded.setMember(modname, module);
				return packageLib.loaded[modname];
			}

			modname = shine.utils.coerceToString(modname);
			if (module = packageLib.loaded[modname]) return module;
			if (preload = packageLib.preload[modname]) return load(preload);

			filename = modname.replace(/\./g, "/") + '.lua.json';
			data = vm.fileManager._cache[filename];

			if (data) {
				var file = new shine.File(filename, data);
				preload = new shine.Function(vm, file, file.data, vm._globals);
				packageLib.preload[modname] = preload;
				return load(preload);
			}

			paths = packageLib.path.replace(/;;/g, ';').split(';');
			vm.suspend();


			function loadNextPath () {
				path = paths.shift();

				if (!path) {
					throw new shine.Error('module \'' + modname + '\' not found:' + '\n	no field package.preload[\'' + modname + '\']\n' + failedPaths.join('\n'));
			
				} else {
					path = path.replace(/\?/g, modname.replace(/\./g, '/'));

					loadfile.call(vm, path, function (preload) {

						if (preload) {
							packageLib.preload[modname] = preload;
							shine.Closure._current._pc--;
							vm.resume();

						} else {
							failedPaths.push('	no file \'' + path + '\'');
							loadNextPath();
						}
					});
				}
			}

			loadNextPath();
		},	
	


	
		select: function (index) {
			var args = shine.gc.createArray();
			
			if (index == '#') {
				return arguments.length - 1;
				
			} else if (index = parseInt(index, 10)) {
				return arguments.constructor === Array? arguments.slice(index) : Array.prototype.slice.call(arguments, index);
				
			} else {
				throw new shine.Error('bad argument #1 in select(). Number or "#" expected');
			}
		},
		
	
		
		
		/**
		 * Implementation of Lua's setmetatable function.
		 * @param {object} table The table that will receive the metatable.
		 * @param {object} metatable The metatable to attach.
		 */
		setmetatable: function (table, metatable) {
			var mt;

			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in setmetatable(). Table expected');	
			if (!(metatable === undefined || (metatable || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #2 in setmetatable(). Nil or table expected');	
			if ((mt = table.__shine.metatable) && (mt = mt.__metatable)) throw new shine.Error('cannot change a protected metatable');

			shine.gc.incrRef(metatable);
			shine.gc.decrRef(table.__shine.metatable);

			table.__shine.metatable = metatable;

			return table;
		},
		
	
	
		
		tonumber: function (e, base) {
			var match, chars, pattern;

			if (e === '') return;
             
            base = base || 10;

			if (base < 2 || base > 36) throw new shine.Error('bad argument #2 to tonumber() (base out of range)');
			if (base == 10 && (e === Infinity || e === -Infinity || (typeof e == 'number' && window.isNaN(e)))) return e;

			if (base != 10 && e == undefined) throw new shine.Error('bad argument #1 to \'tonumber\' (string expected, got nil)');
            e = ('' + e).replace(/^\s+|\s+$/g, '');    // Trim

            // If using base 10, use normal coercion.
			if (base == 10) return shine.utils.coerceToNumber(e);

			e = shine.utils.coerceToString(e);

            // If using base 16, ingore any "0x" prefix
			if (base == 16 && (match = e.match(/^(\-)?0[xX](.+)$/))) e = (match[1] || '') + match[2];

			chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
			pattern = new RegExp('^[' + chars.substr(0, base) + ']*$', 'gi');

			if (!pattern.test(e)) return;	// Invalid
			return parseInt(e, base);
		},
		
		
		
		
		tostring: function (e) {
			var mt, mm;

			if (e !== undefined && e instanceof shine.Table && (mt = e.__shine.metatable) && (mm = mt.getMember('__tostring'))) return mm.call(mm, e);

			if (e && (e instanceof shine.Table || e instanceof shine.Function)) return e.toString();
			if (typeof e == 'function') return 'function: [host code]';

			return shine.utils.coerceToString(e) || 'userdata';
		},
		
		
		
		
		type: function (v) {
			var t = typeof v;
	
			switch (t) {
				case 'undefined': 
					return 'nil';
				
				case 'number': 
				case 'string': 
				case 'boolean': 
				case 'function': 
					return t;
				 
				case 'object': 
					if (v.constructor === shine.Table) return 'table';
					if ((v || shine.EMPTY_OBJ) instanceof shine.Function) return 'function';
				
					return 'userdata';
			}
		},
		
		
	
		unpack: function (table, i, j) {
			// v5.2: shine.warn ('unpack is deprecated. Use table.unpack instead.');
			return shine.lib.table.unpack(table, i, j);
		},
		
		
		
		
		_VERSION: 'Lua 5.1',
		
		
		
		
		xpcall: function (func, err) {
			var result, success, invalid;
				
			try {
				if (typeof func == 'function') {
					result = func.apply();
					
				} else if ((func || shine.EMPTY_OBJ) instanceof shine.Function) {
					result = func.apply(null, undefined, true);

				} else {
					invalid = true;
				}

				success = true;
				
			} catch (e) {
				result = err.apply(null, undefined, true);
				if (((result || shine.EMPTY_OBJ) instanceof Array)) result = result[0];
	
				success = false;
			}

			if (invalid) throw new shine.Error('Attempt to call non-function');
			
			if (!((result || shine.EMPTY_OBJ) instanceof Array)) result = [result];
			result.unshift(success);
			
			return result;
		}
	
	
	};
	
	
	
	
	shine.lib.coroutine = new shine.Table({

		
		create: function (closure) {
			//return new shine.Coroutine (closure);
			return shine.Coroutine.create(closure);
		},
		
		
		
		
		resume: function (thread) {
			if (arguments.length < 2) return thread.resume.call(thread);

			var args = shine.gc.createArray();
			for (var i = 1, l = arguments.length; i < l; i++) args.push(arguments[i]);	

			return thread.resume.apply(thread, args);
		},
		
		
		
		
		running: function () {
			var vm = getVM(this);
			return vm._coroutineRunning;
		},
		
	
		
		
		status: function (co) {
			switch (co.status) {
				case shine.RUNNING: return (co === getVM()._coroutineRunning)? 'running' : 'normal';
				case shine.SUSPENDED: return 'suspended';
				case shine.DEAD: return 'dead';
			}
		},
		
	
		
		
		wrap: function (closure) {
			var co = shine.lib.coroutine.create(closure),
				vm = getVM(this);
			
			var result = function () {			
				var args = [co];
				for (var i = 0, l = arguments.length; i < l; i++) args.push(arguments[i]);	
	
				var retvals = shine.lib.coroutine.resume.apply(null, args),
					success;

				if (!retvals && (vm._status == shine.SUSPENDING || (shine.debug && shine.debug._status == shine.SUSPENDING))) return;
				success = retvals.shift();
					
				if (success) return retvals;
				throw retvals[0];
			};
			
			result._coroutine = co;
			return result;
		},
		
	
		
		
		yield: function () {
			var running = getVM()._coroutineRunning,
				args;

			// If running in main thread, throw error.
			if (!running) throw new shine.Error('attempt to yield across metamethod/C-call boundary (not in coroutine)');
			if (running.status != shine.RUNNING) throw new shine.Error('attempt to yield non-running coroutine in host');

			args = shine.gc.createArray();
			for (var i = 0, l = arguments.length; i < l; i++) args.push(arguments[i]);	
	
			running._yieldVars = args;
			running.status = shine.SUSPENDING;

			return {
				resume: function () {
					var args = [running],
						i, 
						l = arguments.length,
						f = function () { 
							shine.lib.coroutine.resume.apply(undefined, args); 
						};

					if (arguments.length == 1 && arguments[0] === undefined) l = 0;
					for (i = 0; i < l; i++) args.push(arguments[i]);

					if (running.status == shine.SUSPENDING) {
						window.setTimeout(f, 1);
					} else {
						f();
					}
				}
			}
		}
			
	});


	

	shine.lib.debug = new shine.Table({

		debug: function () {
			// Not implemented
		},


		getfenv: function (o) {
			// Not implemented
		},


		gethook: function (thread) {
			// Not implemented
		},


		getinfo: function (thread, func, what) {
			// Not implemented
		},


		getlocal: function (thread, level, local) {
			// Not implemented
		},


		getmetatable: function (object) {
			// Not implemented
		},


		getregistry: function () {
			// Not implemented
		},


		getupvalue: function (func, up) {
			// Not implemented
		},


		setfenv: function (object, table) {
			// Not implemented
		},


		sethook: function (thread, hook, mask, count) {
			// Not implemented
		},


		setlocal: function (thread, level, local, value) {
			// Not implemented
		},


		setmetatable: function (object, table) {
			// Not implemented
		},


		setupvalue: function (func, up, value) {
			// Not implemented
		},


		traceback: function (thread, message, level) {
			// Not implemented
		}
	});




	shine.lib.io = new shine.Table({
		

		close: function (file) {
			if (file) throw new shine.Error('File operations currently not supported.');
			// Default behaviour: Do nothing.
		},




		flush: function () {
			// Default behaviour: Do nothing.
			// TODO: shine.stdout.flush(); // ??
		},




		input: function (file) {
			throw new shine.Error('File operations currently not supported.');
		},




		lines: function (filename) {
			throw new shine.Error('File operations currently not supported.');
		},




		open: function (filename) {
			throw new shine.Error('File operations currently not supported.');
		},




		output: function (file) {
			throw new shine.Error('File operations currently not supported.');
		},




		popen: function (prog, mode) {
			throw new shine.Error('File operations currently not supported.');
		},




		read: function () {
			throw new shine.Error('File operations currently not supported.');
		},




		stderr: {},	// Userdata
		stdin: {},
		stdout: {},




		tmpfile: function () {
			throw new shine.Error('File operations currently not supported.');
		},




		'type': function () {
			// Return nil
		},




		write: function () {
			var i, arg, output = '';
			
			for (var i in arguments) {
				if (arguments.hasOwnProperty(i)) {
					output += shine.utils.coerceToString(arguments[i], 'bad argument #' + i + ' to \'write\' (string expected, got %type)');
				}
			}
			
			shine.stdout.write(output);
		}
		
		
	});
	
	
	
		
	shine.lib.math = new shine.Table({
	
	
		abs: function (x) {
			return Math.abs(x);
		},
		
		
		
		
		acos: function (x) {
			return Math.acos(x);
		},
		
		
		
		
		asin: function (x) {
			return Math.asin(x);
		},
		
		
		
		
		atan: function (x) {
			return Math.atan(x);
		},
		
		
		
		
		atan2: function (y, x) {
			return Math.atan2(y, x);
		},
		
		
		
		
		ceil: function (x) {
			return Math.ceil(x);
		},
		
		
		
		
		cos: function (x) {
			return Math.cos(x);
		},
		
		
		
		
		cosh: function (x) {
			var e = shine.lib.math.exp;
			return (e(x) + e(-x)) / 2;
		},
		
		
		
		
		deg: function (x) {
			return x * 180 / Math.PI;
		},
		
		
		
		
		exp: function (x) {
			return Math.exp(x);
		},
		
		
		
		
		floor: function (x) {
			return Math.floor(x);
		},
		
		
		
		
		fmod: function (x, y) {
			return x % y;
		},
		
		
		
		
		frexp: function (x) {
			var delta, exponent, mantissa;
			if (x == 0) return [0, 0];

			delta = x > 0? 1 : -1;
			x = x * delta;
			
			exponent = Math.floor(Math.log(x) / Math.log(2)) + 1;
			mantissa = x / Math.pow(2, exponent);

			return [mantissa * delta, exponent];
		},
		
		
		
		
		huge: Infinity,
		
		
		
		
		ldexp: function (m, e) {
			return m * Math.pow(2, e);
		},
		
		
		
		
		log: function (x, base) {
			var result = Math.log(x);
			if (base !== undefined) return result / Math.log(base);
			return result;
		},
		
		
		
		
		log10: function (x) {
			// v5.2: shine.warn ('math.log10 is deprecated. Use math.log with 10 as its second argument instead.');
			return Math.log(x) / Math.log(10);
		},
		
		
		
		
		max: function () {
			return Math.max.apply(Math, arguments);
		},
		
		
		
		
		min: function () {
			return Math.min.apply(Math, arguments);
		},
		
		
		
		
		modf: function (x) {
			var intValue = Math.floor(x),
				mantissa = x - intValue;
			return [intValue, mantissa];
		},
		
		
		
		
		pi: Math.PI,
		
		
		
		
		pow: function (x, y) {
			var coerceToNumber = shine.utils.coerceToNumber;
			x = coerceToNumber(x, "bad argument #1 to 'pow' (number expected)")
			y = coerceToNumber(y, "bad argument #2 to 'pow' (number expected)")
			return Math.pow(x, y);
		},
		
		
		
		
		rad: function (x) {
			x = shine.utils.coerceToNumber(x, "bad argument #1 to 'rad' (number expected)")
			return (Math.PI / 180) * x;
		},
	
	
	
	
		/**
		 * Implementation of Lua's math.random function.
		 */
		random: function (min, max) {
			if (min === undefined && max === undefined) return getRandom();
	
	
			if (typeof min !== 'number') throw new shine.Error("bad argument #1 to 'random' (number expected)");
	
			if (max === undefined) {
				max = min;
				min = 1;
	
			} else if (typeof max !== 'number') {
				throw new shine.Error("bad argument #2 to 'random' (number expected)");
			}
	
			if (min > max) throw new shine.Error("bad argument #2 to 'random' (interval is empty)");
			return Math.floor(getRandom() * (max - min + 1) + min);
		},
	
	
	
	
		randomseed: function (x) {
			if (typeof x !== 'number') throw new shine.Error("bad argument #1 to 'randomseed' (number expected)");
			randomSeed = x;
		},
	
	
	
		
		sin: function (x) {
			return Math.sin(x);
		},
	
	
	
		
		sinh: function (x) {
			var e = shine.lib.math.exp;
			return (e(x) - e(-x)) / 2;
		},
	
	
	
		
		sqrt: function (x) {
			return Math.sqrt(x);
		},
	
	
	
		
		tan: function (x) {
			return Math.tan(x);
		},
	
	
	
		
		tanh: function (x) {
			var e = shine.lib.math.exp;
			return (e(x) - e(-x))/(e(x) + e(-x));
		}
	
		
	});
	
	

	
	shine.lib.os = new shine.Table({
	
	
		clock: function () {
			// Not implemented
		},
	
	
	
	
		date: function (format, time) {
			if (format === undefined) format = '%c';
			
			var utc,
				date = new Date();
	
			if (time) date.setTime(time * 1000);

			if (format.substr(0, 1) === '!') {
				format = format.substr(1);
				utc = true;
			}
	
			if (format === '*t') {
				var isDST = function (d) {
					var year = d.getFullYear(),
						jan = new Date(year, 0);
						
					// ASSUMPTION: If the time offset of the date is the same as it would be in January of the same year, DST is not in effect.
					return (d.getTimezoneOffset() !== jan.getTimezoneOffset());
				};
				
				return new shine.Table ({
					year: parseInt(DATE_FORMAT_HANDLERS['%Y'](date, utc), 10),
					month: parseInt(DATE_FORMAT_HANDLERS['%m'](date, utc), 10),
					day: parseInt(DATE_FORMAT_HANDLERS['%d'](date, utc), 10),
					hour: parseInt(DATE_FORMAT_HANDLERS['%H'](date, utc), 10),
					min: parseInt(DATE_FORMAT_HANDLERS['%M'](date, utc), 10),
					sec: parseInt(DATE_FORMAT_HANDLERS['%S'](date, utc), 10),
					wday: parseInt(DATE_FORMAT_HANDLERS['%w'](date, utc), 10) + 1,
					yday: parseInt(DATE_FORMAT_HANDLERS['%j'](date, utc), 10),
					isdst: isDST(date, utc)
				});	
			}
	
	
			for (var i in DATE_FORMAT_HANDLERS) {
				if (DATE_FORMAT_HANDLERS.hasOwnProperty(i) && format.indexOf(i) >= 0) format = format.replace(i, DATE_FORMAT_HANDLERS[i](date, utc));
			}
			
			return format;
		},
	
	
	
	
		difftime: function (t2, t1) {
			return t2 - t1;
		},
	
	
	
	
		execute: function () {
			if (arguments.length) throw new shine.Error('shell is not available. You should always check first by calling os.execute with no parameters');
			return 0;
		},
	
	
	
	
		exit: function (code) {
			throw new shine.Error('Execution terminated [' + (code || 0) + ']');
		},
	
	
	
	
		getenv: function () {
			// Not implemented
		},
	
	
	
	
		remove: function () {
			// Not implemented
		},
	
	
	
	
		rename: function () {
			// Not implemented
		},
	
	
	
	
		setlocale: function () {
			// Not implemented
		},
	
	
	
	
		/**
		 * Implementation of Lua's os.time function.
		 * @param {object} table The table that will receive the metatable.
		 */
		time: function (table) {
			var time;
			
			if (!table) {
				time = Date['now']? Date['now']() : new Date().getTime();
				
			} else {
				var day, month, year, hour, min, sec;
				
				if (!(day = table.getMember('day'))) throw new shine.Error("Field 'day' missing in date table");
				if (!(month = table.getMember('month'))) throw new shine.Error("Field 'month' missing in date table");
				if (!(year = table.getMember('year'))) throw new shine.Error("Field 'year' missing in date table");
				hour = table.getMember('hour') || 12;
				min = table.getMember('min') || 0;
				sec = table.getMember('sec') || 0;
				
				if (table.getMember('isdst')) hour--;
				time = new Date(year, month - 1, day, hour, min, sec).getTime();
			}
			
			return Math.floor(time / 1000);
		},
	
	
	
	
		tmpname: function () {
			// Not implemented
		}
	
			
	});




	shine.lib['package'] = new shine.Table({

		cpath: undefined,


		loaded: new shine.Table(),


		loadlib: function (libname, funcname) {
			// Not implemented
		},


		path: '?.lua.json;?.json;modules/?.lua.json;modules/?.json;modules/?/?.lua.json;modules/?/index.lua.json',


		preload: {},


		seeall: function (module) {
			var vm = getVM(this),
				mt = new shine.Table();

			mt.setMember('__index', vm._globals);
			shine.lib.setmetatable(module, mt);
		}
		
	});




	shine.lib.string = new shine.Table({
		
		
		'byte': function (s, i, j) {
			i = i || 1;
			j = j || i;
			
			var result = shine.gc.createArray(),
				length = s.length,
				index;
			
			for (index = i; index <= length && index <= j ; index++) result.push(s.charCodeAt(index - 1) || undefined);
			return result;
		},
		
		
		
		
		'char': function () {
			var result = '';
			for (var i = 0, l = arguments.length; i < l; i++) result += String.fromCharCode(arguments[i]);
	
			return result;			
		},
		
		
		
		
		dump: function (func) {
			var data = func._data,
				result = shine.gc.createObject(),
				arr = shine.gc.createArray(),
				i;

			for (i in data) {
				if (data.hasOwnProperty(i)) result[i] = data[i];
			}

			// Convert typed array to standard Array...
			arr.push.apply(arr, result.instructions);
			result.instructions = arr;

			return JSON.stringify(result);
		},
		
		
		
		
		find: function (s, pattern, init, plain) {
			if (typeof s != 'string' && typeof s != 'number') throw new shine.Error("bad argument #1 to 'find' (string expected, got " + typeof s + ")");
			if (typeof pattern != 'string' && typeof pattern != 'number') throw new shine.Error("bad argument #2 to 'find' (string expected, got " + typeof pattern + ")");

			s = '' + s;
			init = init || 1;

			var index, reg, match, result;

			// Regex
			if (plain === undefined || !plain) {
				pattern = translatePattern(pattern);
				reg = new RegExp(pattern);
				index = s.substr(init - 1).search(reg);
				
				if (index < 0) return;
				
				match = s.substr(init - 1).match(reg);
				result = [index + init, index + init + match[0].length - 1];

				match.shift();
				return result.concat(match);
			}
			
			// Plain
			index = s.indexOf(pattern, init - 1);
			return (index === -1)? undefined : [index + 1, index + pattern.length];
		},
		
		
		
		
		format: function (formatstring) {
			var FIND_PATTERN = /^((.|\s)*?)(%)((.|\s)*)$/,
				PARSE_PATTERN = /^(%?)([+\-#\ 0]*)(\d*)(\.(\d*))?([cdeEfgGiouqsxX])((.|\s)*)$/,
				findData,
				result = '',
				parseData,
				args = arguments.constructor === Array? arguments : Array.prototype.slice.call(arguments, 0),
				argIndex = 2,
				index = 2;

			args.shift();


			function parseMeta(parseData) {
				var flags = parseData[2],
					precision = parseInt(parseData[5]);

				if (('' + flags).length > 5) throw new shine.Error('invalid format (repeated flags)');
				if (!precision && precision !== 0) precision = Infinity;

				return {
					showSign: flags.indexOf('+') >= 0,
					prefix: flags.indexOf(' ') >= 0,
					leftAlign: flags.indexOf('-') >= 0,
					alternateForm: flags.indexOf('#') >= 0,
					zeroPad: flags.indexOf('0') >= 0,
					minWidth: parseInt(parseData[3]) || 0,
					hasPrecision: !!parseData[4],
					precision: precision
				};
			}


			function pad (character, len) {
				return Array(len + 1).join(character);
			}


			function padNumber (arg, neg, meta) {
				var l;

				if (meta.zeroPad && !meta.leftAlign && (l = meta.minWidth - arg.length) > 0) {
					if (neg || meta.showSign || meta.prefix) l--;
					arg = pad('0', l) + arg;
				}

				if (neg) {
					arg = '-' + arg;

				} else if (meta.showSign) {
					arg = '+' + arg;
				
				} else if (meta.prefix) {
					arg = ' ' + arg;
				}

				if ((l = meta.minWidth - arg.length) > 0) {
					if (meta.leftAlign) return arg + pad(' ', l);
					return pad(' ', l) + arg;
				}

				return arg;
			}


			function c (arg) {
				arg = shine.utils.coerceToNumber(arg, 'bad argument #' + argIndex + ' to \'format\' (number expected)');
				return String.fromCharCode(arg);
			}


			function d (arg) {
				arg = shine.utils.coerceToNumber(arg, 'bad argument #' + argIndex + ' to \'format\' (number expected)');

				var meta = parseMeta(parseData),
					neg = arg < 0,
					l;

				arg = '' + Math.floor(Math.abs(arg));

				if (meta.hasPrecision) {
					if (meta.precision !== Infinity && (l = meta.precision - arg.length) > 0) arg = pad('0', l) + arg;
					meta.zeroPad = false;
				} 

				return padNumber(arg, neg, meta);
			}


			function f (arg) {
				arg = shine.utils.coerceToNumber(arg, 'bad argument #' + argIndex + ' to \'format\' (number expected)');

				var meta = parseMeta(parseData),
					neg = arg < 0,
					mantissa = arg - Math.floor(arg),
					precision = meta.precision === Infinity? 6 : meta.precision;

				arg = '' + Math.floor(Math.abs(arg));

				if (precision > 0) {
					mantissa = mantissa.toFixed(precision).substr(2);
					precision -= mantissa.length;
					arg += '.' + mantissa + (precision? pad('0', precision) : '');
				}

				return padNumber(arg, neg, meta);
			}


			function o (arg, limit) {
				arg = shine.utils.coerceToNumber(arg, 'bad argument #' + argIndex + ' to \'format\' (number expected)');

				var neg = arg < 0,
					limit = Math.pow(2, 32),
					meta = parseMeta(parseData),
					l;

				arg = Math.floor(arg);
				if (neg) arg = limit + arg;

				arg = arg.toString(16);
				//if (neg && intSize > 2) arg = ;
				if (meta.hasPrecision && meta.precision !== Infinity && (l = meta.precision - arg.length) > 0) arg = pad('0', l) + arg; 

				if ((l = meta.minWidth - arg.length) > 0) {
					if (meta.leftAlign) return arg + pad(' ', l);
					return pad(' ', l) + arg;
				}

				return arg;
			}


			function q (arg) {
				arg = shine.utils.coerceToString(arg);
				return '"' + arg.replace(/([\n"])/g, '\\$1') + '"';
			}


			function s (arg) {
				var meta = parseMeta(parseData),
					l;

				arg = shine.utils.coerceToString(arg);
				arg = arg.substr(0, meta.precision);

				if ((l = meta.minWidth - arg.length) > 0) {
					if (meta.leftAlign) {
						return arg + pad(' ', l);
					} else {
						return pad(meta.zeroPad? '0' : ' ', l) + arg;
					}
				}

				return arg;
			}


			function x (arg) {
				arg = shine.utils.coerceToNumber(arg, 'bad argument #' + argIndex + ' to \'format\' (number expected)');

				var neg = arg < 0,
					intSize = 4, //vm && vm._thread && vm._thread._file.data.meta && vm._thread._file.data.meta.sizes.int || 4,
					limit = Math.pow(2, 32),
					meta = parseMeta(parseData),
					l;

				arg = Math.floor(arg);
				if (neg) arg = limit + arg;

				arg = arg.toString(16);
				if (neg && intSize > 2) arg = pad('f', (intSize - 2) * 4) + arg;
				if (meta.hasPrecision && meta.precision !== Infinity && (l = meta.precision - arg.length) > 0) arg = pad('0', l) + arg; 

				if (meta.alternateForm) arg = '0x' + arg;

				// if ((l = meta.minWidth - arg.length) > 0) {
				// 	if (meta.leftAlign) return arg + pad(' ', l);
				// 	return pad(' ', l) + arg;
				// }

				meta.showSign = meta.prefix = false;
				meta.zeroPad = meta.zeroPad && meta.hasPrecision;
				arg = padNumber(arg, false, meta);

				return arg;
			}



			while (findData = ('' + formatstring).match(FIND_PATTERN)) {
				result += findData[1];
				while (findData[index] != '%') index++;
				parseData = ('' + findData[index + 1]).match(PARSE_PATTERN);

				if (parseData[1]) {
					// %%
					result += '%' + parseData[2] + parseData[3] + (parseData[4] || '') + parseData[6];

				} else {
					switch(parseData[6]) {

						case 'c':
							result += c(args.shift());
							break;

						case 'd':
							result += d(args.shift());
							break;

						case 'f':
							result += f(args.shift());
							break;

						case 'q':
							result += q(args.shift());
							break;

						case 'o':
							result += o(args.shift());
							break;

						case 's':
							result += s(args.shift());
							break;

						case 'x':
							result += x(args.shift());
							break;

						case 'X':
							result += x(args.shift()).toUpperCase();
							break;

					}
				}

				formatstring = parseData[7];
				argIndex++;
			}

			return result + formatstring;
		},
		

		
		
		gmatch: function (s, pattern) {
			pattern = translatePattern(pattern);
			var reg = new RegExp(pattern, 'g'),
				matches = ('' + s).match(reg);

			return function () {
				var match = matches.shift(),
					groups = new RegExp(pattern).exec(match);

				if (match === undefined) return;

				groups.shift();
				return groups.length? groups : match;
			};				
		},
		
		
		
		
		gsub: function (s, pattern, repl, n) {
			if (typeof s != 'string' && typeof s != 'number') throw new shine.Error("bad argument #1 to 'gsub' (string expected, got " + typeof s + ")");
			if (typeof pattern != 'string' && typeof pattern != 'number') throw new shine.Error("bad argument #2 to 'gsub' (string expected, got " + typeof pattern + ")");
			if (n !== undefined && (n = shine.utils.coerceToNumber(n)) === undefined) throw new shine.Error("bad argument #4 to 'gsub' (number expected, got " + typeof n + ")");

			s = '' + s;
			pattern = translatePattern('' + pattern);

			var count = 0,
				result = '',
				str,
				prefix,
				match,
				lastMatch;

			while ((n === undefined || count < n) && s && (match = s.match(pattern))) {

				if (typeof repl == 'function' || (repl || shine.EMPTY_OBJ) instanceof shine.Function) {
					str = repl.apply(null, [match[0]], true);
					if (str instanceof Array) str = str[0];
					if (str === undefined) str = match[0];

				} else if ((repl || shine.EMPTY_OBJ) instanceof shine.Table) {
					str = repl.getMember(match[0]);
					
				} else if (typeof repl == 'object') {
					str = repl[match];
					
				} else {
					str = ('' + repl).replace(/%([0-9])/g, function (m, i) { return match[i]; });
				}

				if (match[0].length == 0 && lastMatch === undefined) {
				 	prefix = '';
				} else {
					prefix = s.split(match[0], 1)[0];
				}
	
				lastMatch = match[0];
				result += prefix + str;
				s = s.substr((prefix + lastMatch).length);

				count++;
			}

			return [result + s, count];
		},
		
		
		
		
		len: function (s) {
			// if (typeof s != 'string' && typeof s != 'number') throw new shine.Error("bad argument #1 to 'len' (string expected, got " + typeof s + ")");
			s = shine.utils.coerceToString(s, "bad argument #1 to 'len' (string expected, got %type)");
			return s.length;
		},
		
		
		
		
		lower: function (s) {
			if (typeof s != 'string' && typeof s != 'number') throw new shine.Error("bad argument #1 to 'lower' (string expected, got " + typeof s + ")");
			return ('' + s).toLowerCase();
		},
		
		
		
		
		match: function (s, pattern, init) {
			if (typeof s != 'string' && typeof s != 'number') throw new shine.Error("bad argument #1 to 'match' (string expected, got " + typeof s + ")");
			if (typeof pattern != 'string' && typeof pattern != 'number') throw new shine.Error("bad argument #2 to 'match' (string expected, got " + typeof pattern + ")");

			init = init? init - 1 : 0;
			s = ('' + s).substr(init);
		
			var matches = s.match(new RegExp(translatePattern (pattern)));
			
			if (!matches) return;
			if (!matches[1]) return matches[0];

			matches.shift();
			return matches;
		},
		
		
		
		
		rep: function (s, n) {
			var result = '',
			i;
			
			for (i = 0; i < n; i++) result += s;
			return result;
		},
		
		
		
		
		reverse: function (s) {
			var result = '',
			i;
			
			for (i = s.length; i >= 0; i--) result += s.charAt(i);
			return result;
		},
		
		
		
		
		sub: function (s, i, j) {
			if (typeof s != 'string' && typeof s != 'number') throw new shine.Error("Bad argument #1 to 'sub' (string expected, got " + typeof s + ")");
			s = '' + s;
			i = i || 1;
			if (j === undefined) j = s.length;
			
			if (i > 0) {
				i = i - 1;
			} else if (i < 0) {
				i = s.length + i;
			}
			
			if (j < 0) j = s.length + j + 1;
			if (i > j) return '';
			
			return s.substring(i, j);
		},
		
		
		
		
		upper: function (s) {
			return s.toUpperCase();
		}	
		
		
	});
	

	stringMetatable = new shine.Table({ __index: shine.lib.string });


	
	
	shine.lib.table = new shine.Table({
		
		
		concat: function (table, sep, i, j) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error("Bad argument #1 to 'concat' (table expected)");
	
			sep = sep || '';
			i = i || 1;
			j = j || shine.lib.table.maxn(table);

			var result = shine.gc.createArray().concat(table.__shine.numValues).splice(i, j - i + 1);
			return result.join(sep);
		},
		
	
	
	
		getn: function (table) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error("Bad argument #1 in 'getn' (table expected)");

			var vals = table.__shine.numValues, 
				keys = shine.gc.createArray(),
				i, 
				j = 0;

			for (i in vals) if (vals.hasOwnProperty(i)) keys[i] = true;
			while (keys[j + 1]) j++;
	
			// Following translated from ltable.c (http://www.lua.org/source/5.1/ltable.c.html)
			if (j > 0 && vals[j] === undefined) {
				/* there is a boundary in the array part: (binary) search for it */
				var i = 0;
	
				while (j - i > 1) {
					var m = Math.floor((i + j) / 2);
	
					if (vals[m] === undefined) {
						j = m;
					} else {
						i = m;
					}
				}

				return i;
			}

			return j;
		},
		
			
		
		
		/**
		 * Implementation of Lua's table.insert function.
		 * @param {object} table The table in which to insert.
		 * @param {object} index The poostion to insert.
		 * @param {object} obj The value to insert.
		 */
		insert: function (table, index, obj) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in table.insert(). Table expected');
	
			if (obj == undefined) {
				obj = index;
				index = table.__shine.numValues.length;
			} else {
				index = shine.utils.coerceToNumber(index, "Bad argument #2 to 'insert' (number expected)");
			}
	
			table.__shine.numValues.splice(index, 0, undefined);
			table.setMember(index, obj);
		},
		
		
		
		
		maxn: function (table) {
			// v5.2: shine.warn ('table.maxn is deprecated');
			
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error("Bad argument #1 to 'maxn' (table expected)");
	
			// // length = 0;
			// // while (table[length + 1] != undefined) length++;
			// // 
			// // return length;
	
			// var result = 0,
			// 	index,
			// 	i;
				
			// for (i in table) if ((index = 0 + parseInt (i, 10)) == i && table[i] !== null && index > result) result = index;
			// return result; 

			return table.__shine.numValues.length - 1;
		},
		
		
		
		
		/**
		 * Implementation of Lua's table.remove function.
		 * @param {object} table The table from which to remove an element.
		 * @param {object} index The position of the element to remove.
		 */
		remove: function (table, index) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in table.remove(). Table expected');
	
			var max = shine.lib.table.getn(table),
				vals = table.__shine.numValues,
				result;

			if (index > max) return;
			if (index == undefined) index = max;
				
			result = vals.splice(index, 1);
			while (index < max && vals[index] === undefined) delete vals[index++];

			return result;
		},		
		

		
		
		sort: function (table, comp) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error("Bad argument #1 to 'sort' (table expected)");
	
			var sortFunc, 
				arr = table.__shine.numValues;
		
			if (comp) {
				if (!(comp instanceof shine.Function || comp.constructor === Function)) throw new shine.Error("Bad argument #2 to 'sort' (function expected)");
	
				sortFunc = function (a, b) {
					return comp.apply(null, [a, b], true)[0]? -1 : 1;
				}
			
			} else {
				sortFunc = function (a, b) {
					return a < b? -1 : 1;
				};
			}
	
			arr.shift();
			arr.sort(sortFunc).unshift(undefined);
		},




		unpack: function (table, i, j) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error("Bad argument #1 to 'unpack' (table expected)");	
	
			i = i || 1;
			if (j === undefined) j = shine.lib.table.getn(table);
			
			var vals = shine.gc.createArray(),
				index;
	
			for (index = i; index <= j; index++) vals.push(table.getMember(index));
			return vals;
		}


	});
	
	
})(shine || {});
