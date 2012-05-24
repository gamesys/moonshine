
print 'Start'

local a = function () end
local b = function () end

o = {}

o[a] = 'X'
o[b] = 'B'

o[a] = 'A'


for k, v in pairs(o) do
	print (k, v, type(k))
end

print ('A'..o[a])
print ('B'..o[b])

print 'End'