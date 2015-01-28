/*
 * Moonshine - a Lua virtual machine.
 *
 * Email: moonshine@gamesys.co.uk
 * http://moonshinejs.org
 *
 * Copyright (c) 2013-2015 Gamesys Limited. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
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
