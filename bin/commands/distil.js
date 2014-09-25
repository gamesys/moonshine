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


var Parser = require('../../distillery/distillery.moonshine.js').Parser,
	pathLib = require('path'),
	exec = require('child_process').exec,
	fs = require('fs'),
	COLORS = require('./common').COLORS,
	parseArgs = require('./common').parseArgs,
	defaultSwitches = {
		outputFilename: ['-o', ''],
		outputPath: ['-d', '.'],
		jsonFormat: ['-j', false],
		packageMain: ['-pm', ''],
		noRecursion: ['-R', false],
		stripDebugging: ['-s', false],
		watch: ['-w', false]
	};




module.exports = {

	exec: function () {
		var args = parseArgs(defaultSwitches);
		parseCommand(args);
	}

};




function parseCommand (args) {
	var files = [],
		outputPath = args.switches.outputPath,
		depth = args.switches.noRecursion? 1 : Infinity,
		watchCallback,
		outstanding = 0,
		path, isDir, root, filename,
		i, l;


	function success () {
		if (args.switches.watch) {
			var triggered = false,
				watches = [],
				callback = function (event) {
					if (!triggered) {
						triggered = true;
						while (watches[0]) watches.pop().close();

						console.log ('Changes spotted. Distilling...');
						parseCommand(args);
					} else {
						console.log ('trigger ignored');
					}
				};

			for (i = 0, l = args.filenames.length; i < l; i++) addWatch(args.filenames[i], watches, callback);
			console.log(COLORS.CYAN + 'Watching for changes...' + COLORS.RESET);
		}
	};


	for (i = 0, l = args.filenames.length; i < l; i++) {
		path = args.filenames[i];
		isDir = fs.lstatSync(path).isDirectory();
		root = isDir? path : pathLib.dirname(path);
		filename = isDir? '' : pathLib.basename(path);

		files.push.apply(files, getFileDestinations(root, outputPath, filename, depth));
	}


	if (args.switches.outputFilename && files.length > 1) {
		distilPackage(files, root, args.switches, success);

	} else {
		for (i = 0, l = files.length; i < l; i++) {
			outstanding++;

			distilFile(files[i][0], files[i][1], args.switches, function () { 
				if (!--outstanding) success();
			});

			if (!l) success();
		}
	}
}




function getRelativePath (path, from) {
	return pathLib.relative(from || '.', pathLib.resolve(path));
}




function getFileDestinations (root, dest, path, depth) {
	var filenames,
		filename = getRelativePath(root + '/' + path),
		stat = fs.lstatSync(filename),
		result = [],
		i, l;

	if (!stat.isDirectory()) return filename.substr(-4) == '.lua'? [[filename, getRelativePath(dest + '/' + path + '.json')]] : [];
	if (depth === 0 || stat.isSymbolicLink()) return [];

	filenames = fs.readdirSync(filename);

	for (i = 0, l = filenames.length; i < l; i++) {
		result.push.apply(result, getFileDestinations(root, dest, path + '/' + filenames[i], depth - 1));
	}

	return result;
}




function compile (filename, callback) {
	var luacFilename = filename + '.moonshine.luac',
		errPart;

	exec('luac -o ' + luacFilename + ' ' + filename, function (err, stdout, stderr) {
		if (err) {
			errPart = err.message.split(/:\s?/);
			if (errPart[1] != 'luac') throw e;
			
			console.error(COLORS.RED + 'Luac compile error in file ' + errPart[2] + ' on line ' + errPart[3] + ':\n\t' + errPart[4] + COLORS.RESET);
			return;
		}

		callback(fs.readFileSync(luacFilename, 'binary').toString());
		fs.unlink(luacFilename);
	});
}




function distil (source, switches, callback) {
	compile(source, function (bytecode) {
		
		var parser = new Parser(),
			config = {
				stripDebugging: switches.stripDebugging,
				useInstructionObjects: switches.jsonFormat
			};

		parser.parse(bytecode, config, callback);
	});
}




function createPath (path) {
	var pos = -1,
		name;

	while ((pos = path.indexOf('/', pos + 1)) >= 0) {
		name = path.substr(0, pos);
		if (name && !fs.existsSync(name)) fs.mkdirSync(name);
	}
}




function distilFile (source, destination, switches, callback) {

	distil(source, switches, function (tree) {
		var reversePath = getRelativePath(source, pathLib.dirname(destination)),
			dest = switches.outputFilename || destination;

		tree.sourcePath = reversePath;
		createPath(dest);

		fs.writeFile(dest, JSON.stringify(tree), function (err) {
			if (err) throw err;
			console.log(COLORS.GREEN + 'File written: ' + dest + COLORS.RESET);
			callback();
		});
	});
}




function distilPackage (files, root, switches, callback) {
	var fileQueue = [].concat(files),
		outputFilename = switches.outputFilename,
		packageMain = pathLib.relative('.', pathLib.resolve(switches.packageMain)),
		packageData = {
			format: 'moonshine.package',
			files: {},
			main: files[0][1]
		};


	function processNextFile () {
		var file, source, destination;

		if (!fileQueue.length) {
			createPath(outputFilename);

			fs.writeFile(outputFilename, JSON.stringify(packageData), function (err) {
				if (err) throw new Error(err);
				console.log(COLORS.GREEN + 'File written: ' + outputFilename + COLORS.RESET);

				callback();
			});

			return;
		}

		file = fileQueue.shift();
		source = file[0];
		destination = file[1];

		var main = (packageMain == source);
		if (main) packageData.main = destination;

		distil(source, switches, function (tree) {
			tree.sourcePath = getRelativePath(source, root + '/' + pathLib.dirname(destination));

			packageData.files[destination] = tree;
			console.log(COLORS.WHITE + 'Added to package: ' + source + (main? ' [main]' : '') + COLORS.RESET);

			processNextFile();
		});
	}

	processNextFile();
}




function addWatch (path, watches, callback) {
	var stat = fs.lstatSync(path),
		filenames,
		i, l;

	if (!stat.isDirectory()) return path.substr(-4) == '.lua'? watches.push(fs.watch(path, callback)) : undefined;
	if (stat.isSymbolicLink()) return;

	filenames = fs.readdirSync(path);

	for (i = 0, l = filenames.length; i < l; i++) {
		addWatch(path + '/' + filenames[i], watches, callback);
	}
}
