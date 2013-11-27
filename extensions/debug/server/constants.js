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


var ESC = String.fromCharCode(27);


module.exports = {

	MESSAGE_TYPES: {
		ENGINE_STATE_CHANGED: 0,
		LUA_LOADED: 1,
		LUA_LOAD_FAILED: 2,
		BREAKPOINTS_UPDATED: 3,
		BREAKPOINT_UPDATED: 4,
		STOP_AT_BREAKPOINTS_UPDATED: 5,
		ERROR: 6,

		GET_STATE: 100,
		TOGGLE_BREAKPOINT: 101,
		TOGGLE_STOP_AT_BREAKPOINTS: 102,
		STEP_IN: 103,
		STEP_OVER: 104,
		STEP_OUT: 105,
		PAUSE: 106,
		RESUME: 107,
		RELOAD: 108,
		TOGGLE_AUTO_STEP: 109
	},


	COLORS: {
		RED: ESC + '[31m',
		GREEN: ESC + '[32m',
		CYAN: ESC + '[36m',
		WHITE: ESC + '[37m',
		RESET: ESC + '[0m'
	}

};

