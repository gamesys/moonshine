

var shine = shine || {};


shine.EMPTY_OBJ = {};




shine.gc = { 


	objects: [],
	arrays: [],
	collected: 0,
	reused: 0,




	cacheArray: function (arr) {
		arr.length = 0;
		this.arrays.push(arr);
		shine.gc.collected++;
	},




	cacheObject: function (obj) {
		for (var i in obj) if (obj.hasOwnProperty(i)) delete obj[i];
		this.objects.push(obj);
		shine.gc.collected++;
	},




	createObject: function () { 
		if (shine.gc.objects.length) shine.gc.reused++;
		return shine.gc.objects.pop() || {};
	},




	createArray: function () {
		if (shine.gc.arrays.length) shine.gc.reused++;
		return shine.gc.arrays.pop() || [];
	},




	decrRef: function (val) {
		if (!val || !(val instanceof shine.Table) || val.__shine.refCount === undefined) return;
		if (--val.__shine.refCount == 0) this.collect(val);
	},




	incrRef: function (val) {
		if (!val || !(val instanceof shine.Table) || val.__shine.refCount === undefined) return;
		val.__shine.refCount++;
	},




	collect: function (val) {
		if (val === undefined || val === null) return;
		if (val instanceof Array) return this.cacheArray(val);
		if (typeof val == 'object' && val.constructor == Object) return this.cacheObject(val);

		if (!(val instanceof shine.Table) || val.__shine.refCount === undefined) return;

		var i, l, 
			meta = val.__shine;

		for (i = 0, l = meta.values.length; i < l; i++) this.decrRef(meta.values[i]);
		for (i = 0, l = meta.numValues.length; i < l; i++) this.decrRef(meta.numValues[i]);

		this.cacheArray(meta.keys);
		this.cacheArray(meta.values);

		delete meta.keys;
		delete meta.values;

		this.cacheObject(meta);
		delete val.__shine;

		for (i in val) if (val.hasOwnProperty(i)) this.decrRef(val[i]);
	}


};

