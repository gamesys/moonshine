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

