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


var shine = require('../../index'),
	parseArgs = require('./common').parseArgs,
	defaultSwitches = {
		jit: ['-jit', false]
	};


// If set, use LUA_PATH environment variable
shine.lib['package'].path = process.env.LUA_PATH || shine.lib['package'].path;




module.exports = {

	exec: function () {
		var vm = new shine.VM(),
			args = parseArgs(defaultSwitches),
			filenames = args.filenames,
			filename, i;

		shine.jit.enabled = args.switches.jit;

		for (i = 0; filename = filenames[i]; i++) {
			vm.load(filename);
		}

		process.on('uncaughtException', function (e) {
			var match;

			if (!e || !(e instanceof shine.Error) || !(match = e.message.match(/^Execution terminated \[(.*)\]/))) {
				throw e;
			}

			process.exit(parseInt(match[1]));
		});
	}

};