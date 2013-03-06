-- 
-- 
-- print ('MAIN', coroutine.running())
-- 
-- 
-- function wait ()
-- 	print ('WAIT', coroutine.running())
-- 	local t = os.time ()
-- 	
-- 	while os.time () - t < 3 do
-- 		coroutine.yield ()
-- 		print ('after wait yeild', t, os.time ())
-- 	end
-- end
-- 
-- 
-- function test ()
-- 	print ('TEST', coroutine.running())
-- 	local co = coroutine.create (wait)
-- 	
-- 	while coroutine.status (co) ~= 'dead' do
-- 		coroutine.resume (co)
-- 		coroutine.yield ()
-- 		print 'after test yeild'
-- 	end
-- end
-- 
-- 
-- local co = coroutine.create (test)
-- 
-- 
-- while coroutine.status (co) ~= 'dead' do
-- 	coroutine.resume (co)
-- 	print 'main yeild'
-- end
-- 
-- 










-- runningCoroutines = {};
-- 
-- function runCoroutine( func )
--     local co = coroutine.create( func );
--     table.insert( runningCoroutines, co );
--     return co;
-- end
-- 
-- function coroutineRunning( co )
--     return (coroutine.status(co) ~= "dead");
-- end
-- 
-- function updateAllCoroutines()
-- 	print ('UPDATE_ALL: '..tostring(coroutine.running()))
-- 
--     while( true )do
--         local size = #runningCoroutines;
-- 
--         if( size == 0 )then
--             break;
--         end
-- 
--         for i =1, size do
--             local result, errormsg = coroutine.resume( runningCoroutines[i] );
-- 			print 'returned to main loop'
--             if( false == result )then
--                 --assert( false, errormsg );
-- 				print( errormsg )
--             end
-- 
--             if( coroutine.status( runningCoroutines[i] ) == "dead" )then
--                 table.remove( runningCoroutines, i );
--                 size = size - 1;
-- 
--                 if( size == 0 )then
--                     --break;
--                 end
-- 
--             end
--         end
-- print ('allyield '..tostring(coroutine.running()))
--         coroutine.yield();
--     end
-- end
-- 
-- function waitSeconds( numSeconds )
--     local start = os.time();
-- 
--     while( (os.time() - start) < numSeconds )do
-- 		print ('waitSecondsYield '..tostring(coroutine.running()))
--         coroutine.yield();
--     end
-- 
--     return numSeconds;
-- end
-- 
-- function test ()
-- 	print ('TEST: '..tostring(coroutine.running()))
-- 	print 'start'
-- 	waitSeconds (2)
-- 	print 'stop'
-- end
-- 
-- print ('MAIN: '..tostring(coroutine.running()))
-- runCoroutine( test )
-- print (2)
-- updateAllCoroutines()
-- print (3)



-- 
-- local nums = {1,2,3,4,5,6,7,8,9}
-- local chars = {'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'}
-- local syms = {'!', '@', '£', '$', '%', '^', '&', '*', '(', ')'}
-- 
-- 
-- function outputChar ()
-- 	-- for _, x in pairs(chars) do
-- 	-- 	print (x)
-- 	-- 	coroutine.yield (x)
-- 	-- end
-- 
-- 
-- 
-- 	local start = os.time();
-- print (os.time() - start)
--     while( (os.time() - start) < 5 )do
-- 		-- print ('waitSecondsYield '..tostring(coroutine.running()))
--         coroutine.yield();
--     end
-- 
-- print ('done')
--     return numSeconds;
-- end
-- 
-- 
-- function outputNum ()
-- 	local co = coroutine.create(outputChar)
-- 
-- 	for _, x in pairs(nums) do
-- 		coroutine.resume (co)
-- 		print (x)
-- 		coroutine.yield (x)
-- 	end
-- end
-- 
-- function outputSym ()
-- 	local co = coroutine.create(outputNum)
-- 
-- 	for _, x in pairs(syms) do
-- 		coroutine.resume (co)
-- 		print (x)
-- print 'about to yield out out Lua'
-- 		coroutine.yield (x)
-- 	end
-- end
-- 
-- 
-- outputSym ()


-- 
-- 
-- function innerFunc ()
-- 	print 'inner: about to yield'
-- 	coroutine.yield ()
-- 	print 'inner: back from yield'
-- end
-- 
-- function midFunc ()
-- 	print 'mid: start'
-- 	innerFunc ()
-- 	print 'mid: end'
-- end
-- 
-- 
-- function outerFunc ()
-- 	print 'outer: 1'
-- 	midFunc ()
-- 	print 'outer: 2'
-- 	midFunc ()
-- 	print 'outer: 3'
-- end
-- 
-- 
-- print 'ready?'
-- 
-- co = coroutine.create (outerFunc)
-- for f = 1, 3 do
-- 	coroutine.resume (co)
-- 	print ('loop done '..f)
-- end




-- 
-- function test (a, b, ...)
-- --	print (a, ...)
-- 	print (arg, arg[1], arg.n, print)
-- --	system.debug (arg)
-- end
-- 
-- 
-- print (_VERSION, 2)
-- test (1,2,3,4,5,6,7,8)
-- 




local innerText = {'X','twelve              \\','ten               \\','six           \\','four        \\'}
local midText = {'X','thirteen             \\','nine             \\','seven          \\','three      \\'}
local outerText = {'two       \\','eight           \\','fourteen              \\','X'}
local loopText = {'five         \\','eleven             \\','fifteen                \\','X'}


function innerFunc (...)
	print (table.remove(innerText), 'Ia', ...)
	x = coroutine.yield (...)
	print (table.remove(innerText), 'Ib', x)
end

function midFunc ()
	print (table.remove(midText), 'Ma')
	innerFunc ('IIaa')
	print (table.remove(midText), 'Mb')
end


function outerFunc ()
	print (outerText[1], 'Oa')
	for i = 2,3 do
		midFunc ()
		print (outerText[i], 'Ob')
	end
end


print 'one      \\'

co = coroutine.create (outerFunc)
for f = 1, 3 do
	local x, y, z = coroutine.resume (co, 123)
--	coroutine.yield ()
	print (loopText[f], 'loop', x, y, z)
end

print 'sixteen                 \\'



