
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



var create_func = function (def, upvals) {
	var cl = shine.gc.createObject();
	cl._upvalues = upvals || shine.gc.createArray();
	return def.bind(cl);
}

var shine_env = window.shine.env || {},
	shine_vm = new shine.VM(shine_env),
	shine_g = shine_vm._globals;



function setglobal_internal(key, value) {
	shine.gc.incrRef(value);
	shine.gc.decrRef(shine_g[key]);
	shine_g[key] = value;
}


var incr = shine.gc.incrRef;
var decr = shine.gc.decrRef.bind(shine.gc);
var collect = shine.gc.collect.bind(shine.gc);
var createArray = shine.gc.createArray.bind(shine.gc);

var get_upv = function(x){return this[x]};
var set_upv = function(x,y){setR(this,x,y)};
var EMPTY_ARR = shine.EMPTY_ARR;

// Scope = function () {}
// for (var i = 0; i < 256; i++) Scope.prototype['R'+i] = undefined;
function setR (register, index, value) {
	incr(value);
	decr(register[index]);
	register[index] = value;
}

// c29=call_internal(R[5],_=R.slice(6,8));R.length=5;collect(_);if(c29 instanceof Array){for(_=0;_<1;_++)setR(R,5+_,c29[_]);}else{setR(R,5,c29)}


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

// for(_=1;_<=3;_++)R[12].setMember(0+_,getupval(12+_));
function setlistT(R, t, index, keyStart, length) {
	// var t = R[index],
	// 	i;

	// for (i = 1; i <= length; i++) {
	// 	t.setMember(keyStart + i, R[index + i]);
	// }

	t.setMember(keyStart, R[index]);
	if (--length) setlistT(R, t, index + 1, keyStart + 1, length);
}


