

shine = require('../../vm/moonshine.js');
shine.jit = require('../../vm/src/jit.js');




var fs = require('fs'),
	functionIndex = 0;



function convertInstructions (source) {
	var instructions = source.instructions || [],
		buffer,
		result,
		i, l,
		instruction,
		offset;
	
	if (instructions instanceof Int32Array) return;

	if (instructions.length == 0 || instructions[0].op === undefined) {
		buffer = new ArrayBuffer(instructions.length * 4);
		result = new Int32Array(buffer);

		result.set(instructions);
		source.instructions = result;

		return;
	}

	buffer = new ArrayBuffer(instructions.length * 4 * 4);
	result = new Int32Array(buffer);
		

	for (i = 0, l = instructions.length; i < l; i++) {
		instruction = instructions[i];
		offset = i * 4;

		result[offset] = instruction.op;
		result[offset + 1] = instruction.A;
		result[offset + 2] = instruction.B;
		result[offset + 3] = instruction.C;
	}

	source.instructions = result;
};





function loadSource (filename, callback) {
	fs.readFile(filename, function (err, json) {
		var source;

		if (err) return err;

		try {
			source = JSON.parse('' + json);
		} catch (e) {
			throw new Error('Unable to parse source file. Are you sure it\'s a valid JSON file?');
		}

		callback(null, source);
	});
}




function parseFunction (f, output) {
	var func, i, index, js,
		funcs = [], init;

	convertInstructions(f);

	for (i = 0; func = f.functions[i]; i++) {
		funcs[i] = parseFunction(f.functions[i], output);
	}

	index = functionIndex++;
	js = shine.jit.toJS({_data: f});


	init = '$1cl._localsUsedAsUpvalues=createArray();';
	if (funcs.length) init += 'cl._functions=[' + funcs.map(function (f) {return 'shine_precompiler_func_'+f._index;}).toString() + '];';

	js = js.replace(/(var cl=this,.*?;)/, init);
	js = js.replace(/=new shine\.Function\(cl\._vm,cl\._file,cl\._functions\[(\d+)\],cl._globals/g, function (match, index) {return '=create_func(shine_precompiler_func_' + funcs[index]._index;});

	// func = window['shine_precompiler_func_' + index] = shine.operations.evaluateInScope(js);
	output.source += '\n\n/* line:' + f.lineDefined + ' */\nfunction shine_precompiler_func_' + index + '(){\n' + js.substr(11);

	func = {};
	func._index = index;
	return func;
}







var filename = process.argv[2];
if (!filename) throw new ReferenceError('No source file provided.');


loadSource(filename, function (err, source) {
	if (err) throw err;

	var output = { source: '' },
		preload = '',
		main, execute, def, match,
		func, i;


	if (source.format == 'moonshine.package') {
		for (i in source.files) {
			output.source += '\n\n/********************\n    file:' + i + '\n ******************/\n\n';
			if (!(match = i.match(/(.*)\.lua\.json$/))) {
				console.warn('File does not end in .lua.json.');
			} else {
				func = parseFunction(source.files[i], output);
				preload += 'shine.lib["package"].preload["' + match[1].replace(/\//g, '.') + '"]=create_func(shine_precompiler_func_' + func._index + ');\n';
				if (i == source.main) main = func;
			}
		}

	} else {
		main = parseFunction(source, output);
	}

	execute = 'create_func(shine_precompiler_func_' + main._index + ')();';


	fs.readFile('../../vm/src/operations.js', function (err, operations) {
		operations = '' + operations;

		fs.readFile('./_bootstrap.js', function (err, bootstrap) {
			bootstrap = '' + bootstrap;	

			data = operations.split('// PRECOMPILER_CODE_INSERTION_POINT');
			data = data[0] + bootstrap + output.source + preload + execute + data[1];

			fs.writeFile('./output.js', data, function () {
				console.log ('DONE');
			});
		});
	});

})

