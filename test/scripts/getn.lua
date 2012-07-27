local a = {'a', 'b', 'c'}
local b = {'a', 'b', 'c', nil}
local c = {'a', nil, 'b', 'c'}
local d = {'a', nil, 'b', 'c', nil}
local e = {'a', 'b', 'c', moo = 123 }
local f = { moo = 123 }

print (table.getn (a))
print (table.getn (b))
print (table.getn (c))
print (table.getn (d))
print (table.getn (e))
print (table.getn (f))


c = {nil, nil, 123}
print (#c, c[1], c[2], c[3])

table.remove (c, 1)
print (#c, c[1], c[2], c[3])

table.remove (c, 1)
print (#c, c[1], c[2], c[3])

table.remove (c, 2)
print (#c, c[1], c[2], c[3])

