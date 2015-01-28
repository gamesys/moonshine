--------------------------------------------------------------------------
-- Moonshine - a Lua virtual machine.
--
-- Email: moonshine@gamesys.co.uk
-- http://moonshinejs.org
--
-- Copyright (c) 2013-2015 Gamesys Limited. All rights reserved.
--
-- Permission is hereby granted, free of charge, to any person obtaining
-- a copy of this software and associated documentation files (the
-- "Software"), to deal in the Software without restriction, including
-- without limitation the rights to use, copy, modify, merge, publish,
-- distribute, sublicense, and/or sell copies of the Software, and to
-- permit persons to whom the Software is furnished to do so, subject to
-- the following conditions:
--
-- The above copyright notice and this permission notice shall be
-- included in all copies or substantial portions of the Software.
--
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
-- EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
-- MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
-- IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
-- CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
-- TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
-- SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
--


-- Implicit in the fact that it's already using assertTrue()
assertTrue (mainGlobal2 == 'mainGlbl', 'Modules should have access to the same global namespace')
assertTrue (mainLocal == nil, 'Modules should not have access to the local scope of the caller')

local testModName = ...
assertTrue (testModName == 'lib-require', 'A module\'s name should be passed into the module using varargs.')


local sub = require 'lib-require.sub-module'	-- test dot syntax
assertTrue(type(sub) == 'table', 'Module should be able to load more modules.')

mainGlobal1 = 'innerGlbl'
local innerLocal = 'innerLoc'


return {
	getValue = function ()
		return 'modVal'
	end
}

