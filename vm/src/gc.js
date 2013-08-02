

var luajs = luajs || {};


luajs.EMPTY_OBJ = {};




luajs.gc = { 


	objects: [],
	arrays: [],
	collected: 0,
	reused: 0,




	cacheArray: function (arr) {
		arr.length = 0;
		this.arrays.push(arr);
		luajs.gc.collected++;
	},




	cacheObject: function (obj) {
		for (var i in obj) if (obj.hasOwnProperty(i)) delete obj[i];
		this.objects.push(obj);
		luajs.gc.collected++;
	},




	createObject: function () {
		if (luajs.gc.objects.length) luajs.gc.reused++;
		return luajs.gc.objects.pop() || {};
	},




	createArray: function () {
		if (luajs.gc.arrays.length) luajs.gc.reused++;
		return luajs.gc.arrays.pop() || [];
	},




	decrRef: function (val) {
		if (!val || !(val instanceof luajs.Table) || val.__luajs.refCount === undefined) return;
		if (--val.__luajs.refCount == 0) this.collect(val);
	},




	incrRef: function (val) {
		if (!val || !(val instanceof luajs.Table) || val.__luajs.refCount === undefined) return;
		val.__luajs.refCount++;
	},




	collect: function (val) {
		if (val === undefined || val === null) return;
		if (val instanceof Array) return this.cacheArray(val);
		if (typeof val == 'object' && val.constructor == Object) return this.cacheObject(val);

		if (!(val instanceof luajs.Table) || val.__luajs.refCount === undefined) return;

		var i, l, 
			meta = val.__luajs;

		for (i in val) if (val.hasOwnProperty(i)) this.decrRef(val[i]);
		for (i = 0, l = meta.values.length; i < l; i++) this.decrRef(meta.values[i]);
		for (i = 0, l = meta.numValues.length; i < l; i++) this.decrRef(meta.numValues[i]);

		this.cacheArray(val.__luajs.keys);
		this.cacheArray(val.__luajs.values);
		this.cacheObject(val.__luajs);
	}


};


