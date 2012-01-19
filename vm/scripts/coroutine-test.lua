

-- local chars = {'a', 'b', 'c', 'd', 'e'}
-- 
-- function num () 
-- 	for f = 1, 5 do
-- 		print (f)
-- 		coroutine.yield ()
-- 	end
-- end
-- 
-- function alpha () 
-- 	for f = 1, 5 do
-- 		print (chars[f])
-- 		coroutine.yield ()
-- 	end
-- end
-- 
-- coalpha = coroutine.create (alpha)
-- conum = coroutine.create (num)
-- 
-- while (coroutine.status (coalpha) ~= 'dead') do
-- 	coroutine.resume (coalpha)
-- 	coroutine.resume (conum)
-- 	print (coroutine.status (coalpha))
-- end



function task (a, b)
	print (a, b)

	a, b = coroutine.yield (a + 1, b + 1)
	print (a, b)

	error ('moo')
	
	a, b = coroutine.yield (16, 100)
	print (a, b)

	a, b = coroutine.yield (a, b)
	print (a, b)
	
	return 'mr_retval'
end

coroutine.yield(1,1)
task(0,0)

-- cotask = coroutine.create (task)
-- 
-- x, y = 12, 55
-- 
-- success, x, y = coroutine.resume (cotask, x, y)
-- print (success, x, y)
-- 
-- success, x, y = coroutine.resume (cotask, x * 2, y * 3)
-- print (success, x, y)
-- 
-- success, x, y = coroutine.resume (cotask, 111, -97)
-- print (success, x, y)
-- 
-- success, x, y = coroutine.resume (cotask, x, y)
-- print (success, x, y)
-- 
-- success, x, y = coroutine.resume (cotask, x, y)
-- print (success, x, y)



cotask = coroutine.wrap (task)

x, y = 12, 55

x, y = cotask (x, y)
print (x, y)

x, y = cotask (x * 2, y * 3)
print (x, y)

x, y = cotask (111, -97)
print (x, y)

x, y = cotask (x, y)
print (x, y)

x, y = cotask (x, y)
print (x, y)



