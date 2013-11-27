(function () {


	function jsToLua (obj) {
		var mt = new shine.Table({

			__index: function (t, key) {
				var property = obj[key];

				// Bind methods to object and convert args and return values
				if (typeof property == 'function') {
					var f = function () {
						var args = convertArguments(arguments, luaToJS),
							retval = property.apply(args.shift(), args);

						if (typeof retval == 'object') return jsToLua(retval);
						return [retval];
					};

					// Add a new method for instantiating classes
					f.new = function () { 
						var args = convertArguments(arguments, luaToJS),
							argStr,
							i, l;

						argStr = (l = args.length)? 'args[0]' : '';
						for (i = 1; i < l; i++) argStr += ',args[' + i + ']';

						return eval('new property(' + argStr + ')'); 
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

		// Return proxy table
		return shine.lib.setmetatable(new shine.Table(), mt);
	}




	function luaToJS (val) {
		var mt;

		// Make shine.Functions invokable
		if (val instanceof shine.Function) {
			return function () { 
				return jsToLua(val.apply(undefined, convertArguments(arguments, jsToLua)));
			};
		}

		// If object hase been wrapped by jsToLua(), use original object instead
		if (val instanceof shine.Table && (mt = shine.lib.getmetatable(val)) && mt.source) return mt.source;

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
	shine.DOMAPI = {
		window: jsToLua(window)
	};


	// Add expand method
	shine.DOMAPI.window.expand = function () {
		for (var i in window) {
			if (i !== 'print' && i !== 'window' && window.hasOwnProperty(i) && window[i] !== null) {
				vm.setGlobal(i, jsToLua(window[i]));
			}
		}
	};


	return shine;

})(shine || {});
