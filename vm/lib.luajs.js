
var luajs = luajs || {};




luajs.lib = {

	
	assert: function (v, m) {
		if (!v) throw new luajs.Error (m || 'Assertion failed!');
		return [v, m];
	},




	collectgarbage: function (opt, arg) {
		// Unimplemented
	},




	dofile: function (filename) {
		// Unimplemented
	},
	
	
	
	
	error: function (message) {	
		throw new luajs.Error (message);
	},



	
	getfenv: function (f) {
		// Unimplemented
	},
	
	
	
	
	/**
	 * Implementation of Lua's getmetatable function.
	 * @param {object} table The table from which to obtain the metatable.
	 */
	getmetatable: function (table) {
		if (!(table instanceof luajs.Table)) throw new luajs.Error ('Bad argument #1 in getmetatable(). Table expected');
		return table.__luajs.metatable;
	},
	



	ipairs: function (table) {
		if (!(table instanceof luajs.Table)) throw new luajs.Error ('Bad argument #1 in ipairs(). Table expected');
		
		var iterator = function (table, index) {
			if (index === undefined) throw new luajs.Error ('Bad argument #2 to ipairs() iterator'); 
			if (!table.hasOwnProperty (index + 1)) return undefined;
			return [index + 1, table[index + 1]];
		};

		return [iterator, table, 0];
	},



	
	load: function (func, chunkname) {
		return [undefined, 'Unimplemented'];
	},



	
	loadfile: function (filename) {
		return [undefined, 'Unimplemented'];
	},



	
	loadstring: function (func, chunkname) {
		return [undefined, 'Unimplemented'];
	},


		

	/**
	 * Implementation of Lua's next function.
	 * @param {object} table The table that will receive the metatable.
	 * @param {object} index Index of the item to return.
	 */
	next: function (table, index) {	
		// SLOOOOOOOW...
		var found = (index == undefined);
	
		for (var i in table) {
			if (table.hasOwnProperty (i) && !(i in luajs.Table.prototype) && i !== '__luajs') {
				if (!found) {
					if (i == index) found = true;

				} else if (table.hasOwnProperty (i) && i.substr (0, 2) != '__') {
					return [i, table[i]];
				}
			}
		}
	
		return [];
	},




	/**
	 * Implementation of Lua's pairs function.
	 * @param {object} table The table to be iterated over.
	 */
	pairs: function (table) {	
		if (!(table instanceof luajs.Table)) throw new luajs.Error ('Bad argument #1 in pairs(). Table expected');
		return [luajs.lib.next, table];
	},

	


	pcall: function (func) {
		var args = [],
			result;
			
		for (var i = 1, l = arguments.length; i < l; i++) args.push (arguments[i]);

		try {			
			result = func.apply ({}, args);
		} catch (e) {
			return [false, e.message];
		}
		
		if (!(result instanceof Array)) result = [result];
		result.unshift (true);
		
		return result;
	},

	
	

	print: function () {

		var output = [],
			item;
		
		for (var i = 0, l = arguments.length; i< l; i++) {
			item = arguments[i];
			
			if (item instanceof luajs.Table) {
				output.push ('table: 0x' + item.__luajs.index.toString (16));
				
			} else if (item instanceof Function) {
				output.push ('JavaScript function: ' + item.toString ());
								
			} else if (item === undefined) {
				output.push ('nil');
				
			} else {
				output.push (item);
			}
//console.log ('print>>', item);
		}

		return luajs.stdout.write (output.join ('\t'));
	},




	rawequal: function (v1, v2) {
		return (v1 == v2);
	},




	rawget: function (table, index) {
		if (!(table instanceof luajs.Table)) throw new luajs.Error ('Bad argument #1 in rawget(). Table expected');
		return table.index;
	},




	rawset: function (table, index, value) {
		if (!(table instanceof luajs.Table)) throw new luajs.Error ('Bad argument #1 in rawset(). Table expected');
		if (index == undefined) throw new luajs.Error ('Bad argument #2 in rawset(). Nil not allowed');

		table[index] = value;
		return table;
	},




	select: function (index) {
		var args = [];
		
		if (index == '#') {
			return arguments.length - 1;
			
		} else if (index = parseInt (index, 10)) {
			for (var i = index, l = arguments.length; i < l; i++) args.push (arguments[i]);
			return args;
			
		} else {
			throw new luajs.Error ('Bad argument #1 in select(). Number or "#" expected');
		}
	},
	

	
	
	/**
	 * Implementation of Lua's setmetatable function.
	 * @param {object} table The table that will receive the metatable.
	 * @param {object} metatable The metatable to attach.
	 */
	setmetatable: function (table, metatable) {
		if (!(table instanceof luajs.Table)) throw new luajs.Error ('Bad argument #1 in setmetatable(). Table expected');	
		if (!(metatable instanceof luajs.Table)) throw new luajs.Error ('Bad argument #2 in setmetatable(). Table expected');	
		
		table.__luajs.metatable = metatable;
	},
	


	
	tonumber: function (e, base) {
		// TODO: Needs a more generic algorithm to check what is valid. Lua supports all bases from 2 to 36 inclusive.

		e = ('' + e).replace (/^\s+|\s+$/g, '');	// Trim
		base = base || 10;

		if (base === 2 && e.match (/[^01]/)) return;
		if (base === 10 && e.match (/[^0-9e\+\-\.]/)) return;
		if (base === 16 && e.match (/[^0-9A-Fa-f]/)) return;
		
		return (base == 10)? parseFloat (e) : parseInt (e, base);
	},
	
	
	
	
	tostring: function (e) {
		return e === undefined? 'nil' : e.toString ();
	},
	
	
	
	
	type: function (v) {
		var t = typeof (v);

		switch (t) {
			case 'undefined': 
				return 'nil';
			
			case 'number': 
			case 'string': 
			case 'boolean': 
				return t;
			 
			case 'object': 
				if (v instanceof luajs.Table) return 'table';
				if (v instanceof luajs.VM.Closure) return 'function';
			
				return 'userdata';
		}
	},
	
	

	unpack: function (table, i, j) {
		// v5.2: luajs.warn ('unpack is deprecated. Use table.unpack instead.');
		return luajs.lib.table.unpack (table, i, j);
	},
	
	
	
	
	_VERSION: 'Lua 5.1',
	
	
	
	
	xpcall: function (func, err) {
		var result, success;
			
		try {
			result = func.apply ({});
			success = true;
			
		} catch (e) {
			result = err.apply ({});
			if ((result instanceof Array)) result = result[0];

			success = false;
		}
		
		if (!(result instanceof Array)) result = [result];
		result.unshift (success);
		
		return result;
	}


};




