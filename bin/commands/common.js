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


var ESC = String.fromCharCode(27);


module.exports = {


	COLORS: {
		RED: ESC + '[31m',
		GREEN: ESC + '[32m',
		CYAN: ESC + '[36m',
		WHITE: ESC + '[37m',
		RESET: ESC + '[0m'
	},




	parseArgs: function (defaults) {
		var result = {
				switches: {},
				filenames: []
			},
			aliases = {},
			arg,
			i, l;

		defaults = defaults || {};

		for (i in defaults) {
			if (defaults.hasOwnProperty(i)) {
				aliases[defaults[i][0]] = i;
				aliases['--' + i.replace(/[A-Z]/g, function (char) { return '-' + char.toLowerCase(); })] = i;
				result.switches[i] = defaults[i][1];
			}
		}

		for (i = 3, l = process.argv.length; i < l; i++) {
			arg = process.argv[i];

			if (arg.substr(0, 1) == '-') {
				arg = aliases[arg] || arg;
				result.switches[arg] = (typeof result.switches[arg] == 'string')? process.argv[++i] : true;
			} else {
				result.filenames.push(arg);
			}
		}

		return result;
	},




	showLicense: function () {
		console.log('Moonshine Copyright (C) 2013 Gamesys Limited, Paul Cuthbertson.\n');
		console.log('This program comes with ABSOLUTELY NO WARRANTY.');
		console.log('This is free software, and you are welcome to redistribute it under certain conditions. Visit http://moonshinejs.org/license/ for details.\n');
	}


};
