

VALID_COMETD_URL = 'http://localhost:8082/cometd'





do
	local passed, failed, pending = 0, 0, 0
	

	function assertTrue (condition, message)

		if not condition then 
			failed = failed + 1
			print (message)
		else
			passed = passed + 1
		end
		
		return condition
	end


	function testCallback (callback)
		pending = pending + 1
		
		wrap = function (a, b, c, d, e) 
			callback (a, b, c, d, e)

			pending = pending - 1
			showResults ()
		end
		
		return wrap
	end
	
	
	function showResults ()
		
		if pending == 0 then		
			print "\n------------------------"
			if failed == 0 then
				print " Passed."
			else
				print "FAILED!"
			end

			print "------------------------\n\n"		
			print ("Total asserts: "..(passed + failed).."; Passed: "..passed.."; Failed: "..failed)
		end
	end


end



-- General

assertTrue (display ~= nil, 'display global should exist')
assertTrue (comms ~= nil, 'comms global should exist')
assertTrue (system ~= nil, 'system global should exist')
assertTrue (session ~= nil, 'session global should exist')



-- System

assertTrue (system.createTimeout ~= nil, 'system should have method createTimeout ()')

--TODO Remove comments once implemented in API
--local t = system.createTimeout (10, function () print ('timeout tick') end)
--assertTrue (t ~= nil, 'system.createTimeout () should return an object');
--assertTrue (t.stop ~= nil, 'Object returned from system.createTimeout () should have method stop ()');




-- Session

assertTrue (session.getProperty ~= nil, 'session should have method getProperty ()')




-- Comms

assertTrue (comms.createCometDConnection ~= nil, 'comms should have method createCometConnection ()')

local c

local cb = function ()
print ('callback called')

	local s = c.subscribe ('/service/table/list')
	assertTrue (s ~= nil, 'CometDConnection.subscribe() should return an object')
	
	local o = c.unsubscribe (s)
	assertTrue (o == c, 'CometDConnection.unsubscribe() should return the CometDConnection object')
	
	o = c.publish ('/service/table/list', {})
	assertTrue (o == c, 'CometDConnection.publish() should return the CometDConnection object')

print ('callback ended')
end


-- 
-- c = comms.createCometDConnection {
-- 	url = VALID_COMETD_URL,
-- 	success = testCallback (cb)
-- }
-- 
-- assertTrue (c ~= nil, 'comms.createCometConnection () should return an object')
-- 
-- assertTrue (c.subscribe ~= nil, 'CometDConnection should have method subscribe ()')
-- assertTrue (c.unsubscribe ~= nil, 'CometDConnection should have method unsubscribe ()')
-- assertTrue (c.publish ~= nil, 'CometDConnection should have method publish ()')
-- 




-- comms.get

assertTrue (comms.get ~= nil, 'comms should have method get()')

cb = function (data)
	assertTrue (string.find (data, '<title>Engine API Test</title>', 0, true) ~= nil, 'comms.get() should return the response from a given url')
end

local a = comms.get { url = './index.html', success = testCallback (cb) }
assertTrue (a == nil, 'comms.get () should always return nil')




-- comms.post
-- TODO Test config.data

assertTrue (comms.post ~= nil, 'comms should have method post()')

cb = function (data)
	assertTrue (string.find (data, '<title>Engine API Test</title>', 0, true) ~= nil, 'comms.post() should return the response from a given url')
end

local a = comms.post { url = './index.html', success = testCallback (cb) }
assertTrue (a == nil, 'comms.post() should always return nil')











-- Display

local stage = display.getStage ()
assertTrue (stage ~= nil, 'display.getStage should return a value')

















showResults ()