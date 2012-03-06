
var luajs = luajs || {};




luajs.stdout = {};

luajs.stdout.write = function (message) {
	// Overwrite this in host application
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




//luajs.warn = function (message) {
//	luajs.stderr.write ('Luajs warning: ' + message, 'warn');
//};