luajs.lib.string = {
	
	
	byte: function (s, i, j) {
		i = i || 1;
		j = j || i;
		
		var result = [],
			length = s.length,
			index;
		
		for (index = i; index <= length && index <= j ; index++) result.push (s.charCodeAt (index - 1) || undefined);
		return result;
	},
	
	
	
	
	char: function () {
		var result = '';
		for (var i = 0, l = arguments.length; i < l; i++) result += String.fromCharCode (arguments[i]);

		return result;			
	},
	
	
	
	
	dump: function (func) {
		// Not implemented
	},
	
	
	
	
	find: function (s, pattern, init, plain) {
		// TODO Add pattern matching (currently only plain)
		init = init || 1;
		
		var index = s.indexOf (pattern, init - 1);
		return (index === -1)? undefined : [index + 1, index + pattern.length];
	},
	
	
	
	
	format: function (formatstring) {
		// TODO
	},
	
	
	
	
	gmatch: function (s, pattern) {
		// TODO
	},
	
	
	
	
	gsub: function (s, pattern, repl, n) {
		// TODO Only the real basics covered here. Plus pattern can currently only be a string. Needs a lot more work.

		pattern = pattern.replace (/%%/g, '{:%%:}');
		
		pattern = pattern.replace (/%a/g, '[a-zA-Z]');
		pattern = pattern.replace (/%A/g, '[^a-zA-Z]');
		
		pattern = pattern.replace (/%c/g, '\\[nrt]');
		// pattern = pattern.replace (/%C/g, '');
		
		pattern = pattern.replace (/%d/g, '\d');
		pattern = pattern.replace (/%D/g, '[^\d]');
		
		pattern = pattern.replace (/%l/g, '[a-z]');
		pattern = pattern.replace (/%L/g, '[^a-z]');

		//? pattern = pattern.replace (/%p/g, '');

		pattern = pattern.replace (/%s/g, '\s');
		pattern = pattern.replace (/%S/g, '[^\s]');

		pattern = pattern.replace (/%u/g, '[A-Z]');
		pattern = pattern.replace (/%U/g, '[^A-Z]');

		pattern = pattern.replace (/%w/g, '[a-zA-Z0-9]');
		pattern = pattern.replace (/%W/g, '[^a-zA-Z0-9]');

		pattern = pattern.replace (/%x/g, '[0-9a-fA-F]');
		pattern = pattern.replace (/%X/g, '[^0-9a-fA-F]');

		pattern = pattern.replace (/{:%%:}/g, '%');


		var reg = new RegExp (pattern),
			count = 0,
			result = '',
			data;

		while ((n === undefined || count < n) && s.match (pattern)) {
			s = s.replace (reg, '{:gsub-sep:}');
			s = s.split ('{:gsub-sep:}');
			result += s[0] + repl;
			s = s[1];
			count++;
		}
		
		return [result + s, count];
	},
	
	
	
	
	len: function (s) {
		return s.length;
	},
	
	
	
	
	lower: function (s) {
		return s.toLowerCase ();
	},
	
	
	
	
	match: function (s, pattern, init) {
		// TODO
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
		
		for (i = s.length; i >= 0; i--) result += s.charAt (i);
		return result;
	},
	
	
	
	
	sub: function (s, i, j) {
		if (i > 0) {
			i = i - 1;
		} else if (i < 0) {
			i = s.length + i;
		}

		if (j < 0) j = s.length + j + 1;
		
		return s.substring (i, j);
	},
	
	
	
	
	upper: function (s) {
		return s.toUpperCase ();
	}	
	
	
};




