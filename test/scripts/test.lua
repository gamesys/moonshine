
local x, y = require 'lib-require'

function test (x)
	print ('test '..x)
end

print ('Hello')

test(1)
test(2)
test(3)

local a = 1
local b = 'sdfsdf'

print (a + b)

-- do
-- 	local a = 1

-- 	function getA ()
-- 		print 'this'
-- 		print 'is'
-- 		print 'a'
-- 		print 'function'
-- 		return a
-- 	end

-- 	function getB ()
-- 		local b = getA() + 1
-- 		return b
-- 	end

-- 	c = getA()
-- 	d = getB()

-- end

-- function foo()
-- 	print("foo", 1)
-- 	coroutine.yield()
-- 	print("foo", 2)
-- end

function assertTrue ()
		error('moo')
	print 'moo'
end

-- co = coroutine.create(foo)
-- coroutine.resume(co)
-- local moo = 'hello'
-- function xf ()
-- 	assertTrue()
-- 	local function moomin ()
-- 		error('moo')
-- 	end

-- 	moomin()
-- 	print 'a'
-- 	assertTrue()
-- end
-- xf()

local x, y = require 'lib-require'

print('moo1', x, y)
print(x.getValue())

-- c = 'moooooo'
-- print (b, c)

-- print('bum2')

