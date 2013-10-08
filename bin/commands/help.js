

'use strict';


var parseArgs = require('./common').parseArgs;


module.exports = {

	exec: function () {

		var args = parseArgs(),
			command = args.filenames[0];

		switch (command) {
			case 'distil':
			case 'debug':
				showMan(command);
				break;

			default:
				showGeneralHelp();
		}
	}

};




function showMan (command) {
	var spawn = require('child_process').spawn;
    spawn('man', ['moonshine-' + command], { stdio: 'inherit' });
}




function showGeneralHelp () {
	console.log('Usage: moonshine command [options]');
	console.log('\nWhere command is one of the following:');
	console.log('   distil\tPreprocess one or more Lua scripts.');
	console.log('   debug\tStart a remote debug server.');
	console.log('\nSee "moonshine help <command>" for more information on a specific command.');
}
