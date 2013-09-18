

var shine = require('./vm/moonshine.js'),
	fs = require('fs');

shine.distillery = require('./distillery/distillery.moonshine.js');
shine.DebugServer = require('./debug/server/DebugServer');

window = global;




shine.utils.get = function (url, success, error) {
	fs.readFile(url, function (err, data) {
		if (err) return error(err.message);
		success(data);
	});
};




module.exports = shine;
