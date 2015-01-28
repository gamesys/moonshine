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



