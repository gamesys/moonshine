--------------------------------------------------------------------------
-- Moonshine - a Lua virtual machine.
--
-- Copyright (C) 2013 Gamesys Limited,
-- 10 Piccadilly, London W1J 0DD
-- Email: moonshine@gamesys.co.uk
-- http://moonshinejs.org
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
--
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
-- GNU General Public License for more details.
--
-- You should have received a copy of the GNU General Public License
-- along with this program.  If not, see <http://www.gnu.org/licenses/>.
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

