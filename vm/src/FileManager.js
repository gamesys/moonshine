/**
 * @fileOverview FileManager class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
 */

var shine = shine || {};



/**
 * Handles loading packages and distilled scripts.
 * @constructor
 * @extends shine.EventEmitter
 * @param {String} url Url of the distilled JSON FileManager.
 */
shine.FileManager = function () {
	shine.EventEmitter.call(this);

	this._cache = {};
};


shine.FileManager.prototype = new shine.EventEmitter();
shine.FileManager.prototype.constructor = shine.FileManager;




/**
 * Loads a file or package.
 */
shine.FileManager.prototype.load = function (url, callback) {
	var me = this,
		data;

	function success (data) {
		data = JSON.parse(data);
		me._cache[url] = data;

		me._onSuccess(url, data, callback);
	}

	function error (code) {
		me._onError(code, callback);
	}


	switch (typeof url) {
		case 'string':
			if (data = this._cache[url]) {
				window.setTimeout(function () { me._onSuccess(url, data, callback); }, 1);

			} else {
				shine.utils.get(url, success, error);
			}

			break;

		case 'object':
			this._onSuccess('', url, callback);

		default: 
			throw new TypeError('Can\'t load object of unknown type');
	}
};




/**
 * Handles a successful response from the server.
 * @param {String} data Response.
 */
shine.FileManager.prototype._onSuccess = function (url, data, callback) {
	var file, i;

	if (data.format == 'moonshine.package') {
		for (i in data.files) this._cache[i] = data.files[i];
		this._trigger('loaded-package', data);

		if (!(url = data.main)) return;
		if (!(data = data.files[url])) throw new ReferenceError("The package's main reference does not point to a filename within the package");
	}

	file = new shine.File(url, data);
	
	this._onFileLoaded(file, function () {
		callback(null, file);
	});
};




/**
 * Hook called when a distilled file is loaded successfully. Overridden by debug engine.
 * @param {String} data Response.
 */
shine.FileManager.prototype._onFileLoaded = function (callback) {
	callback();
};




/**
 * Handles an unsuccessful response from the server.
 * @param {Number} code HTTP resonse code.
 */
shine.FileManager.prototype._onError = function (code, callback) {
	callback(code);
};




/**
 * Dump memory associated with FileManager.
 */
shine.FileManager.prototype.dispose = function () {
	delete this.url;
	delete this.data;
};

