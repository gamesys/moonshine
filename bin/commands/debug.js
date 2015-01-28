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


var fs = require('fs'),
	DebugServer = require('../../extensions/debug/server/DebugServer'),
	COLORS = require('../../extensions/debug/server/constants').COLORS,
	parseArgs = require('./common').parseArgs,
	defaultSwitches = {
		sourcePaths: ['-src', ''],
		appPort: ['-ap', ''],
		consolePort: ['-cp', ''],
		pathMaps: ['-m', ''],
		configFile: ['-c', '']
	};




function parsePathMaps (mapStr) {
	var mapArr = mapStr.split(';'),
		map, 
		mapPair, 
		pattern, 
		result = {},
		i;

	for (i = 0; map = mapArr[i]; i++) {
		mapPair = map.split(':');
		pattern = mapPair[0].replace(/[\.\+\*\?\[\]\(\)\\\/\^\$\-]/g, function (c) { return '\\' + c; });
		pattern = pattern.replace('\\*\\*', '.+').replace('\\*', '[^\/\\]+');
		result[pattern] = mapPair[1];
	}

	return result;
}




module.exports = {

	exec: function () {
		require('./common').showLicense();

		var args = parseArgs(defaultSwitches),
			switches = args.switches,
			configFile = switches.configFile || './debug-config.json',
			config = {
				sourcePaths: switches.sourcePaths && switches.sourcePaths.split(';'),
				pathMaps: switches.pathMaps && parsePathMaps(switches.pathMaps),
				appPort: switches.appPort,
				consolePort: switches.consolePort,
				configFile: switches.configFile
			},
			json, i;


		if (!fs.existsSync(configFile)) {
			if (switches.configFile) throw ReferenceError('Config file not found: ' + configFile);

		} else {
			json = fs.readFileSync(configFile);

			try {
				json = JSON.parse(json);
			} catch (e) {
				throw new SyntaxError('Error while parsing "' + configFile + '": ' + e.message);
			}

			for (i in json) {
				if (!config[i]) config[i] = json[i];
			}

			console.log (COLORS.WHITE + 'Using config file: ' + configFile + COLORS.RESET);
		}

		new DebugServer(config);
	}

};