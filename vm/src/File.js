/**
 * @fileOverview File class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
 */


'use strict';


var shine = shine || {};


/**
 * Represents a Luac data file.
 * @constructor
 * @extends shine.EventEmitter
 * @param {String} url Url of the distilled JSON file.
 */
shine.File = function (url, data) {
	this.url = url;
	this.data = data;
};




/**
 * Dump memory associated with file.
 */
shine.File.prototype.dispose = function () {
	delete this.url;
	delete this.data;
};

