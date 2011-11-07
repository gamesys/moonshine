var sys = require ('sys'),
	decompiler = require ('./decompiler'),
	parser = new decompiler.Parser (),
	filename = process.argv[2] || '';




parser.parse (filename, function (tree) {

	var fs = require ('fs');
	
	fs.writeFile (filename + '.js', JSON.stringify (tree), function (err) {
		if (err) throw new Error (err);
		console.log ('File written: ' + filename + '.js');
	});
	
});




// function debugInstructions (instructions) {
// 	
// 	for (var i = 0, il = instructions.length; i < il; i++) {
// 		var hex = '';
// 		
// 		for (var j = 0, jl = t.instructions[i].length; j < jl; j++) {
// 		
// 			sys.print (t.instructions[i].charCodeAt (j) + '\t');
// 			hex = ('0000000' + t.instructions[i].charCodeAt (j).toString (2)).substr (-8) + hex;
// 		}
// 		
// 		sys.print ('\t' + hex + '\t(opcode: ' + parseInt (hex.substr (-6), 2) + ')\n');
// 	}
// }



