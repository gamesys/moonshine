/**
 * @fileOverview Garbage collection namespace.
 * Collects and reuses vanilla objects and arrays to avoid the overhead of object creation.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
 */


'use strict';


var shine = shine || {};


/**
 * Constant empty object for use in comparisons, etc to avoid creating an object needlessly
 * @type Object
 * @constant
 */
shine.EMPTY_OBJ = {};


/**
 * Constant empty array for use in comparisons, etc to avoid creating an object needlessly
 * @type Object
 * @constant
 */
shine.EMPTY_ARR = [];




/**
 * Moonshine GC functions.
 * @namespace
 */
shine.gc = { 


	/**
	 * Collected objects, empty and ready for reuse.
	 * @type Array
	 * @static
	 */
	objects: [],


	/**
	 * Collected objects, empty and ready for reuse.
	 * @type Array
	 * @static
	 */
	arrays: [],


	/**
	 * Number of objects and array that have been collected. Use for debugging.
	 * @type Number
	 * @static
	 */
	collected: 0,


	/**
	 * Number of objects and array that have been reused. Use for debugging.
	 * @type Number
	 * @static
	 */
	reused: 0,




	/**
	 * Prepare an array for reuse.
	 * @param {Array} arr Array to be used.
	 */
	cacheArray: function (arr) {
		arr.length = 0;
		this.arrays.push(arr);
		this.collected++;
	},




	/**
	 * Prepare an object for reuse.
	 * @param {Object} obj Object to be used.
	 */
	cacheObject: function (obj) {
		for (var i in obj) if (obj.hasOwnProperty(i)) delete obj[i];
		this.objects.push(obj);
		this.collected++;
	},




	/**
	 * Returns a clean array from the cache or creates a new one if cache is empty.
	 * @returns {Array} An empty array.
	 */
	createArray: function () {
		if (this.arrays.length) this.reused++;
		return this.arrays.pop() || [];
	},




	/**
	 * Returns a clean object from the cache or creates a new one if cache is empty.
	 * @returns {Object} An empty object.
	 */
	createObject: function () { 
		if (this.objects.length) this.reused++;
		return this.objects.pop() || {};
	},




	/**
	 * Reduces the number of references associated with an object by one and collect it if necessary.
	 * @param {Object} Any object.
	 */
	decrRef: function (val) {
		if (!val || !(val instanceof shine.Table) || val.__shine.refCount === undefined) return;
		if (--val.__shine.refCount == 0) this.collect(val);
	},




	/**
	 * Increases the number of references associated with an object by one.
	 * @param {Object} Any object.
	 */
	incrRef: function (val) {
		if (!val || !(val instanceof shine.Table) || val.__shine.refCount === undefined) return;
		val.__shine.refCount++;
	},




	/**
	 * Collect an object.
	 * @param {Object} Any object.
	 */
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

