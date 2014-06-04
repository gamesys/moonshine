
shine = shine || {};

shine.Function = function () {};

shine.lib.require = function (modname) {
	var loaded = shine.lib['package'].loaded[modname],
		f;

	if (loaded) return loaded;

	f = shine.lib['package'].preload[modname];
	if (!f) throw new Error('Attempt to require non-packaged file from precompiled script not allowed: ' + modname);

	return shine.lib['package'].loaded[modname] = f(modname)[0];		
}

shine.lib.load = shine.lib.loadfile = shine.lib.loadstring = function () {
	throw new Error('Attempt to load file from precompiled script not allowed.');
}



var shine_precompiler_create_func = function (def, upvals) {
	var cl = shine.gc.createObject();
	cl._upvalues = upvals || shine.gc.createArray();
	return def.bind(cl);
}

var shine_precompiler_env = window.shine_precompiler_env || {},
	shine_precompiler_vm = new shine.VM(shine_precompiler_env),
	shine_precompiler_globals = shine_precompiler_vm._globals;



function setglobal_internal(key, value) {
	shine.gc.incrRef(value);
	shine.gc.decrRef(shine_precompiler_globals[key]);
	shine_precompiler_globals[key] = value;
}

