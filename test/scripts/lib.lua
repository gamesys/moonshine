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


-------------
-- LIBRARY --
-------------


-- MAIN FUNCTIONS


-- assert
local ass = function (test)
	return assert (test, 'error message')
end

a, b, c = pcall (ass, true)
assertTrue (a, 'Assert should not throw an error when passed true')
assertTrue (b, 'Assert should return the value passed in the first return value')
assertTrue (c == 'error message', 'Assert should return the message passed in the second return value')

a, b, c = pcall (ass, 0)
assertTrue (a, 'Assert should not throw an error when passed 0')

a, b, c = pcall (ass, 1)
assertTrue (a, 'Assert should not throw an error when passed 1')

a, b, c = pcall (ass, '')
assertTrue (a, 'Assert should not throw an error when passed an empty string')

a, b, c = pcall (ass, nil)
assertTrue (not a, 'Assert should throw an error when passed nil')
--assertTrue (b == 'error message', 'Assert should throw an error with the given message')

a, b, c = pcall (ass, false)
assertTrue (not a, 'Assert should throw an error when passed false')






-- getmetatable
-- TODO


function paul1 ()
	function paul2 ()
		local a = 'a'..6
	end
	
	paul2 ()
end
paul1 ()


-- ipairs

local a = {2,4,8}
local b = ''

for i, v in ipairs(a) do
	b = b..'['..i..'='..v..']'
end

assertTrue (b == '[1=2][2=4][3=8]', 'ipairs() should iterate over table items [1]')




-- load

if (arg and arg[-1] == 'moonshine') then
	src = '{"sourceName":"@test.lua","lineDefined":0,"lastLineDefined":0,"upvalueCount":0,"paramCount":0,"is_vararg":2,"maxStackSize":2,"instructions":[1,0,0,0,30,0,2,0,30,0,1,0],"constants":["hello"],"functions":[],"linePositions":[82,82,82],"locals":[],"upvalues":[],"sourcePath":"./test.lua"}'
else
	src = 'return "hello"'
end

local index = 0
local function getChar ()
	index = index + 1
	return string.sub(src, index, index)
end

local f = load(getChar)
assertTrue (type(f) == 'function', 'load() should return a function when passed a valid source string')

local result = f();
assertTrue (result == 'hello', 'The function returned from load() should return the value from the script')




-- loadfile

local f = loadfile('scripts/not-a-file.luac')
assertTrue (f == nil, 'loadfile() should return nil when passed an invalid filename')


mainGlobal1 = 'mainGlbl'
mainGlobal2 = 'mainGlbl'

local mainLocal = 'mainLoc'

f = loadfile('lib-loadfile.lua')
assertTrue (type(f) == 'function', 'loadfile() should return a function when passed a valid filename')

local result = f();

assertTrue (type(result) == 'table', 'The function returned from loadfile() should return the value from the script')
assertTrue (type(result.getValue) == 'function', 'The function returned from loadfile() should return the value that is returned from the script[1]')
assertTrue (result.getValue() == 'moo', 'The function returned from loadfile() should return the value that is returned from the script[2]')

assertTrue (mainGlobal1 == 'innerGlbl', 'The function returned from loadfile() should share the same global namespace as the outer script[1]')
assertTrue (mainGlobal2 == 'mainGlbl', 'The function returned from loadfile() should share the same global namespace as the outer script[2]')
assertTrue (innerLocal == nil, 'Function locals should not leak into outer environment in a loadfile() function call')




-- loadstring

local f = loadstring(src)
assertTrue (type(f) == 'function', 'loadstring() should return a function when passed a valid source string')

local result = f()
assertTrue (result == 'hello', 'The function returned from loadstring() should return the value from the script')




-- pairs

local a, b = "", {foo=1}
b["bar"] = "Hello",
table.insert(b, 123)

for i, v in pairs(b) do
	a = a..i..':'..v..';'
end

