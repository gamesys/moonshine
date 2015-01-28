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


-- TABLE FUNCTIONS


-- concat

local a = {2, 4, "moo", 102}

local b = table.concat ({})
local c = table.concat ({}, ':')
local d = table.concat ({}, ', ', 3)
--local e = table.concat ({}, ', ', 3, 4)

local f = table.concat (a)
local g = table.concat (a, '-')
local h = table.concat (a, '..', 2)
local i = table.concat (a, '+', 2, 3)

assertTrue (b == '', 'table.concat() should return an empty string if passed an empty table [1]')
assertTrue (c == '', 'table.concat() should return an empty string if passed an empty table [2]')
assertTrue (d == '', 'table.concat() should return an empty string if passed an empty table [3]')
--assertTrue (e == '', 'table.concat() should return an empty string if passed an empty table [4]')

assertTrue (f == '24moo102', 'table.concat() should return all items in the table in argument 1 in a string with no spaces, when arguments 2 and 3 are absent')
assertTrue (g == '2-4-moo-102', 'table.concat() should return return all items in the table in argument 1 in a string delimited by argument 2, when argument 3 is absent')
assertTrue (h == '4..moo..102', 'table.concat() should return the items in the table in argument 1 from the nth index in a string delimited by argument 2, when n is the third argument')
assertTrue (i == '4+moo', 'table.concat() should return the items in the table in argument 1 from the nth index to the mth index in a string delimited by argument 2, when n is the third argument and m is the forth argument')




-- getn
do 
	local a = {'a', 'b', 'c'}
	local b = {'a', 'b', 'c', nil}
	local c = {'a', nil, 'b', 'c'}
	local d = {'a', nil, 'b', 'c', nil}
	local e = {'a', 'b', 'c', moo = 123 }
	local f = { moo = 123 }
	local g = {}
	
	assertTrue (table.getn (a) == 3, 'table.getn() should return the size of the array part of a table')
	assertTrue (table.getn (b) == 3, 'table.getn() should ignore nils at the end of the array part of a table')
	assertTrue (table.getn (c) == 4, 'table.getn() should include nils in the middle of the array part of a table')
	assertTrue (table.getn (d) == 1, 'table.getn() should return the same random value as C implementation when the last item is nil')
	assertTrue (table.getn (e) == 3, 'table.getn() should ignore the hash part of a table')
	assertTrue (table.getn (f) == 0, 'table.getn() should return zero when the array part of a table is empty')
	assertTrue (table.getn (g) == 0, 'table.getn() should return zero when the table is empty')
end




-- insert

local b = {}
local w = table.insert (b, 'Lewis')

local c = {}
local x = table.insert (c, 3, 'Jenson')

local d = {'We', 'exist', 'to'}
local y = table.insert (d, 'win')

local e = {1, 1998, 1, 1999}
local z = table.insert (e, 3, 'Mika')

local f = {'Kimi'}
local z2 = table.insert (f, 4, 2)

assertTrue (b[1] == 'Lewis', 'table.insert() should add argument 2 to the end of the table in argument 1, when the third argument is absent [1]')
assertTrue (b[2] == nil, 'table.insert() should only add argument 2 to the end of the table in argument 1, when the third argument is absent [2]')

assertTrue (c[1] == nil, 'table.insert() should pad the table with nils when the desired index is greater than the length of the table [1]')
assertTrue (c[2] == nil, 'table.insert() should pad the table with nils when the desired index is greater than the length of the table [2]')
assertTrue (c[3] == 'Jenson', 'table.insert() should add argument 2 to the end of the table in argument 1, when the third argument is greater than the length of the table [1]')
assertTrue (c[4] == nil, 'table.insert() should only add argument 2 to the end of the table in argument 1, when the third argument is greater than the length of the table [2]')

assertTrue (d[1] == 'We', 'table.insert()  should not affect existing items in the table when the third argument is missing [1]')
assertTrue (d[2] == 'exist', 'table.insert() should not affect existing items in the table when the third argument is missing [2]')
assertTrue (d[3] == 'to', 'table.insert() should not affect existing items in the table when the third argument is missing [3]')
assertTrue (d[4] == 'win', 'table.insert() should add argument 2 to the end of the table in argument 1, when the third argument is missing [1]')
assertTrue (d[5] == nil, 'table.insert() should only add argument 2 to the end of the table in argument 1, when the third argument is missing [2]')

