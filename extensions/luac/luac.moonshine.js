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

(function () {

	var	compileQueue = [],
		compile,
		script = document.querySelector('script[src$="/luac.moonshine.js"]'),
		yueliangUrl = (script? script.src.substr(0, script.src.length - 18) : '.') + '/yueliang.lua.json';




	function clearCompileQueue () {
		for (var i = 0, item; item = compileQueue[i]; i++) compile.apply(undefined, item);
	}




	function setCompiler (compileFunc) {
		compileFunc.retain();

		// When yeuliang script has returned a compiler, use this for future requests
		compile = function (code, callback) {
			var bc;

			try {
				bc = compileFunc.call(undefined, code)[0];

			} catch (e) {
				return callback(e.message);
			}

			callback(undefined, bc);
		};


		// Clear the backlog
		window.setTimeout(function () {
			clearCompileQueue();
		}, 1);
	}




	// Default compile function queues up requests
	compile = function compile (code, callback) {
		compileQueue.push([code, callback]);
	}



	
	shine.luac = {

		init: function (vm, url) {
			if (url) yueliangUrl = url;

			var shineLib = vm.getGlobal('shine');
			if (!shineLib) vm.setGlobal('shine', shineLib = new shine.Table());

			shineLib.setMember('setCompiler', setCompiler);
			vm.load(yueliangUrl);
		},


		compile: function (code, callback) {
			compile(code, callback);
		}

	};


})();
