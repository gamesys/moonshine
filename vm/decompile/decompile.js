var decompiler = require ('./decompiler'),
	parser = new decompiler.Parser (),
	filename = process.argv[2] || '';




parser.parse (filename, function (tree) {

	var fs = require ('fs');
	
	fs.writeFile (filename + '.js', JSON.stringify (tree), function (err) {
		if (err) throw new Error (err);
		console.log ('File written: ' + filename + '.js');
	});
	
});