assertTrue (e[1] == 1, 'table.insert() should not affect existing items in the table at indices less than that specified in the third argument [1]')
assertTrue (e[2] == 1998, 'table.insert() should not affect existing items in the table at indices less than that specified in the third argument [2]')
assertTrue (e[3] == 'Mika', 'table.insert() should add argument 3 into the table in argument 1 at the index specified in argument 2')
assertTrue (e[4] == 1, 'table.insert() should shift items in the table in argument 1 down by one after and including the index at argument 2 [1]')
assertTrue (e[5] == 1999, 'table.insert() should shift items in the table in argument 1 down by one after and including the index at argument 2 [2]')
assertTrue (e[6] == nil, 'table.insert() should only add one index to the table in argument 1 [1]')

assertTrue (f[1] == 'Kimi', 'table.insert() should not affect existing items in the table at indices less than that specified in the third argument [3]')
assertTrue (f[2] == nil, 'table.insert() should pad the table with nils when the desired index is greater than the length of the table [3]')
assertTrue (f[3] == nil, 'table.insert() should pad the table with nils when the desired index is greater than the length of the table [4]')
assertTrue (f[4] == 2, 'table.insert() should not affect existing items in the table at indices less than that specified in the third argument [2]')
assertTrue (f[5] == nil, 'table.insert() should only add one index to the table in argument 1 [2]')


assertTrue (w == nil, 'table.insert() should update list in place and return nil')
assertTrue (x == nil, 'table.insert() should update list in place and return nil')
assertTrue (y == nil, 'table.insert() should update list in place and return nil')
assertTrue (z == nil, 'table.insert() should update list in place and return nil')
assertTrue (z2 == nil, 'table.insert() should update list in place and return nil')


local function insertStringKey () 
	table.insert({}, 'string key', 1) 
end
a, b = pcall(insertStringKey)
assertTrue (a == false, 'table.insert() should error when passed a string key')


local function insertStringKey () 
	table.insert({}, '23', 1) 
end
a, b = pcall(insertStringKey)
assertTrue (a, 'table.insert() should not error when passed a string key that can be coerced to a number [1]')


local function insertStringKey () 
	table.insert({}, '1.23e33', 1)
end
a, b = pcall(insertStringKey)
assertTrue (a, 'table.insert() should not error when passed a string key that can be coerced to a number [2]')


local function insertStringKey () 
	table.insert({}, '-23', 1) 
end
a, b = pcall(insertStringKey)
assertTrue (a, 'table.insert() should not error when passed a string key that can be coerced to a negative number')




-- maxn

local a = table.maxn ({})
local b = table.maxn ({1, 2, 4, 8})
local c = table.maxn ({nil, nil, 123})


local d = {}
table.insert (d, 3, 'Moo')
local e = table.maxn (d)

assertTrue (a == 0, 'table.maxn() should return zero when passed an empty table')
assertTrue (b == 4, 'table.maxn() should return the highest index in the passed table [1]')
assertTrue (c == 3, 'table.maxn() should return the highest index in the passed table [2]')
assertTrue (e == 3, 'table.maxn() should return the highest index in the passed table [3]')

