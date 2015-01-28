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


local a = 1
assertTrue (a == 1, 'Local should retain value')

local a, b, c, d = 5, 20, 0, nil
assertTrue (a == 5, 'Local should change value')
assertTrue (b == 20, 'Local should accept multiple assignments')

local result = a + b
assertTrue (result == 25, 'Plus operator should result in addition of operands')

result = a - b
assertTrue (result == -15, 'Minus operator should result in subtraction of operands')

result = a * b
assertTrue (result == 100, 'Asterisk operator should result in multiplication of operands')


result = b / a
assertTrue (result == 4, 'Slash operator should result in division of operands')

result = a / b
assertTrue (result == .25, 'Division should handle floating point results')

result = a / c
assertTrue (result == math.huge, 'Division by zero should return infinity')

result = a / -c
assertTrue (result == -math.huge, 'Division by negative zero should return negative infinity')

xpcall(function () result = a / d end, function () result = 'failed' end)
assertTrue (result == 'failed', 'Division by nil should error')

xpcall(function () result = a / 'x' end, function () result = 'failed2' end)
assertTrue (result == 'failed2', 'Division by string value should error')

xpcall(function () result = 'x' / a end, function () result = 'failed3' end)
assertTrue (result == 'failed3', 'Division of string value should error')


result = 5 % 3
assertTrue (result == 2, 'Modulo operator should return the remainder of the division of the two operands')

result = #'moo\0moo'
assertTrue (result == 7, 'Length operator should return the correct length of string with null character inside')

result = #'moo\0'
assertTrue (result == 4, 'Length operator should return the correct length of string with null character appended')

do
	local a = 5
	local b = 3
	local c = 5.5
	local d = 23
	local e = 7
	local f = 0
	local g = 0 / 0 	-- nan
	local h = math.huge
	local i = -math.huge


	assertEqual (a % b, 2, 'Modulo operator should return the remainder of the division of the two operands')
	assertEqual (c % b, 2.5, 'Modulo operator should return the fraction part of the remainder of the division of the two operands')
	assertEqual (-d % e, 5, 'Modulo operator should always return a positive number if the divisor is positive and wrap around if passed a negative dividend')
	assertEqual (d % -e, -5, 'Modulo operator should always return a negative number if the divisor is negative')
	assertEqual (-d % -e, -2, 'Modulo operator should always wrap around when passed a negative dividend')

	assertEqual (d % f, g, 'Modulo operator should always return "nan" when passed zero as a divisor')
	assertEqual (f % d, 0, 'Modulo operator should return zero when passed zero as a dividend (unless divisor == 0)')
	assertEqual (f % f, g, 'Modulo operator should return "nan" when passed zero as a dividend and divisor')
	assertEqual (d % g, g, 'Modulo operator should return "nan" when passed "nan" as a divisor')
	assertEqual (g % d, g, 'Modulo operator should return "nan" when passed "nan" as a dividend')
	assertEqual (d % h, g, 'Modulo operator should return "nan" when passed "inf" as a divisor')
	assertEqual (h % d, g, 'Modulo operator should return "nan" when passed "inf" as a dividend')
	assertEqual (d % i, g, 'Modulo operator should return "nan" when passed "-inf" as a divisor')
	assertEqual (i % d, g, 'Modulo operator should return "nan" when passed "-inf" as a dividend')

end

assertTrue (a == a, 'Equality operator should return true if first operand is equal to second')
assertTrue (not (a == b), 'Equality operator should return false if first operand is not equal to second')

assertTrue (a < b, 'Less than should return true if first operand is less than second')
assertTrue (not (a < a), 'Less than should return false if first operand is equal to second')
assertTrue (not (b < a), 'Less than should return false if first operand is greater than second')

assertTrue (b > a, 'Greater than should return true if first operand is Greater than second')
assertTrue (not (a > a), 'Greater than should return false if first operand is equal to second')
assertTrue (not (a > b), 'Greater than should return false if first operand is less than second')

