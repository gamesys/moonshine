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


var shine = require('./vm/moonshine.js'),
	fs = require('fs');

shine.distillery = require('./distillery/distillery.moonshine.js');
shine.DebugServer = require('./extensions/debug/server/DebugServer');

window = global;




shine.utils.get = function (url, success, error) {
	fs.readFile(url, function (err, data) {
		if (err) return error(err.message);
		success(data);
	});
};




module.exports = shine;
