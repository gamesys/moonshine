
shine = shine || {};

shine.Function = function () {};

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