luajs.lib.table = {
	
	
	concat: function (table, sep, i, j) {
		if (!(table instanceof luajs.Table)) throw new luajs.Error ('Bad argument #1 in table.concat(). Table expected');

		sep = sep || '';
		i = i || 1;
		j = j || luajs.lib.table.maxn (table);
		
		var result = [],
			index;
		
		for (index = i; index <= j; index++) result.push (table[index]);
		return result.join (sep);
	},
	
	
	
	
	/**
	 * Implementation of Lua's table.insert function.
	 * @param {object} table The table in which to insert.
	 * @param {object} index The poostion to insert.
	 * @param {object} obj The value to insert.
	 */
	insert: function (table, index, obj) {
		if (!(table instanceof luajs.Table)) throw new luajs.Error ('Bad argument #1 in table.insert(). Table expected');

		if (obj == undefined) {
			obj = index;
			index = 1;
			while (table[index] != undefined) index++;
		}

		var oldValue = table[index];
		table[index] = obj;

		if (oldValue) luajs.lib.table.insert (table, index + 1, oldValue);
	},	
	
	
	
	
	maxn: function (table) {
		// v5.2: luajs.warn ('table.maxn is deprecated');
		
		if (!(table instanceof luajs.Table)) throw new luajs.Error ('Bad argument #1 in table.maxn(). Table expected');

		// length = 0;
		// while (table[length + 1] != undefined) length++;
		// 
		// return length;

		var result = 0,
			index,
			i;
			
		for (i in table) if ((index = 0 + parseInt (i)) == i && index > result) result = index;
		return result; 
	},
	
	
	
	
	unpack: function (table, i, j) {
		if (!(table instanceof luajs.Table)) throw new luajs.Error ('Bad argument #1 in unpack(). Table expected');	

		i = i || 1;

		if (j === undefined) {
			j = 0;
			while (table[j + 1] !== undefined) j++;
		}
		
		var vals = [],
			index;

		for (index = i; index <= j; index++) vals.push (table.getMember (index));
		return vals;
	},




	/**
	 * Implementation of Lua's table.remove function.
	 * @param {object} table The table from which to remove an element.
	 * @param {object} index The position of the element to remove.
	 */
	remove: function (table, index) {
		if (!(table instanceof luajs.Table)) throw new luajs.Error ('Bad argument #1 in table.remove(). Table expected');

		if (index == undefined) {
			index = 1;
			while (table[index + 1] != undefined) index++;
		}

		var result = table[index];
		table[index] = table[index + 1];

		if (table[index]) {
			luajs.lib.table.remove (table, index + 1);
		} else {
			delete table[index];
		}
		
		return result;
	},
	
	
	
	
	sort: function (table, comp) {
		if (!(table instanceof luajs.Table)) throw new luajs.Error ("Bad argument #1 to 'sort' (table expected)");

		var val,
			arr = [],
			sortFunc = function (a, b) {
				return a < b? -1 : 1;
			};


		if (comp) {
			if (!(comp instanceof luajs.VM.Closure)) throw new luajs.Error ("Bad argument #2 to 'sort' (function expected)");

			sortFunc = function (a, b) {
				return comp.call ({}, a, b)[0]? -1 : 1;
			}
		}

		for (var i = 1; (val = table.getMember (i)) !== undefined; i++) arr.push (val);
		arr.sort (sortFunc);

		for (i in arr) table.setMember (parseInt (i, 10) + 1, arr[i]);
	}
}




