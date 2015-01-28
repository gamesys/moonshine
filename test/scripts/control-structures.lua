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



