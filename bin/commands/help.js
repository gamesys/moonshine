/*
 * Moonshine - a Lua virtual machine.
 *
 * Copyright (C) 2013 Gamesys Limited,
 * 10 Piccadilly, London W1J 0DD
 * Email: moonshine@gamesys.co.uk
 * http://moonshinejs.org
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


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
	require('./common').showLicense();
	
	console.log('Usage: moonshine command [options]');
	console.log('\nWhere command is one of the following:');
	console.log('   distil\tPreprocess one or more Lua scripts.');
	console.log('   debug\tStart a remote debug server.');
	console.log('\nSee "moonshine help <command>" for more information on a specific command.');
}