luajs.lib.math = {


	abs: function (x) {
		return Math.abs (x);
	},
	
	
	
	
	acos: function (x) {
		return Math.acos (x);
	},
	
	
	
	
	asin: function (x) {
		return Math.asin (x);
	},
	
	
	
	
	atan: function (x) {
		return Math.atan (x);
	},
	
	
	
	
	atan2: function (x, y) {
		return Math.atan2 (y, x);
	},
	
	
	
	
	ceil: function (x) {
		return Math.ceil (x);
	},
	
	
	
	
	cos: function (x) {
		return Math.cos (x);
	},
	
	
	
	
	cosh: function (x) {
		// Not implemented
	},
	
	
	
	
	deg: function (x) {
		// Not implemented
	},
	
	
	
	
	exp: function (x) {
		return Math.exp (x);
	},
	
	
	
	
	floor: function (x) {
		return Math.floor (x);
	},
	
	
	
	
	fmod: function (x, y) {
		return x % y;
	},
	
	
	
	
	frexp: function (x, y) {
		// TODO
	},
	
	
	
	
	huge: Infinity,
	
	
	
	
	ldexp: function (m, e) {
		return m * math.pow (2, e);
	},
	
	
	
	
	log: function (x, base) {
		var result = Math.log (x);
		if (base !== undefined) return result / Math.log (10)
		return result;
	},
	
	
	
	
	log10: function (x) {
		// v5.2: luajs.warn ('math.log10 is deprecated. Use math.log with 10 as its second argument, instead.');
		return Math.log (x, 10);
	},
	
	
	
	
	max: function () {
		var max = -Infinity,
			length = arguments.length,
			i;
		
		for (i = 0; i < length; i++) if (arguments[i] > max) max = arguments[i];
		return max;
	},
	
	
	
	
	min: function () {
		var min = Infinity,
			length = arguments.length,
			i;
		
		for (i = 0; i < length; i++) if (arguments[i] < min) min = arguments[i];
		return min;
	},
	
	
	
	
	modf: function (x) {
		var int = Math.floor (x),
			mantissa = x - int;
		return [int, mantissa];
	},
	
	
	
	
	pi: Math.PI,
	
	
	
	
	pow: function (x, y) {
		return Math.pow (x, y);
	},
	
	
	
	
	rad: function (x) {
		// Not implemented
	},




	/**
	 * Implementation of Lua's math.random function.
	 */
	random: function (min, max) {
		if (min === undefined && max === undefined) return Math.random ();


		if (typeof min !== 'number') throw new luajs.Error ("bad argument #1 to 'random' (number expected)");

		if (max === undefined) {
			max = min;
			min = 1;

		} else if (typeof max !== 'number') {
			throw new luajs.Error ("bad argument #2 to 'random' (number expected)");
		}

		if (min > max) throw new luajs.Error ("bad argument #2 to 'random' (interval is empty)");
		return Math.floor (Math.random () * (max - min + 1) + min);
	},




	randomseed: function () {
		// Not implemented
	},



	
	sin: function (x) {
		return Math.sin (x);
	},



	
	sinh: function (x) {
		// Not implemented
	},



	
	sqrt: function (x) {
		return Math.sqrt (x);
	},



	
	tan: function (x) {
		return Math.tan (x);
	},



	
	tanh: function (x) {
		// Not implemented
	}

	
};




