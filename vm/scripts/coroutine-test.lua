
local chars = {'a', 'b', 'c', 'd', 'e'}

function num () 
	for f = 1, 5 do
		print (f)
		coroutine.yield ()
	end
end

function alpha () 
	for f = 1, 5 do
		print (chars[f])
		coroutine.yield ()
	end
end

coalpha = coroutine.create (alpha)
conum = coroutine.create (num)


while (coroutine.status (coalpha) ~= 'dead') do
	coroutine.resume (coalpha)
	coroutine.resume (conum)
	print (	coroutine.status (coalpha))
end

