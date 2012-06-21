
var luajs = luajs || {};




luajs.stdout = {};

luajs.stdout.write = function (message) {
	// Overwrite this in host application
	if (console && console.log) {
		console.log (message);
	} elseif (trace) {
		trace (message);
	}
}




luajs.stddebug = {};

luajs.stddebug.write = function (message) {
	// Luajs bytecode debugging output
}




luajs.stderr = {};

luajs.stderr.write = function (message, level) {
	level = level || 'error';
	if (console && console[level]) console[level] (message);
}