assertTrue (#a == #'1:123;bar:Hello;foo:1;', 'pairs() should iterate over table items [2]')	-- Have to compare lengths because order is arbitrary




-- pcall

function goodfunc (x) 
	return x + 1, x + 2
end 

function badfunc ()
	error ('I\'m bad.')
end 

a, b, c = pcall (goodfunc, 6)

assertTrue (a == true, 'pcall() should return true in the first item when a function executes successfully')
assertTrue (b == 7, 'pcall() should return the result of the function in the items following the first item returned, when a function executes successfully [1]')
assertTrue (c == 8, 'pcall() should return the result of the function in the items following the first item returned, when a function executes successfully [2]')


a, b, c = pcall (badfunc, 6)

assertTrue (a == false, 'pcall() should return false in the first item when the function errors during execution')
assertTrue (not (b == nil), 'pcall() should return an error message in the second item when the function error during execution')
assertTrue (c == nil, 'pcall() should only return 2 items when the function error during execution')





-- rawequal
-- rawget
-- rawset

-- TODO




-- require
	
mainGlobal1 = 'mainGlbl'
mainGlobal2 = 'mainGlbl'

local mainLocal = 'mainLoc'

local result = require 'lib-require'

assertTrue (type(result) == 'table', 'require() should return a table')
assertTrue (type(result.getValue) == 'function', 'require() should return the value that is returned from the module[1]')
assertTrue (result.getValue() == 'modVal', 'require() should return the value that is returned from the module[2]')

assertTrue (package.loaded['lib-require'] == result, 'Module loaded by require() should also be available in package.loaded[modname]')

assertTrue (mainGlobal1 == 'innerGlbl', 'require() should pass the same global namespace into the module[1]')
assertTrue (mainGlobal2 == 'mainGlbl', 'require() should pass the same global namespace into the module[2]')
assertTrue (innerLocal == nil, 'Module locals should not leak into outer environment in a require() call')






-- select

local a, b, c, d = select (3, 2, 4, 6, 8, 10)

assertTrue (a == 6, 'select() should return its own arguments from the (n + 1)th index, where n is the value of the first argument [1]')
assertTrue (b == 8, 'select() should return its own arguments from the (n + 1)th index, where n is the value of the first argument [2]')
assertTrue (c == 10, 'select() should return its own arguments from the (n + 1)th index, where n is the value of the first argument [3]')
assertTrue (d == nil, 'select() should return its own arguments from the (n + 1)th index, where n is the value of the first argument [4]')


local a, b = select ('#', 2, 4, 6, 8, 10)

assertTrue (a == 5, 'select() should return the total number of arguments - 1, when the first argument is "#" [1]')
assertTrue (b == nil, 'select() should return the total number of arguments - 1, when the first argument is "#" [2]')


local f = function ()
	local x, y = select ('moo', 2, 4, 6, 8, 10)
end

local a, b = pcall (f)

assertTrue (a == false, 'select() should error if the first argument is not a number or a string with the value of "#"')




-- setmetatable
-- TODO




-- tonumber

local a = tonumber ('1234')
local b = tonumber ('1234 ')
local c = tonumber (' 1234 ')
local d = tonumber ('1234abc')
local e = tonumber ('1234 12')
local f = tonumber ('1.234')
local g = tonumber ('1.234e+5')
local h = tonumber ('1.234e-5')

assertTrue (a == 1234, 'tonumber() should convert basic numeric strings to decimal and default to base 10')
assertTrue (b == 1234, 'tonumber() should convert numeric strings suffixed with spaces [1]')
assertTrue (c == 1234, 'tonumber() should convert numeric strings prefixed with spaces [1]')
assertTrue (d == nil, 'tonumber() should not convert strings containing letters [1]')
assertTrue (e == nil, 'tonumber() should not convert numeric strings containing spaces in the middle [1]')
assertTrue (f == 1.234, 'tonumber() should convert numeric strings of floating point numbers at base 10 [1]')
assertTrue (g == 123400, 'tonumber() should convert numeric strings of exponential (+ve) numbers at base 10 [1]')
assertTrue (h == 0.00001234, 'tonumber() should convert numeric strings of exponential (-ve) numbers at base 10 [1]')


local a = tonumber ('1234', 10)
local b = tonumber ('1234 ', 10)
local c = tonumber (' 1234 ', 10)
local d = tonumber ('1234abc', 10)
local e = tonumber ('1234 12', 10)
local f = tonumber ('1.234', 10)
local g = tonumber ('1.234e+5', 10)
local h = tonumber ('1.234e-5', 10)

assertTrue (a == 1234, 'tonumber() should convert basic numeric strings to decimal with base 10')
assertTrue (b == 1234, 'tonumber() should convert numeric strings suffixed with spaces [2]')
assertTrue (c == 1234, 'tonumber() should convert numeric strings prefixed with spaces [2]')
assertTrue (d == nil, 'tonumber() should not convert strings containing letters [2]')
assertTrue (e == nil, 'tonumber() should not convert numeric strings containing spaces in the middle [2]')
assertTrue (f == 1.234, 'tonumber() should convert numeric strings of floating point numbers at base 10 [2]')
assertTrue (g == 123400, 'tonumber() should convert numeric strings of exponential (+ve) numbers at base 10 [2]')
assertTrue (h == 0.00001234, 'tonumber() should convert numeric strings of exponential (-ve) numbers at base 10 [2]')


local a = tonumber ('101', 2)
local b = tonumber ('101 ', 2)
local c = tonumber (' 101 ', 2)
local d = tonumber ('101abc', 2)
local e = tonumber ('101 10', 2)
local f = tonumber ('101.10', 2)
local g = tonumber ('1.01e+10', 2)

assertTrue (a == 5, 'tonumber() should convert basic numeric strings to decimal with base 2')
assertTrue (b == 5, 'tonumber() should convert numeric strings suffixed with spaces with base 2')
assertTrue (c == 5, 'tonumber() should convert numeric strings prefixed with spaces with base 2')
assertTrue (d == nil, 'tonumber() should not convert strings containing letters with base 2')
assertTrue (e == nil, 'tonumber() should not convert numeric strings containing spaces in the middle with base 2')
assertTrue (f == nil, 'tonumber() should not convert numeric strings of floating point numbers at base 2')
assertTrue (g == nil, 'tonumber() should not convert numeric strings of exponential numbers at base 2')


local a = tonumber ('123', 16)
local b = tonumber ('1AF', 16)
local c = tonumber ('1AF ', 16)
local d = tonumber (' 1AF ', 16)
local e = tonumber ('123Axyz', 16)
local f = tonumber ('123 45', 16)
local g = tonumber ('123.4', 16)
local h = tonumber ('1.23e+10', 16)

assertTrue (a == 291, 'tonumber() should convert basic numeric strings to decimal with base 16')
assertTrue (b == 431, 'tonumber() should convert hexadecimal strings to decimal with base 16')
assertTrue (c == 431, 'tonumber() should convert hexadecimal strings suffixed with spaces with base 16')
assertTrue (d == 431, 'tonumber() should convert hexadecimal strings prefixed with spaces with base 16')
assertTrue (e == nil, 'tonumber() should not convert strings containing letters out of the range of hexadecimal, with base 16')
assertTrue (f == nil, 'tonumber() should not convert hexadecimal strings containing spaces in the middle with base 16')
assertTrue (g == nil, 'tonumber() should not convert hexadecimal strings of floating point numbers at base 16')
assertTrue (h == nil, 'tonumber() should not convert hexadecimal strings of exponential numbers at base 16')


local a = tonumber ('')
local b = tonumber ('', 2)
local c = tonumber ('', 10)
local d = tonumber ('', 16)
assertTrue (a == nil, 'tonumber() should return nil with passed an empty string')
assertTrue (b == nil, 'tonumber() should return nil with passed an empty string with base 2')
assertTrue (c == nil, 'tonumber() should return nil with passed an empty string with base 10')
assertTrue (d == nil, 'tonumber() should return nil with passed an empty string with base 16')

local a = tonumber (nil)
local b = tonumber (0/0)
local c = tonumber (math.huge)
local d = tonumber (-math.huge)
assertTrue (a == nil, 'tonumber() should return nil when passed nil')
assertTrue (b ~= b, 'tonumber() should return nan when passed nan')
assertTrue (c == math.huge, 'tonumber() should return a number when passed inf')
assertTrue (d == -math.huge, 'tonumber() should return a number when passed -inf')

local a = tonumber (123)
local b = tonumber (-123)
local c = tonumber (0)
local d = tonumber { value = 123 }
local e = tonumber (function () return 123 end)

assertTrue (a == 123, 'tonumber() should return a number when passed a number')
assertTrue (b == -123, 'tonumber() should return a negative number when passed a negative number')
assertTrue (c == 0, 'tonumber() should return a zero when passed a zero')
assertTrue (d == nil, 'tonumber() should return nil when passed a table')
assertTrue (e == nil, 'tonumber() should return nil when passed a function')

local a = tonumber ('0xa.2')
local b = tonumber ('0xa.2', 10)
local c = tonumber ('0xa.2', 16)
local d = tonumber ('0xa', 10)
local e = tonumber ('0xa', 16)
local f = tonumber ('0xa', 12)

assertTrue (a == 10.125, 'tonumber() should coerce string when using base 10 [1]')
assertTrue (b == 10.125, 'tonumber() should coerce string when using base 10 [2]')
assertTrue (c == nil, 'tonumber() should return nil when string is invalid [1]')
assertTrue (d == 10, 'tonumber() should coerce string when using base 10 [3]')
assertTrue (e == 10, 'tonumber() should ignore leading "0x" when converting to base 16.')
assertTrue (f == nil, 'tonumber() should return nil when string is invalid [2]')

local a = tonumber (10, 16)
local b = tonumber (0xa, 16)
local c = tonumber ('0xa', 34)
local d = tonumber ('inf')
local e = tonumber ('inf', 16)
local f = tonumber (math.huge, 16)

assertTrue (a == 16, 'tonumber() should coerce first argument to a string [1]')
assertTrue (b == 16, 'tonumber() should coerce first argument to a string [2]')
assertTrue (c == 1132, 'tonumber() should convert "x" correctly for bases greater than 33')
assertTrue (d == math.huge, 'tonumber() should coerce "inf" to inf with base 10')
assertTrue (e == nil, 'tonumber() should coerce "inf" to nil with bases other than 10')
assertTrue (f == nil, 'tonumber() should return nil when passed inf with bases other than 10')

local a = tonumber (0/0, 16)

assertTrue (a == nil, 'tonumber() should return nil when passed inf for bases other than 10')



-- tostring
-- TODO Check for use of __tostring metamethod

a = tostring (123)
b = tostring ({})
c = tostring ({1, 2, 3})
d = tostring (function () return true end)
e = tostring(math.huge)
f = tostring(-math.huge)
g = tostring(0/0)
 
assertTrue (a == '123', 'tostring() should convert a number to a string')
assertTrue (string.sub(b, 1, 9) == 'table: 0x', 'tostring() should convert an empty table to a string')
assertTrue (string.sub(c, 1, 9) == 'table: 0x', 'tostring() should convert a table to a string')
assertTrue (string.sub(d, 1, 12) == 'function: 0x', 'tostring() should convert a number to a string')
assertTrue (e == 'inf', 'tostring() should convert infinity to "inf"')
assertTrue (f == '-inf', 'tostring() should convert negative infinity to "-inf"')
assertTrue (g == 'nan', 'tostring() should convert not-a-number to "nan"')

a = {}
setmetatable(a, { __tostring = function () return 'Les Revenants' end })
b = tostring (a)

assertTrue (b == 'Les Revenants', 'tostring() should use __tostring function, if available on metatable')





-- type

local a = type (nil)
local b = type (123)
local c = type ('abc')
local d = type (true)
local e = type ({})
local f = type (function () return true end)

assertTrue (a == 'nil', 'type() should return "nil" for a variable with value of nil')
assertTrue (b == 'number', 'type() should return "number" for a variable with value of number')
assertTrue (c == 'string', 'type() should return "string" for a variable with value of type string')
assertTrue (d == 'boolean', 'type() should return "boolean" for a variable with value of type boolean')
assertTrue (e == 'table', 'type() should return "table" for a variable with value of type table')
assertTrue (f == 'function', 'type() should return "function" for a variable with value of type function')



-- unpack
do
	local a = {0, 1, 2, 4, 20, 50, 122}
	
	local b, c, d, e, f, g = unpack (a, 3);
	local h, i = unpack (a, 3, 2);
	local j, k, l, m = unpack (a, 3, 5);
	
	assertTrue (b == 2, 'unpack() should return the correct items of the given list [1]')
	assertTrue (c == 4, 'unpack() should return the correct items of the given list [2]')
	assertTrue (d == 20, 'unpack() should return the correct items of the given list [3]')
	assertTrue (e == 50, 'unpack() should return the correct items of the given list [4]')
	assertTrue (f == 122, 'unpack() should return the correct items of the given list [5]')
	assertTrue (g == nil, 'unpack() should return the correct items of the given list [6]')
	assertTrue (h == nil, 'unpack() should return the correct items of the given list [7]')
	assertTrue (i == nil, 'unpack() should return the correct items of the given list [8]')
	assertTrue (j == 2, 'unpack() should return the correct items of the given list [9]')
	assertTrue (k == 4, 'unpack() should return the correct items of the given list [10]')
	assertTrue (l == 20, 'unpack() should return the correct items of the given list [11]')
	assertTrue (m == nil, 'unpack() should return the correct items of the given list [12]')
	
	
	local a = {nil, nil, 180}
	local b, c, d, e = unpack (a);
	assertTrue (b == nil, 'unpack() should return the correct items of the given list [13]')
	assertTrue (c == nil, 'unpack() should return the correct items of the given list [14]')
	assertTrue (d == 180, 'unpack() should return the correct items of the given list [15]')
	assertTrue (e == nil, 'unpack() should return the correct items of the given list [16]')
	
	
	--Make sure binary searching is implemented the same way as C…
	local table1 = {true, nil, true, false, nil, true, nil}
	local table2 = {true, false, nil, false, nil, true, nil}
	local table3 = {true, false, false, false, true, true, nil}
	
	local a1, b1, c1, d1, e1, f1 = unpack (table1);
	local a2, b2, c2, d2, e2, f2 = unpack (table2);
	local a3, b3, c3, d3, e3, f3, g3 = unpack (table3);
	
	
	assertTrue (a1, 'unpack() should return the same items as the C implementation [1]')
	assertTrue (b1 == nil, 'unpack() should return the same items as the C implementation [2]')
	assertTrue (c1, 'unpack() should return the same items as the C implementation [3]')
	assertTrue (not d1, 'unpack() should return the same items as the C implementation [4]')
	assertTrue (e1 == nil, 'unpack() should return the same items as the C implementation [5]')
	assertTrue (f1 == nil, 'unpack() should return the same items as the C implementation [6]')
	assertTrue (a2, 'unpack() should return the same items as the C implementation [7]')
	assertTrue (not b2, 'unpack() should return the same items as the C implementation [8]')
	assertTrue (c2 == nil, 'unpack() should return the same items as the C implementation [9]')
	assertTrue (d2 == nil, 'unpack() should return the same items as the C implementation [10]')
	assertTrue (e2 == nil, 'unpack() should return the same items as the C implementation [11]')
	assertTrue (f2 == nil, 'unpack() should return the same items as the C implementation [12]')
	
	assertTrue (a3, 'unpack() should return the same items as the C implementation [13]')
	assertTrue (not b3, 'unpack() should return the same items as the C implementation [14]')
	assertTrue (not c3, 'unpack() should return the same items as the C implementation [15]')
	assertTrue (not d3, 'unpack() should return the same items as the C implementation [16]')
	assertTrue (e3, 'unpack() should return the same items as the C implementation [17]')
	assertTrue (f3, 'unpack() should return the same items as the C implementation [18]')
	assertTrue (g3 == nil, 'unpack() should return the same items as the C implementation [19]')
end



-- _VERSION

assertTrue (_VERSION == 'Lua 5.1', '_VERSION should be "Lua 5.1"')




-- xpcall

function goodfunc ()
	return 10, "win"
end

function badfunc ()
	error ('I\'m bad.')
end 

function errfunc ()
	return 999, "fail"
end 

a, b, c, d = xpcall (goodfunc, errfunc)

assertTrue (a == true, 'xpcall() should return true in the first item when a function executes successfully')
assertTrue (b == 10, 'xpcall() should return the result of the function in the items following the first item returned, when a function executes successfully [1]')
assertTrue (c == 'win', 'xpcall() should return the result of the function in the items following the first item returned, when a function executes successfully [2]')
assertTrue (d == nil, 'xpcall() should return the result of the function in the items following the first item returned, when a function executes successfully [3]')

a, b, c = xpcall (badfunc, errfunc)

assertTrue (a == false, 'xpcall() should return false in the first item when the function errors during execution')
assertTrue (b == 999, 'xpcall() should return the first item of the result of the error function in the second item returned, when the function errors during execution')
assertTrue (c == nil, 'xpcall() should only return the first item of the result of the error function in the items following the first item returned, when the function errors during execution')



