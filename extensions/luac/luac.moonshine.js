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
