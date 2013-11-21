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

-- TODO: Explicitly test lib functions, such as wrap.


-- coroutines

local innerOrder = {'Y','twelve','ten','six','four'}
local midOrder = {'Z','thirteen','nine','seven','three'}
local outerOrder = {'two','eight','fourteen','A'}
local loopOrder = {'five','eleven','fifteen','B'}
local order = ''
local arguments = ''


function innerFunc (...)
	order = order..table.remove(innerOrder)

	local a, b, c = ...
	arguments = arguments..'Ia'..tostring(a)..tostring(b)..tostring(c)

	a, b, c = coroutine.yield (...)

	order = order..table.remove(innerOrder)
	arguments = arguments..'Ib'..tostring(a)..tostring(b)..tostring(c)
end


function midFunc ()
	order = order..table.remove(midOrder)
	arguments = arguments..'Ma'

	innerFunc ('IIaa')

	order = order..table.remove(midOrder)
	arguments = arguments..'Mb'
end


function outerFunc ()
	order = order..outerOrder[1]
	arguments = arguments..'Oa'

	for i = 2,3 do
		midFunc ()

		arguments = arguments..'Ob'
		order = order..outerOrder[i]
	end
end


order = order..'one'

co = coroutine.create (outerFunc)
for f = 1, 3 do
	local x, y, z = coroutine.resume (co, 123)
	order = order..loopOrder[f]
	arguments = arguments..'loop'..tostring(x)..tostring(y)..tostring(z)
end

order = order..'sixteen'


assertTrue (order == 'onetwothreefourfivesixseveneightnineteneleventwelvethirteenfourteenfifteensixteen', 'Coroutines should execute in the correct order')
assertTrue (arguments == 'OaMaIaIIaanilnillooptrueIIaanilIb123nilnilMbObMaIaIIaanilnillooptrueIIaanilIb123nilnilMbOblooptruenilnil', 'Coroutines should pass the correct values to and from yields and resumes')