assertTrue (#d == 0, 'Length operator should return the first empty index minus one [1]')




-- remove

local a = {14, 2, "Hello", 298}
local b = table.remove (a)

local c = {14, 2, "Hello", 298}
local d = table.remove (c, 3)

local e = {14, 2}
local f = table.remove (e, 6)

local g = table.remove ({}, 1)

assertTrue (a[1] == 14, 'table.remove() should not affect items before the removed index [1]')
assertTrue (a[2] == 2, 'table.remove() should not affect items before the removed index [2]')
assertTrue (a[3] == "Hello", 'table.remove() should not affect items before the removed index [3]')
assertTrue (a[4] == nil, 'table.remove() should remove the last item in the table when second argument is absent')

assertTrue (b == 298, 'table.remove() should return the removed item [1]')

assertTrue (c[1] == 14, 'table.remove() should not affect items before the removed index [3]')
assertTrue (c[2] == 2, 'table.remove() should not affect items before the removed index [4]')
assertTrue (c[3] == 298, 'table.remove() should remove the item at the index specified by the second argument and shift subsequent item down')
assertTrue (c[4] == nil, 'table.remove() should decrease the length of the table by one')

assertTrue (d == 'Hello', 'table.remove() should return the removed item [2]')

assertTrue (e[1] == 14, 'table.remove() should not affect items before the removed index [5]')
assertTrue (e[2] == 2, 'table.remove() should not affect items before the removed index [6]')
assertTrue (e[3] == nil, 'table.remove() should not affect the table if the given index is past the length of the table')

assertTrue (f == nil, 'table.remove() should return nil if the given index is past the length of the table [1]')
assertTrue (g == nil, 'table.remove() should return nil if the given index is past the length of the table [2]')


c = {nil, nil, 123}
assertTrue (#c == 3, 'Length operator should return the first empty index minus one [2]')

table.remove (c, 1)
assertTrue (#c == 0, 'Length operator should return the first empty index minus one [3]')
assertTrue (c[1] == nil, 'table.remove() should shift values down if index <= initial length [1]')
assertTrue (c[2] == 123, 'table.remove() should shift values down if index <= initial length [2]')
assertTrue (c[3] == nil, 'table.remove() should shift values down if index <= initial length [3]')

table.remove (c, 1)
assertTrue (#c == 0, 'Length operator should return the first empty index minus one [4]')
assertTrue (c[1] == nil, 'table.remove() should not affect the array if index > initial length [1]')
assertTrue (c[2] == 123, 'table.remove() should not affect the array if index > initial length [2]')
assertTrue (c[3] == nil, 'table.remove() should not affect the array if index > initial length [3]')

table.remove (c, 2)
assertTrue (#c == 0, 'Length operator should return the first empty index minus one [5]')
assertTrue (c[1] == nil, 'table.remove() should not affect the array if index > initial length [4]')
assertTrue (c[2] == 123, 'table.remove() should not affect the array if index > initial length [5]')
assertTrue (c[3] == nil, 'table.remove() should not affect the array if index > initial length [6]')




-- sort

local a = { 1, 2, 3, 6, 5, 4, 20 }
table.sort (a)

assertTrue (a[1] == 1, 'table.sort() should sort elements into alphnumeric order, when not passed a sort function [1]')
assertTrue (a[2] == 2, 'table.sort() should sort elements into alphnumeric order, when not passed a sort function [2]')
assertTrue (a[3] == 3, 'table.sort() should sort elements into alphnumeric order, when not passed a sort function [3]')
assertTrue (a[4] == 4, 'table.sort() should sort elements into alphnumeric order, when not passed a sort function [4]')
assertTrue (a[5] == 5, 'table.sort() should sort elements into alphnumeric order, when not passed a sort function [5]')
assertTrue (a[6] == 6, 'table.sort() should sort elements into alphnumeric order, when not passed a sort function [6]')
assertTrue (a[7] == 20, 'table.sort() should sort elements into alphnumeric order, when not passed a sort function [7]')
assertTrue (a[8] == nil, 'table.sort() should not affect the table if the given index is past the length of the table')


local a = { 1, 2, 3, 6, 5, 4, 20 }
table.sort (a, function (a, b) return b < a end)

assertTrue (a[1] == 20, 'table.sort() should sort elements into order defined by sort function [1]')
assertTrue (a[2] == 6, 'table.sort() should sort elements into order defined by sort function [2]')
assertTrue (a[3] == 5, 'table.sort() should sort elements into order defined by sort function [3]')
assertTrue (a[4] == 4, 'table.sort() should sort elements into order defined by sort function [4]')
assertTrue (a[5] == 3, 'table.sort() should sort elements into order defined by sort function [5]')
assertTrue (a[6] == 2, 'table.sort() should sort elements into order defined by sort function [6]')
assertTrue (a[7] == 1, 'table.sort() should sort elements into order defined by sort function [7]')
assertTrue (a[8] == nil, 'table.sort() should not affect the table if the given index is past the length of the table')



