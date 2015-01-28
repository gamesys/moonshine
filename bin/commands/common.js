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
