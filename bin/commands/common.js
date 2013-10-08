

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
	}


};
