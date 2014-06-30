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

/**
 * @fileOverview Output streams.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */


'use strict';


(function (shine) {


	// Standard output
	shine.stdout = {};

	shine.stdout.write = function (message) {
		// Overwrite this in host application
		if (console && console.log) {
			console.log(message);
		} else if (trace) {
			trace(message);
		}
	};




	// Standard debug output
	shine.stddebug = {};

	shine.stddebug.write = function (message) {
		// Moonshine bytecode debugging output
	};




	// Standard error output
	shine.stderr = {};

	shine.stderr.write = function (message, level) {
		level = level || 'error';
		if (console && console[level]) console[level](message);
	};


})(shine || {});