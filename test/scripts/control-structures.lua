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



local a, b, i = 0, 0, 0

for i = 1, 5 do
	a = a + 1
	b = b + i
end

assertTrue (a == 5, 'For loop should iterate the correct number of times')
assertTrue (b == 15, 'For loop variable should hold the value of the current iteration')


a = { a = 1, b = 2 }
b = 0

for _ in pairs(a) do b = b + 1 end

assertTrue (b == 2, 'For block should iterate over all properties of a table')


a.a = nil
b = 0

for _ in pairs(a) do b = b + 1 end

assertTrue (b == 1, 'Setting a table property to nil should remove that property from the table.')



b = {}

for i = 1, 3 do
	local c = i
	b[i] = function() return c end
end

assertTrue (b[1]() == 1, 'Local within a closure should keep its value [1]')
assertTrue (b[2]() == 2, 'Local within a closure should keep its value [2]')
assertTrue (b[3]() == 3, 'Local within a closure should keep its value [3]')


a = ''
u = {['@!#'] = 'qbert', [{}] = 1729, [6.28] = 'tau', [function () end] = 'test'}

for key, val in pairs(u) do
	a = a..'['..tostring(key)..'=='..tostring(val)..']'
end


assertTrue (string.find(a, '[6.28==tau]') ~= nil, 'for/pairs iteration should include items with double as key.')
assertTrue (string.find(a, '[@!#==qbert]') ~= nil, 'for/pairs iteration should include items with string as key.')
assertTrue (string.find(a, '[table: 0x%d+==1729]') ~= nil, 'for/pairs iteration should include items with table as key.')
assertTrue (string.find(a, '[function: 0x%d+==test]') ~= nil, 'for/pairs iteration should include items with function as key.')


local t = {nil, 1, 2} 
local s = ''

for i, v in ipairs(t) do 
    s = s..tostring(i)..'='..tostring(v)..';'
end

assertTrue (s == '', 'ipairs() should not iterate over nil values in a table.')


t = {3, 4, nil, 1, 2} 
s = ''

for i, v in ipairs(t) do 
    s = s..tostring(i)..'='..tostring(v)..';'
end

assertTrue (s == '1=3;2=4;', 'ipairs() should iterate over values up to but not including nil values in a table.')
