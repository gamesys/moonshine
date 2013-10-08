

'use strict';


var DebugServer = require('../../debug/server/DebugServer'),
	parseArgs = require('./common').parseArgs,
	defaultSwitches = {
		sourcePaths: ['-src', ''],
		appPort: ['-ap', ''],
		consolePort: ['-cp', '']
	};




module.exports = {

	exec: function () {

		var args = parseArgs(defaultSwitches),
			switches = args.switches,
			config = {
				sourcePaths: switches.sourcePaths && switches.sourcePaths.split(';'),
				appPort: switches.appPort,
				consolePort: switches.consolePort
			};

		new DebugServer(config);
	}

};