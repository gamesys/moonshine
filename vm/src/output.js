/**
 * @fileOverview Output streams.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
 */


var shine = shine || {};




// Standard output
shine.stdout = {};

shine.stdout.write = function (message) {
	// Overwrite this in host application
	if (console && console.log) {
		console.log(message);
	} else if (trace) {
		trace(message);
	}
};




// Standard debug output
shine.stddebug = {};

shine.stddebug.write = function (message) {
	// Moonshine bytecode debugging output
};




// Standard error output
shine.stderr = {};

shine.stderr.write = function (message, level) {
	level = level || 'error';
	if (console && console[level]) console[level](message);
};

