--------------------------------------------------------------------------
-- Moonshine - a Lua virtual machine.
--
-- Copyright (C) 2013 Gamesys Limited,
-- 10 Piccadilly, London W1J 0DD
-- Email: moonshine@gamesys.co.uk
-- http://moonshinejs.org
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
--
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
-- GNU General Public License for more details.
--
-- You should have received a copy of the GNU General Public License
-- along with this program.  If not, see <http://www.gnu.org/licenses/>.
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

