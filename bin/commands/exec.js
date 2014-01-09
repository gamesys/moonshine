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


var shine = require('../../index'),
	parseArgs = require('./common').parseArgs;


// If set, use LUA_PATH environment variable
shine.lib['package'].path = process.env.LUA_PATH || shine.lib['package'].path;




module.exports = {

	exec: function () {
		var vm = new shine.VM(),
			args = parseArgs(),
			filenames = args.filenames,
			filename, i;

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