luajs.lib.os = {


	clock: function () {
		// Not implemented
	},




	date: function (format, time) {
		if (format === undefined) format = '%c';
		

		var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
			months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
			daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
			
			getWeekOfYear = function (d, firstDay) { 
				var dayOfYear = parseInt (handlers['%j'](d), 10),
					jan1 = new Date (d.getFullYear (), 0, 1, 12),
					offset = (8 - jan1['get' + utc + 'Day'] () + firstDay) % 7;

				return ('0' + (Math.floor ((dayOfYear - offset) / 7) + 1)).substr (-2);
			},

			handlers = {
				'%a': function (d) { return days[d['get' + utc + 'Day']()].substr (0, 3); },
				'%A': function (d) { return days[d['get' + utc + 'Day']()]; },
				'%b': function (d) { return months[d['get' + utc + 'Month']()].substr (0, 3); },
				'%B': function (d) { return months[d['get' + utc + 'Month']()]; },
				'%c': function (d) { return d['to' + utc + 'LocaleString'](); },
				'%d': function (d) { return ('0' + d['get' + utc + 'Date']()).substr (-2); },
				'%H': function (d) { return ('0' + d['get' + utc + 'Hours']()).substr (-2); },
				'%I': function (d) { return ('0' + ((d['get' + utc + 'Hours']() + 11) % 12 + 1)).substr (-2); },
				'%j': function (d) {
					var result = d['get' + utc + 'Date'](),
						m = d['get' + utc + 'Month']();
						
					for (var i = 0; i < m; i++) result += daysInMonth[i];
					if (m > 1 && d['get' + utc + 'FullYear']() % 4 === 0) result +=1;

					return ('00' + result).substr (-3);
				},
				'%m': function (d) { return ('0' + (d['get' + utc + 'Month']() + 1)).substr (-2); },
				'%M': function (d) { return ('0' + d['get' + utc + 'Minutes']()).substr (-2); },
				'%p': function (d) { return (d['get' + utc + 'Hours']() < 12)? 'AM' : 'PM'; },
				'%S': function (d) { return ('0' + d['get' + utc + 'Seconds']()).substr (-2); },
				'%U': function (d) { return getWeekOfYear (d, 0); },
				'%w': function (d) { return '' + (d['get' + utc + 'Day']()); },
				'%W': function (d) { return getWeekOfYear (d, 1); },
				'%x': function (d) { return handlers['%m'](d) + '/' + handlers['%d'](d) + '/' + handlers['%y'](d); },
				'%X': function (d) { return handlers['%H'](d) + ':' + handlers['%M'](d) + ':' + handlers['%S'](d); },
				'%y': function (d) { return handlers['%Y'](d).substr (-2); },
				'%Y': function (d) { return '' + d['get' + utc + 'FullYear'](); },
				'%Z': function (d) { return utc? 'UTC' : d.toString ().substr (-4, 3); },
				'%%': function () { return '%' }
			},

			utc = '',
			date = new Date ();

		
		if (time) date.setTime (time * 1000);
		

		if (format.substr (0, 1) === '!') {
			format = format.substr (1);
			utc = 'UTC';
		}


		if (format === '*t') {
			var isDST = function (d) {
				var year = d.getFullYear (),
					jan = new Date (year, 0);
					
				// ASSUMPTION: If the time offset of the date is the same as it would be in January of the same year, DST is not in effect.
				return (d.getTimezoneOffset () !== jan.getTimezoneOffset ());
			};
			
			return new luajs.Table ({
				year: parseInt (handlers['%Y'](date), 10),
				month: parseInt (handlers['%m'](date), 10),
				day: parseInt (handlers['%d'](date), 10),
				hour: parseInt (handlers['%H'](date), 10),
				min: parseInt (handlers['%M'](date), 10),
				sec: parseInt (handlers['%S'](date), 10),
				wday: parseInt (handlers['%w'](date), 10) + 1,
				yday: parseInt (handlers['%j'](date), 10),
				isdst: isDST (date)
			});	
		}


		for (var i in handlers) {
			if (format.indexOf (i) >= 0) format = format.replace (i, handlers[i](date));
		}
		
		return format;
	},




	difftime: function (t2, t1) {
		return t2 - t1;
	},




	execute: function () {
		if (arguments.length) throw new luajs.Error ('shell is not available. You should always check first by calling os.execute with no parameters');
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
		var date;
		
		if (!table) {
			date = new Date ();
			
		} else {	
			var day, month, year, hour, min, sec;
			
			if (!(day = table.getMember ('day'))) throw new luajs.Error ("Field 'day' missing in date table");
			if (!(month = table.getMember ('month'))) throw new luajs.Error ("Field 'month' missing in date table");
			if (!(year = table.getMember ('year'))) throw new luajs.Error ("Field 'year' missing in date table");
			hour = table.getMember ('hour') || 12;
			min = table.getMember ('min') || 0;
			sec = table.getMember ('sec') || 0;
			
			if (table.getMember ('isdst')) hour--;
			date = new Date (year, month - 1, day, hour, min, sec);
		}
		
		return Math.floor (date.getTime () / 1000);
	},




	tmpname: function () {
		// Not implemented
	}


};



