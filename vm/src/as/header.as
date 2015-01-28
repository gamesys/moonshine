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

package {
	import flash.utils.getQualifiedClassName;
	import flash.utils.setTimeout;


	public class Moonshine {


		private var VM : Object;
		public static var Table : Object;
		public static var utils : Object;
		public static var lib : Object;




		public function execute(file : Object) : void {
			var data = file.data,
				url, i;
			
			if (data.format == 'moonshine.package') {
				for (i in data.files) VM.fileManager._cache[i] = data.files[i];

				if (!(url = data.main)) throw new ReferenceError("Package does not have a main reference");
				if (!(data = data.files[url])) throw new ReferenceError("The package's main reference does not point to a filename within the package");

				file = {
					url: url,
					data: data
				};
			}

			VM.execute(false, file);
		}




		public function Moonshine(env : Object) {
			var console : Object;

			var window : Object = {};
			window.setTimeout = setTimeout;
			window.isNaN = isNaN;

			var JSON : Object;
			var ArrayBuffer : Object;
			var Uint8Array : Object;
			var Int32Array : Object;
			var XMLHttpRequest : Function = function () {};
			var eval : Function = function () {};


			// Polyfill from MDN (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind) 
			if (!Function.prototype.bind) {
				Function.prototype.bind = function(oThis) {
					if (typeof this !== 'function') {
						// closest thing possible to the ECMAScript 5
						// internal IsCallable function
						throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
					}

					var aArgs   = Array.prototype.slice.call(arguments, 1),
							fToBind = this,
							fNOP    = function() {},
							fBound  = function() {
								return fToBind.apply(this instanceof fNOP && oThis
											 ? this
											 : oThis,
											 aArgs.concat(Array.prototype.slice.call(arguments)));
							};

					fNOP.prototype = this.prototype;
					fBound.prototype = new fNOP();

					return fBound;
				};
			}
