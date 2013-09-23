/**
 * @fileOverview The Lua standard library.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
*/

var shine = shine || {};



(function () {

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

		DATE_FORMAT_HANDLERS = {
			'%a': function (d) { return days[d['get' + utc + 'Day']()].substr(0, 3); },
			'%A': function (d) { return days[d['get' + utc + 'Day']()]; },
			'%b': function (d) { return months[d['get' + utc + 'Month']()].substr(0, 3); },
			'%B': function (d) { return months[d['get' + utc + 'Month']()]; },
			'%c': function (d) { return d['to' + utc + 'LocaleString'](); },
			'%d': function (d) { return ('0' + d['get' + utc + 'Date']()).substr(-2); },
			'%H': function (d) { return ('0' + d['get' + utc + 'Hours']()).substr(-2); },
			'%I': function (d) { return ('0' + ((d['get' + utc + 'Hours']() + 11) % 12 + 1)).substr(-2); },
			'%j': function (d) {
				var result = d['get' + utc + 'Date'](),
					m = d['get' + utc + 'Month']();
					
				for (var i = 0; i < m; i++) result += daysInMonth[i];
				if (m > 1 && d['get' + utc + 'FullYear']() % 4 === 0) result +=1;

				return ('00' + result).substr(-3);
			},
			'%m': function (d) { return ('0' + (d['get' + utc + 'Month']() + 1)).substr(-2); },
			'%M': function (d) { return ('0' + d['get' + utc + 'Minutes']()).substr(-2); },
			'%p': function (d) { return (d['get' + utc + 'Hours']() < 12)? 'AM' : 'PM'; },
			'%S': function (d) { return ('0' + d['get' + utc + 'Seconds']()).substr(-2); },
			'%U': function (d) { return getWeekOfYear(d, 0); },
			'%w': function (d) { return '' + (d['get' + utc + 'Day']()); },
			'%W': function (d) { return getWeekOfYear(d, 1); },
			'%x': function (d) { return handlers['%m'](d) + '/' + handlers['%d'](d) + '/' + handlers['%y'](d); },
			'%X': function (d) { return handlers['%H'](d) + ':' + handlers['%M'](d) + ':' + handlers['%S'](d); },
			'%y': function (d) { return handlers['%Y'](d).substr (-2); },
			'%Y': function (d) { return '' + d['get' + utc + 'FullYear'](); },
			'%Z': function (d) { return utc? 'UTC' : d.toString ().substr(-4, 3); },
			'%%': function () { return '%' }
		},


		randomSeed = 1;




	function getRandom () {
		randomSeed = (RANDOM_MULTIPLIER * randomSeed) % RANDOM_MODULUS;
		return randomSeed / RANDOM_MODULUS;
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
				pattern = pattern.substr(0, i) + '\\' + pattern.substr(i++);
				l++;
			}
		}			

		return pattern;	
	}
	



	function loadfile (filename, callback) {
		var vm = this,
			file,
			pathData;

		if (filename.substr(0, 1) != '/') {
			pathData = (this._thread._file.url || '').match(/^(.*\/).*?$/);
			pathData = (pathData && pathData[1]) || '';
			filename = pathData + filename;
		}

		// file = new shine.File(filename);

		// file.on('loaded', function (data) {
		// 	var func = new shine.Function(vm, file, file.data, vm._globals);
		// 	vm._trigger('module-loaded', file, func);
			
		// 	callback(func);
		// });

		// file.on('error', function (code) {
		// 	vm._trigger('module-load-error', file, code);
		// 	callback();
		// });

		// this._trigger('loading-module', file);
		// file.load ();

		this.fileManager.load(filename, function (err, file) {
			if (err) {
				vm._trigger('module-load-error', file, err);
				callback();
				return;
			}

			var func = new shine.Function(vm, file, file.data, vm._globals);
			vm._trigger('module-loaded', file, func);
			
			callback(func);			
		});

		this._trigger('loading-module', filename);
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
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in getmetatable(). Table expected');
			return table.__shine.metatable;
		},
		
	
	
	
		ipairs: function (table) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in ipairs(). Table expected');
			
			var iterator = function (table, index) {
				if (index === undefined) throw new shine.Error('Bad argument #2 to ipairs() iterator');

				var nextIndex = index + 1;

				if (!table.__shine.numValues.hasOwnProperty(nextIndex)) return undefined;
				return [nextIndex, table.__shine.numValues[nextIndex]];
			};
	
			return [iterator, table, 0];
		},
	
	
	
		
		load: function (func, chunkname) {
			var file = new shine.File(),
				chunk = '', piece, lastPiece;

			while ((piece = func()) && piece != lastPiece) {
				chunk += (lastPiece = piece);
			}

			file.data = JSON.parse(chunk);
			return new shine.Function(this, file, file.data, this._globals, shine.gc.createArray());
		},
	
	
	
		
		loadfile: function (filename) {
			var thread = shine.lib.coroutine.yield(),
				callback = function (result) {
					thread.resume(result);
				};

			loadfile.call(this, filename, callback);
		},
	
	
	
		
		loadstring: function (string, chunkname) {
			var f = function () { return string; };
			return shine.lib.load.call(this, f, chunkname);
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
				i, l;

			if (found || typeof index == 'number') {
				for (i = 1, l = numValues.length; i < l; i++) {	

					if (!found) {
						if (i === index) found = true;
		
					} else if (numValues.hasOwnProperty(i) && numValues[i] !== undefined) {
						return [i, numValues[i]];
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
				return [false, e.message];
			}
			
			if (!((result || shine.EMPTY_OBJ) instanceof Array)) result = [result];
			result.unshift(true);
			
			return result;
		},
	

		
	
		print: function () {
	
			var output = shine.gc.createArray(),
				item;
			
			for (var i = 0, l = arguments.length; i< l; i++) {
				item = arguments[i];
				
				if ((item || shine.EMPTY_OBJ) instanceof shine.Table) {
					output.push('table: 0x' + item.__shine.index.toString(16));
					
				} else if ((item || shine.EMPTY_OBJ) instanceof Function) {
					output.push('JavaScript function: ' + item.toString());
									
				} else if (item === undefined) {
					output.push('nil');
					
				} else {
					output.push(shine.lib.tostring(item));
				}
//	console.log ('print>>', item);
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
			var thread,
				packageLib = this._globals['package'],
				running = shine.Coroutine._running._func._instance,
				vm = this,
				module,
				preload,
				paths,
				path,
				failedPaths = [];


			function load (preloadFunc) {
				var result;

				packageLib.loaded[modname] = true;
				result = preloadFunc.call(null, modname);

				if (shine.debug && shine.debug._status == 'suspending' && !result) {
					// running._pc -= 1;
					// shine.debug._resumeStack
					delete packageLib.loaded[modname];
					shine.debug._resumeStack.push(running);
					return;
				}

				module = result[0];

				if (module !== undefined) packageLib.loaded[modname] = module;
				return packageLib.loaded[modname];
			}

			if (module = packageLib.loaded[modname]) return module;
			if (preload = packageLib.preload[modname]) return load(preload);

			paths = packageLib.path.replace(/;;/g, ';').split(';');
			thread = shine.lib.coroutine.yield();


			function loadNextPath () {
				path = paths.shift()

				if (!path) {
					throw new shine.Error('module \'' + modname + '\' not found:' + '\n	no field package.preload[\'' + modname + '\']\n' + failedPaths.join('\n'));
					// thread.resume();
			
				} else {
					path = path.replace(/\?/g, modname);

					loadfile.call(vm, path, function (preload) {
						if (preload) {
							var result = load(preload);
							if (result) thread.resume(result);
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
				for (var i = index, l = arguments.length; i < l; i++) args.push(arguments[i]);
				return args;
				
			} else {
				throw new shine.Error('Bad argument #1 in select(). Number or "#" expected');
			}
		},
		
	
		
		
		/**
		 * Implementation of Lua's setmetatable function.
		 * @param {object} table The table that will receive the metatable.
		 * @param {object} metatable The metatable to attach.
		 */
		setmetatable: function (table, metatable) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in setmetatable(). Table expected');	
			if (!(metatable === undefined || (metatable || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #2 in setmetatable(). Nil or table expected');	

			shine.gc.decrRef(table.__shine.metatable);
			table.__shine.metatable = metatable;
			shine.gc.incrRef(metatable);

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
			if (base == 10) return shine.utils.coerce(e, 'number');

			e = shine.utils.coerce(e, 'string');

            // If using base 16, ingore any "0x" prefix
			if (base == 16 && (match = e.match(/^(\-)?0[xX](.+)$/))) e = (match[1] || '') + match[2];

			chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
			pattern = new RegExp('^[' + chars.substr(0, base) + ']*$', 'gi');

			if (!pattern.test(e)) return;	// Invalid
			return parseInt(e, base);
		},
		
		
		
		
		tostring: function (e) {
			return shine.utils.coerce(e, 'string');
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
	
	
	
	
	shine.lib.coroutine = {

		
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
			return shine.Coroutine._running;
		},
		
	
		
		
		status: function (closure) {
			return closure.status;
		},
		
	
		
		
		wrap: function (closure) {
			var co = shine.lib.coroutine.create(closure);
			
			var result = function () {			
				var args = [co];
				for (var i = 0, l = arguments.length; i < l; i++) args.push(arguments[i]);	
	
				var retvals = shine.lib.coroutine.resume.apply(null, args),
					success;
				
				if (shine.debug && shine.debug._status == 'suspending' && !retvals) return;

				success = retvals.shift();
					
				if (success) return retvals;
				throw retvals[0];
			};
			
			result._coroutine = co;
			return result;
		},
		
	
		
		
		yield: function () {
			// If running in main thread, throw error.
			if (!shine.Coroutine._running) throw new shine.Error('attempt to yield across metamethod/C-call boundary (not in coroutine)');
			if (shine.Coroutine._running.status != 'running') throw new shine.Error('attempt to yield non-running coroutine in host');

			var args = shine.gc.createArray(),
				running = shine.Coroutine._running;

			for (var i = 0, l = arguments.length; i < l; i++) args.push(arguments[i]);	
	
			running._yieldVars = args;
			running.status = 'suspending';

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

					if (running.status == 'suspending') {
						window.setTimeout(f, 1);
					} else {
						f ();
					}
				}
			}
		}
			
	};


	

	shine.lib.debug = {

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
	};




	shine.lib.io = {
		
		
		write: function () {
			var i, arg, output = '';
			
			for (var i in arguments) {
				if (arguments.hasOwnProperty(i)) {
					var arg = arguments[i];
					if (['string', 'number'].indexOf(typeof arg) == -1) throw new shine.Error('bad argument #' + i + ' to \'write\' (string expected, got ' + typeof arg +')');
					output += arg;
				}
			}
			
			shine.stdout.write(output);
		}
		
		
	};
	
	
	
		
	shine.lib.math = {
	
	
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
			// Not implemented
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
		
		
		
		
		frexp: function (x, y) {
			// TODO
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
			var coerce = shine.utils.coerce;
			x = coerce(x, 'number', "bad argument #1 to 'pow' (number expected)")
			y = coerce(y, 'number', "bad argument #2 to 'pow' (number expected)")
			return Math.pow(x, y);
		},
		
		
		
		
		rad: function (x) {
			x = shine.utils.coerce(x, 'number', "bad argument #1 to 'rad' (number expected)")
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
			// Not implemented
		},
	
	
	
		
		sqrt: function (x) {
			return Math.sqrt(x);
		},
	
	
	
		
		tan: function (x) {
			return Math.tan(x);
		},
	
	
	
		
		tanh: function (x) {
			// Not implemented
		}
	
		
	};
	
	

	
	shine.lib.os = {
	
	
		clock: function () {
			// Not implemented
		},
	
	
	
	
		date: function (format, time) {
			if (format === undefined) format = '%c';
			
	
			var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
				months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
				daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
				
				getWeekOfYear = function (d, firstDay) { 
					var dayOfYear = parseInt(DATE_FORMAT_HANDLERS['%j'](d), 10),
						jan1 = new Date(d.getFullYear (), 0, 1, 12),
						offset = (8 - jan1['get' + utc + 'Day']() + firstDay) % 7;

					return ('0' + (Math.floor((dayOfYear - offset) / 7) + 1)).substr(-2);
				},
	
				utc = '',
				date = new Date();
	
			
			if (time) date.setTime(time * 1000);
			
	
			if (format.substr(0, 1) === '!') {
				format = format.substr(1);
				utc = 'UTC';
			}
	
	
			if (format === '*t') {
				var isDST = function (d) {
					var year = d.getFullYear(),
						jan = new Date(year, 0);
						
					// ASSUMPTION: If the time offset of the date is the same as it would be in January of the same year, DST is not in effect.
					return (d.getTimezoneOffset() !== jan.getTimezoneOffset());
				};
				
				return new shine.Table ({
					year: parseInt(DATE_FORMAT_HANDLERS['%Y'](date), 10),
					month: parseInt(DATE_FORMAT_HANDLERS['%m'](date), 10),
					day: parseInt(DATE_FORMAT_HANDLERS['%d'](date), 10),
					hour: parseInt(DATE_FORMAT_HANDLERS['%H'](date), 10),
					min: parseInt(DATE_FORMAT_HANDLERS['%M'](date), 10),
					sec: parseInt(DATE_FORMAT_HANDLERS['%S'](date), 10),
					wday: parseInt(DATE_FORMAT_HANDLERS['%w'](date), 10) + 1,
					yday: parseInt(DATE_FORMAT_HANDLERS['%j'](date), 10),
					isdst: isDST(date)
				});	
			}
	
	
			for (var i in DATE_FORMAT_HANDLERS) {
				if (DATE_FORMAT_HANDLERS.hasOwnProperty(i) && format.indexOf(i) >= 0) format = format.replace(i, DATE_FORMAT_HANDLERS[i](date));
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
	
	
	
	
		exit: function () {
			throw 'Execution terminated.';
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
	
			
	};




	shine.lib['package'] = {

		cpath: undefined,


		loaded: new shine.Table(),


		loadlib: function (libname, funcname) {
			// Not implemented
		},


		path: '?.lua.json;?.json;modules/?.lua.json;modules/?.json;modules/?/?.lua.json;modules/?/index.lua.json',


		preload: {},


		seeall: function (module) {
			// Not implemented
		}
		
	};




	shine.lib.string = {
		
		
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
			return JSON.stringify(func._data);
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
			// Temp fix
			
			/**
			*
			*  Javascript sprintf
			*  http://www.webtoolkit.info/
			*
			*
			**/
			 
			var sprintfWrapper = {
			 
				init : function () {
			 
					if (typeof arguments == "undefined") { return null; }
					if (arguments.length < 1) { return null; }
					if (typeof arguments[0] != "string") { return null; }
					if (typeof RegExp == "undefined") { return null; }

					var string = arguments[0];
					var exp = new RegExp(/(%([%]|(\-)?(\+|\x20)?(0)?(\d+)?(\.(\d)?)?([bcdfosxX])))/g);
					var matches = new Array();
					var strings = new Array();
					var convCount = 0;
					var stringPosStart = 0;
					var stringPosEnd = 0;
					var matchPosEnd = 0;
					var newString = '';
					var match = null;
			 
					while (match = exp.exec(string)) {
						if (match[9]) { convCount += 1; }
			 
						stringPosStart = matchPosEnd;
						stringPosEnd = exp.lastIndex - match[0].length;
						strings[strings.length] = string.substring(stringPosStart, stringPosEnd);
			 
						matchPosEnd = exp.lastIndex;
						matches[matches.length] = {
							match: match[0],
							left: match[3] ? true : false,
							sign: match[4] || '',
							pad: match[5] || ' ',
							min: match[6] || 0,
							precision: match[8],
							code: match[9] || '%',
							negative: parseInt(arguments[convCount]) < 0 ? true : false,
							argument: String(arguments[convCount])
						};
					}
					strings[strings.length] = string.substring(matchPosEnd);
			 
					if (matches.length == 0) { return string; }
					if ((arguments.length - 1) < convCount) { return null; }
			 
					var code = null,
						match = null,
						i = null,
						substitution;
					
			 
					for (i=0; i<matches.length; i++) {
			 
						if (matches[i].code == '%') { substitution = '%' }
						else if (matches[i].code == 'b') {
							matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(2));
							substitution = sprintfWrapper.convert(matches[i], true);
						}
						else if (matches[i].code == 'c') {
							matches[i].argument = String(String.fromCharCode(Math.abs(parseInt(matches[i].argument))));
							substitution = sprintfWrapper.convert(matches[i], true);
						}
						else if (matches[i].code == 'd') {
							matches[i].argument = String(Math.abs(parseInt(matches[i].argument)));
							substitution = sprintfWrapper.convert(matches[i]);
						}
						else if (matches[i].code == 'f') {
							matches[i].argument = String(Math.abs(parseFloat(matches[i].argument)).toFixed(matches[i].precision ? matches[i].precision : 6));
							substitution = sprintfWrapper.convert(matches[i]);
						}
						else if (matches[i].code == 'o') {
							matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(8));
							substitution = sprintfWrapper.convert(matches[i]);
						}
						else if (matches[i].code == 's') {
							matches[i].argument = matches[i].argument.substring(0, matches[i].precision ? matches[i].precision : matches[i].argument.length)
							substitution = sprintfWrapper.convert(matches[i], true);
						}
						else if (matches[i].code == 'x') {
							matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(16));
							substitution = sprintfWrapper.convert(matches[i]);
						}
						else if (matches[i].code == 'X') {
							matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(16));
							substitution = sprintfWrapper.convert(matches[i]).toUpperCase();
						}
						else {
							substitution = matches[i].match;
						}
			 
						newString += strings[i];
						newString += substitution;
			 
					}
					newString += strings[i];
			 
					return newString;
			 
				},
			 
				convert : function(match, nosign){
					if (nosign) {
						match.sign = '';
					} else {
						match.sign = match.negative ? '-' : match.sign;
					}
					var l = match.min - match.argument.length + 1 - match.sign.length;
					var pad = new Array(l < 0 ? 0 : l).join(match.pad);
					if (!match.left) {
						if (match.pad == "0" || nosign) {
							return match.sign + pad + match.argument;
						} else {
							return pad + match.sign + match.argument;
						}
					} else {
						if (match.pad == "0" || nosign) {
							return match.sign + match.argument + pad.replace(/0/g, ' ');
						} else {
							return match.sign + match.argument + pad;
						}
					}
				}
			}
			 
			return sprintfWrapper.init.apply (null, arguments);
			
		},
		
		
		
		
		gmatch: function (s, pattern) {
			pattern = translatePattern(pattern);
			var reg = new RegExp(pattern, 'g'),
				matches = ('' + s).match(reg);

			return function () {
				var match = matches.shift(),
					groups = new RegExp(reg).exec(match);

				if (match === undefined) return;

				groups.shift();
				return groups.length? groups : match;
			};				
		},
		
		
		
		
		gsub: function (s, pattern, repl, n) {
			if (typeof s != 'string' && typeof s != 'number') throw new shine.Error("bad argument #1 to 'gsub' (string expected, got " + typeof s + ")");
			if (typeof pattern != 'string' && typeof pattern != 'number') throw new shine.Error("bad argument #2 to 'gsub' (string expected, got " + typeof pattern + ")");
			if (n !== undefined && (n = shine.utils.coerce(n, 'number')) === undefined) throw new shine.Error("bad argument #4 to 'gsub' (number expected, got " + typeof n + ")");

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
			if (typeof s != 'string' && typeof s != 'number') throw new shine.Error("bad argument #1 to 'len' (string expected, got " + typeof s + ")");
			return ('' + s).length;
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
			if (typeof s != 'string' && typeof s != 'number') throw new shine.Error("bad argument #1 to 'sub' (string expected, got " + typeof s + ")");
			s = '' + s;
			i = i || 1;
			j = j || s.length;
			
			if (i > 0) {
				i = i - 1;
			} else if (i < 0) {
				i = s.length + i;
			}
			
			if (j < 0) j = s.length + j + 1;
			
			return s.substring(i, j);
		},
		
		
		
		
		upper: function (s) {
			return s.toUpperCase();
		}	
		
		
	};
	
	
	
	
	shine.lib.table = {
		
		
		concat: function (table, sep, i, j) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in table.concat(). Table expected');
	
			sep = sep || '';
			i = i || 1;
			j = j || shine.lib.table.maxn(table);

			var result = shine.gc.createArray().concat(table.__shine.numValues).splice(i, j - i + 1);
			return result.join(sep);
		},
		
	
	
	
		getn: function (table) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in table.getn(). Table expected');

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
				// index = 1;
				// while (table.getMember(index) !== undefined) index++;
				index = table.__shine.numValues.length;
			}
	
			var oldValue = table.getMember(index);
			table.setMember(index, obj);
	
			if (oldValue) shine.lib.table.insert(table, index + 1, oldValue);
		},	
		
		
		
		
		maxn: function (table) {
			// v5.2: shine.warn ('table.maxn is deprecated');
			
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in table.maxn(). Table expected');
	
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
			// table[index] = table[index + 1];	
			
			// shine.lib.table.remove (table, index + 1);
			// if (table[index] === undefined) delete table[index];
	
			return result;
		},
		
		
		
		
		sort: function (table, comp) {
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error("Bad argument #1 to 'sort' (table expected)");
	
			var sortFunc, 
				arr = table.__shine.numValues;
		
			if (comp) {
				if (!((comp || shine.EMPTY_OBJ) instanceof shine.Function)) throw new shine.Error("Bad argument #2 to 'sort' (function expected)");
	
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
			if (!((table || shine.EMPTY_OBJ) instanceof shine.Table)) throw new shine.Error('Bad argument #1 in unpack(). Table expected');	
	
			i = i || 1;
			if (j === undefined) j = shine.lib.table.getn(table);
			
			var vals = shine.gc.createArray(),
				index;
	
			for (index = i; index <= j; index++) vals.push(table.getMember(index));
			return vals;
		}


	}

	
	
	
})();