luajs.lib.coroutine = {
	
	create: function (closure) {
		return new luajs.VM.Coroutine (closure);
	},
	
	
	
	
	resume: function (thread) {
		var args = [];
		for (var i = 1, l = arguments.length; i < l; i++) args.push (arguments[i]);	

		return thread.resume.apply (thread, args);
	},
	
	
	
	
	running: function () {
		return luajs.VM.Coroutine._running;
	},
	

	
	
	status: function (closure) {
		return closure.status;
	},
	
	
	
	
	wrap: function (closure) {
		var co = luajs.lib.coroutine.create (closure);
		
		var result = function () {			
			var args = [co];
			for (var i = 0, l = arguments.length; i < l; i++) args.push (arguments[i]);	

			var retvals = luajs.lib.coroutine.resume.apply ({}, args),
				success = retvals.shift ();
				
			if (success) return retvals;
			throw retvals[0];
		};
		
		result._coroutine = co;
		return result;
	},
	

	
	
	yield: function () {
		// If running in main thread, throw error.
		if (!luajs.VM.Coroutine._running) throw new luajs.Error ('attempt to yield across metamethod/C-call boundary (not in coroutine)');

		var args = [];
		for (var i = 0, l = arguments.length; i < l; i++) args.push (arguments[i]);	

		luajs.VM.Coroutine._running._yieldVars = args;
		luajs.VM.Coroutine._running.status = 'suspending';

		return;
	}

	
};

