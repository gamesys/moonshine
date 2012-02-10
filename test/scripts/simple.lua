
print 'Hello World'

local function multiply (a, b)
	local x = 0
	
	for f = 1, b do
		x = x + a
	end
	
	return x
end

print (multiply (2, 3))
print ('2 x 3 = '..multiply (2, 3))

print ('x' / 2)

print ('end')