
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



