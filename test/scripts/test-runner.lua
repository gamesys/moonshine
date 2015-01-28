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



do
	local passed, failed = 0, 0
	local startTime
	local currentFile


	if getTimestamp then
		startTime = getTimestamp()
	end


	function assertTrue (condition, message)
		if not condition then 
			failed = failed + 1
			reportError(message)
		else
			passed = passed + 1
		end
		
		return condition
	end
	
	
	function assertEqual (actual, expected, message)
		if actual ~= expected and (actual == actual or expected == expected) then 
			failed = failed + 1
			reportError(message..'; expected "'..tostring(expected)..'", got "'..tostring(actual)..'".')
		else
			passed = passed + 1
		end
		
		return condition
	end
	
	
	function run (modName)
		currentFile = modName
		require(modName)
	end


	function reportError (message)
		if currentFile ~= lastErrorFile then
			print('\n-['..currentFile..']-----------------------------------------')
		end

		lastErrorFile = currentFile
		print('- '..message)
	end


	function showResults ()		
		local durationStr = ''

		if getTimestamp then
			local endTime = getTimestamp()
			durationStr = '\nCompleted in '..(endTime - startTime)..'ms.'
		end

		print "\n------------------------"
		if failed == 0 then
			print " Passed."
		else
			print "FAILED!"
		end

		print "------------------------\n"		
		print ("Total asserts: "..(passed + failed).."; Passed: "..passed.."; Failed: "..failed..durationStr)
	end

end




run 'operators'
run 'functions'
run 'tables'
run 'control-structures'
run 'coercion'
run 'metamethods'
run 'lib'
run 'lib-string'
run 'lib-table'
run 'lib-math'
run 'lib-coroutine'
run 'lib-date'



showResults()

