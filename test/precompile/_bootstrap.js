

var // Operators
	op = shine.operations.internal,
	getglobal_internal = op.getglobal,
	gettable_internal = op.gettable,
	// setglobal_internal = op.setglobal,
	settable_internal = op.settable,
	newtable_internal = op.newtable,
	self_internal = op.self,
	binary_arithmetic_internal = op.binary_arithmetic,
	add_internal = op.add,
	sub_internal = op.sub,
	mul_internal = op.mul,
	div_internal = op.div,
	mod_internal = op.mod,
	unm_internal = op.unm,
	len_internal = op.len,
	concat_internal = op.concat,
	eq_internal = op.eq,
	compare_internal = op.compare,
	call_internal = op.call,
	tforloop_internal = op.tforloop,
	close_internal = op.close,
	closure_upvalues = op.closure_upvalues,
	lt_func = op.lt_func,
	le_func = op.le_func,

	// VM
	shine_env = window.shine.env || {},
	shine_vm = new shine.VM(shine_env),
	shine_g = shine_vm._globals,

	// GC
	incr = shine.gc.incrRef,
	decr = shine.gc.decrRef.bind(shine.gc),
	collect = shine.gc.collect.bind(shine.gc),
	createArray = shine.gc.createArray.bind(shine.gc),

	// Constants
	EMPTY_ARR = shine.EMPTY_ARR;




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

function setglobal_internal(key, value) {
	incr(value);
	decr(shine_g[key]);
	shine_g[key] = value;
}



function get_upv (x) {
	return this[x]
}


function set_upv (x,y) {
	setR(this,x,y)
};


function setR (register, index, value) {
	incr(value);
	decr(register[index]);
	register[index] = value;
}


function clearR (register, index) {
	for (var i = index, l = register.length; i < l; i++) decr(register[i]);
	register.length = index - 1;
}


function setRArr (register, index, limit, arr) {
	for (var i = index, l = register.length; i < l; i++) decr(register[i]);
	register.length = index;

	if (!(arr instanceof Array)) arr = [arr];

	for (var i = 0, l = limit || arr.length; i < l; i++) {
		incr(register[index + i] = arr[i]);
	}
}


function callR (register, index, c, argStart, argEnd) {
	var args, result;

	if (!argStart) {
		args = createArray();
	} else if (!argEnd) {
		args = register.slice(argStart);
	} else {
		args = register.slice(argStart, argEnd);
	}
	
	result = call_internal(register[index],args);

	register.length = index;
	collect(args);

	if (c == 1) return;

	if (!(result instanceof Array)) {
		setR(register, index, result);
	
	} else {
		result.unshift(index, 0);
		Array.prototype.splice.apply(register, result);

		collect(result);
	}
}


function setlistT(R, t, index, keyStart, length) {
	t.setMember(keyStart, R[index]);
	if (--length) setlistT(R, t, index + 1, keyStart + 1, length);
}



function create_func (def, upvals) {
	var cl = shine.gc.createObject(),
		f;

	cl._upvalues = upvals || shine.gc.createArray();
	f = def.bind(cl);
	f.__proto__ = def;

	return f;
}



