

shine = require('../../vm/moonshine.js');
shine.jit = require('../../vm/src/jit.js');




var fs = require('fs'),
	functionIndex = 0;




function loadSource (path, callback) {
	var filename = process.argv[2];
	
	if (!filename) throw new ReferenceError('No source file provided.');

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
		funcs = [];

	for (i = 0; func = f.functions[i]; i++) {
		funcs[i] = parseFunction(f.functions[i], output);
	}

	index = functionIndex++;
	js = shine.jit.toJS({_data: f});


	js = js.replace(/(var cl=this,.*?;)/, '$1cl._globals=shine_precompiler_vm._globals;cl._localsUsedAsUpvalues=[];cl._functions=[' + funcs.map(function (f) {return 'shine_precompiler_func_'+f._index;}).toString() + '];');
	js = js.replace(/=new shine\.Function\(cl\._vm,cl\._file,cl\._functions\[(\d+)\],cl._globals/g, function (match, index) {return '=shine_precompiler_create_func(shine_precompiler_func_' + funcs[index]._index;});

	// func = window['shine_precompiler_func_' + index] = shine.operations.evaluateInScope(js);
	output.source += 'var shine_precompiler_func_' + index + '=' + js + ';';

	func = {};
	func._index = index;
	return func;
}




loadSource('TODO:filename', function (err, source) {
	if (err) throw err;

	var output = { source: '' },
		main = parseFunction(source, output),
		execute = 'shine_precompiler_create_func(shine_precompiler_func_' + main._index + ')();';


	fs.readFile('../../vm/src/operations.js', function (err, operations) {
		operations = '' + operations;

		fs.readFile('./_bootstrap.js', function (err, bootstrap) {
			bootstrap = '' + bootstrap;	

			data = operations.replace('// PRECOMPILER_CODE_INSERTION_POINT', bootstrap + output.source + execute);

			fs.writeFile('./output.js', data, function () {
				console.log ('DONE');
			});
		});
	});



})

