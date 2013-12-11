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


var DebugServer = require('../../extensions/debug/server/DebugServer'),
	parseArgs = require('./common').parseArgs,
	defaultSwitches = {
		sourcePaths: ['-src', ''],
		appPort: ['-ap', ''],
		consolePort: ['-cp', ''],
		pathMaps: ['-m', '']
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
			config = {
				sourcePaths: switches.sourcePaths && switches.sourcePaths.split(';'),
				pathMaps: switches.pathMaps && parsePathMaps(switches.pathMaps),
				appPort: switches.appPort,
				consolePort: switches.consolePort
			};

		new DebugServer(config);
	}

};