assertTrue (a <= b, 'Less than or equal to should return true if first operand is less than second')
assertTrue (a <= a, 'Less than or equal to should return true if first operand is equal to second')
assertTrue (not (b <= a), 'Less than or equal to should return false if first operand is greater than second')

assertTrue (b >= a, 'Greater than or equal to should return true if first operand is Greater than second')
assertTrue (a >= a, 'Greater than or equal to should return true if first operand is equal to second')
assertTrue (not (a >= b), 'Greater than or equal to should return false if first operand is less than second')

local t = true
local f = false
local n

assertTrue (t, 'True should be true')
assertTrue (0, '0 should coerce to true')
assertTrue (1, '1 should coerce to true')
assertTrue ('moo', 'A string should coerce to true')
assertTrue ('', 'An empty string should coerce to true')
assertTrue ({}, 'An empty table should coerce to true')

assertTrue (not f, 'False should coerce to false')
assertTrue (not n, 'nil should coerce to false')


assertTrue (t and t, 'And operator should return true if both operands are true')
assertTrue (not (f and t), 'And operator should return false if first operand is false')
assertTrue (not (t and f), 'And operator should return false if second operand is false')
assertTrue (not (f and f), 'And operator should return false if both operands are false')

assertTrue (t or t, 'Or operator should return true if both operands are true')
assertTrue (f or t, 'Or operator should return true even if first operand is false')
assertTrue (t or f, 'Or operator should return true even if second operand is false')
assertTrue (not (f or f), 'Or operator should return false if both operands are false')



local tests = {
	addition = function (a, b) return a + b end,
	subtraction = function (a, b) return a - b end,
	muliplication = function (a, b) return a * b end,
	division = function (a, b) return a / b end,
	modulus = function (a, b) return a % b end,
	pow = function (a, b) return a ^ b end,
	['unary-minus'] = function (a, b) return -a, -b end
}

for name, test in pairs(tests) do

	local success, result = pcall (test, 5, 2)
	assertTrue (success, 'Simple use of '..name..' operator should not fail')
	
	success, result = pcall (test, '3', 6)
	assertTrue (success, 'Applying '..name..' operator to a string containing a number should not error [1]')
	
	success, result = pcall (test, '3.', 9)
	assertTrue (success, 'Applying '..name..' operator to a string containing a number should not error [2]')
	
	success, result = pcall (test, '3.2', 9)
	assertTrue (success, 'Applying '..name..' operator to a string containing a number should not error [3]')
	
	success, result = pcall (test, '3.2e4', 9)
	assertTrue (success, 'Applying '..name..' operator to a string containing an exponenial number should not error [4]')
	
	success, result = pcall (test, 8, '2')
	assertTrue (success, 'Passing a string containing a number to the '..name..' operator should not error [1]')
	
	success, result = pcall (test, 1, '2.')
	assertTrue (success, 'Passing a string containing a number to the '..name..' operator should not error [2]')
	
	success, result = pcall (test, 1, '2.5')
	assertTrue (success, 'Passing a string containing a number to the '..name..' operator should not error [3]')
	
	success, result = pcall (test, 1, '2.5e3')
	assertTrue (success, 'Passing a string containing an exponential number to the '..name..' operator should not error [4]')
	
	success, result = pcall (test, '9', '2')
	assertTrue (success, 'Applying '..name..' operator to two strings containing a numbers should not error')
	
	success, result = pcall (test, 'a', 2)
	assertTrue (not success, 'Applying '..name..' operator to an alpha string should error [1]')
	
	success, result = pcall (test, '8a', 2)
	assertTrue (not success, 'Applying '..name..' operator to an alpha string should error [2]')
	
	success, result = pcall (test, 'a8', 2)
	assertTrue (not success, 'Applying '..name..' operator to an alpha string should error [3]')
	
	success, result = pcall (test, 8, '2a')
	assertTrue (not success, 'Passing an alpha string to the '..name..' operator should error')
	
end


