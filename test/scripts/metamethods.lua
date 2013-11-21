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


-- Event metametods

-- __index

local o = {}
local index = 'mogwai'
local returnVal = {}
local test
local x = {}


--nil
setmetatable(o, {})
assertTrue (o[index] == nil, 'Getting an index of an empty table with empty metamethod should return nil.')


--function
setmetatable(o, { __index = function (t, i)
	assertTrue (t == o, '__index function in metatable should be passed the table as first argument.')
	assertTrue (i == index, '__index function in metatable should be passed the index as second argument.')

	test = true
	return returnVal
end })

local result = o[index]
assertTrue (test, '__index function in metatable should be executed when table has no property by that index.')
assertTrue (result == returnVal, 'Value returned from __index function in metatable should be passed as the value')


--table
setmetatable(x, { __index = o });
test = false
result = x[index]

assertTrue (test, '__index function in metatable should be executed when table has no property by that index, even when nested.')
assertTrue (result == returnVal, 'Value returned from __index function in metatable should be passed as the value when nested')


--don't call if assigned
x[index] = 456

test = false
result = x[index]

assertTrue (not test, '__index function in metatable should not be executed when table has a property by that index.')
assertTrue (result == 456, '__index should be ignored when index is set.')


--test diffferent types of keys
setmetatable(o, { __index = function (t, i)
	test = true
	return returnVal
end })

test = false
result = o[123]

assertTrue (test, '__index function in metatable should be executed when table has no property by numerical index')
assertTrue (result == returnVal, 'Value returned from __index function in metatable should be passed as the value when index is numerical')

test = false
result = o[function () end]

assertTrue (test, '__index function in metatable should be executed when table has no property with a function key')
assertTrue (result == returnVal, 'Value returned from __index function in metatable should be passed as the value with a function key')

test = false
result = o[{}]

assertTrue (test, '__index function in metatable should be executed when table has no property with a table key')
assertTrue (result == returnVal, 'Value returned from __index function in metatable should be passed as the value with a table key')


-- nil (assigned)
getmetatable(o).__index = nil
assertTrue (o[index] == nil, 'When __index property of metatable is nil, value returned should be nil')




-- __newindex


--nil
o = {}
setmetatable(o, {})

o[index] = 123

assertTrue (o[index] == 123, 'Setting an index of an empty table with empty metamethod should set that value.')


--function
local value = {}
test = false
o = {}

setmetatable(o, { __newindex = function (t, i, v)
	assertTrue (t == o, '__newindex function in metatable should be passed the table as first argument.')
	assertTrue (i == index, '__newindex function in metatable should be passed the index as second argument.')
	assertTrue (v == value, '__newindex function in metatable should be passed the value as third argument.')

	test = true
	return returnVal
end })

o[index] = value

assertTrue (test, '__newindex function in metatable should be executed when table has no property by that index.')
assertTrue (o[index] == nil, '__newindex function should not set the value unless done so explicitly,')


--table does not have same effect as __index
x = {}
setmetatable(x, { __index = o });

test = false
x[index] = value

assertTrue (not test, '__newindex function in metatable should not be executed when nested.')
assertTrue (x[index] == value, '__newindex function in metatable should be be ignored when nested.')


--don't call if assigned
test = false
rawset(o, index, 111)
o[index] = value

assertTrue (not test, '__newindex function in metatable should not be executed when table has a property by that index.')
assertTrue (o[index] == value, '__newindex should be ignored when index is set.')


--test different types of keys
setmetatable(o, { __newindex = function (t, i, v)
	test = true
	return returnVal
end })

test = false
index = 123
o[index] = value
assertTrue (test, '__newindex function in metatable should be executed when table has not property for numerical key.')
assertTrue (o[index] == nil, '__newindex should return the correct value when passed a numerical key.')

test = false
index = function () end
o[index] = value
assertTrue (test, '__newindex function in metatable should be executed when table has not property for function key.')
assertTrue (o[index] == nil, '__newindex should return the correct value when passed a function key.')

test = false
index = {}
o[index] = value
assertTrue (test, '__newindex function in metatable should be executed when table has not property for table key.')
assertTrue (o[index] == nil, '__newindex should return the correct value when passed a table key.')


-- nil (assigned)
rawset(o, index, nil)
getmetatable(o).__index = nil
assertTrue (o[index] == nil, 'When __index property of metatable is nil, value returned should be nil')




-- metatable

local mt = { moo = '123' }
local fake = {}
local fake2 = {}
o = {}

setmetatable(o, mt)

result = getmetatable(o)
assertTrue (result == mt, 'getmetatable() should return metatable when __metatable is not set')

mt.__metatable = fake
result = getmetatable(o)
assertTrue (result ~= mt, 'getmetatable() should not return metatable when __metatable is set')
assertTrue (result == fake, 'getmetatable() should return the value of __metatable, if set')

local setmet = function ()
	setmetatable(o, mt)
end

local s, _ = pcall(setmet)
assertTrue (not s, 'setmetatable() should error when metatable has __metatable set')


mt.__metatable = function () return fake2 end
result = getmetatable(o)
assertTrue (result ~= fake2, 'getmetatable() should not return the value returned by __metatable, if it is set to a function')
assertTrue (type(result) == 'function', 'getmetatable() should return the value of __metatable, even if it is set to a function')






-- Arithmetic metamethods

local mt = {}
local Obj = {}

function Obj.new (v) 
	local self = { ['value'] = v }
	setmetatable (self, mt);
	return self
end

local o = Obj.new (3);
local p = Obj.new (5);
local x = { value = 'moo' }


-- __add

mt.__add = function (a, b)
	return a.value..'(__add)'..b.value
end

assertTrue (o + p == '3(__add)5', 'Add operator should use __add metamethod, if provided [1]')
assertTrue (o + x == '3(__add)moo', 'Add operator should use __add metamethod, if provided [2]')
assertTrue (x + p == 'moo(__add)5', 'Add operator should use __add metamethod, if provided [3]')




-- __concat

mt.__concat = function (a, b)
	return a.value..'(__concat)'..b.value
end
assertTrue (o..p == '3(__concat)5', 'Concatenation operator should use __concat metamethod, if provided [1]')
assertTrue (o..x == '3(__concat)moo', 'Concatenation operator should use __concat metamethod, if provided [2]')
assertTrue (x..p == 'moo(__concat)5', 'Concatenation operator should use __concat metamethod, if provided [3]')




-- __div

mt.__div = function (a, b)
	return a.value..'(__div)'..b.value
end

assertTrue (o / p == '3(__div)5', 'Divide operator should use __div metamethod, if provided [1]')
assertTrue (o / x == '3(__div)moo', 'Divide operator should use __div metamethod, if provided [2]')
assertTrue (x / p == 'moo(__div)5', 'Divide operator should use __div metamethod, if provided [3]')




-- __mod

mt.__mod = function (a, b)
	return a.value..'(__mod)'..b.value
end

assertTrue (o % p == '3(__mod)5', 'Modulo operator should use __mod metamethod, if provided [1]')
assertTrue (o % x == '3(__mod)moo', 'Modulo operator should use __mod metamethod, if provided [2]')
assertTrue (x % p == 'moo(__mod)5', 'Modulo operator should use __mod metamethod, if provided [3]')




-- __mul

mt.__mul = function (a, b)
	return a.value..'(__mul)'..b.value
end

assertTrue (o * p == '3(__mul)5', 'Muliplication operator should use __mul metamethod, if provided [1]')
assertTrue (o * x == '3(__mul)moo', 'Muliplication operator should use __mul metamethod, if provided [2]')
assertTrue (x * p == 'moo(__mul)5', 'Muliplication operator should use __mul metamethod, if provided [3]')




-- __pow

mt.__pow = function (a, b)
	return a.value..'(__pow)'..b.value
end

assertTrue (o ^ p == '3(__pow)5', 'Exponentiation operator should use __pow metamethod, if provided [1]')
assertTrue (o ^ x == '3(__pow)moo', 'Exponentiation operator should use __pow metamethod, if provided [2]')
assertTrue (x ^ p == 'moo(__pow)5', 'Exponentiation operator should use __pow metamethod, if provided [3]')




-- __sub

mt.__sub = function (a, b)
	return a.value..'(__sub)'..b.value
end

assertTrue (o - p == '3(__sub)5', 'Subtraction operator should use __sub metamethod, if provided [1]')
assertTrue (o - x == '3(__sub)moo', 'Subtraction operator should use __sub metamethod, if provided [2]')
assertTrue (x - p == 'moo(__sub)5', 'Subtraction operator should use __sub metamethod, if provided [3]')




-- __unm

mt.__unm = function (a)
	return '(__unm)'..a.value
end

assertTrue (-o == '(__unm)3', 'Negation operator should use __unm metamethod, if provided')








-- Relational metamethods


-- __eq
local x = 0

mt.__eq = function (a, b)
	x = x + 1
	return true
end

assertTrue (o == p, 'Equality operator should use __eq metamethod, if provided [1]')
assertTrue (x == 1, 'Equality operator should use __eq metamethod, if provided [2]')

assertTrue (not (o == 123), 'Equality operator should not use __eq metamethod if objects are of different type [1]')
assertTrue (x == 1, 'Equality operator should not use __eq metamethod if operands are of different type [2]')

assertTrue (o == o, 'Equality operator should not use __eq metamethod if the operands are the same object [1]')
assertTrue (x == 1, 'Equality operator should not use __eq metamethod if the operands are the same object [2]')




-- __le

x = 0

mt.__le = function (a, b)
	x = x + 1
	return a.value == 3
end

assertTrue (o <= p, 'Less than or equal to operator should use __le metamethod, if provided [1]')
assertTrue (x == 1, 'Less than or equal to operator should use __le metamethod, if provided [2]')
assertTrue (not (p <= o), 'Less than or equal to operator should use __le metamethod, if provided [3]')
assertTrue (x == 2, 'Less than or equal to operator should use __le metamethod, if provided [4]')




-- __lt

x = 0

mt.__lt = function (a, b)
	x = x + 1
	return a.value == 3
end

assertTrue (o < p, 'Less than operator should use __le metamethod, if provided [1]')
assertTrue (x == 1, 'Less than operator should use __le metamethod, if provided [2]')
assertTrue (not (p < o), 'Less than operator should use __le metamethod, if provided [3]')
assertTrue (x == 2, 'Less than operator should use __le metamethod, if provided [4]')



-- __call

x = ''
mt.__concat = nil

mt.__call = function (p1, p2)
	if p1 == o then 
		x = 'Ron ' 
	end
	
	x = x .. p2
	return 'CEO'
end

y = o('Dennis')

assertTrue (x == 'Ron Dennis', 'When executing a table, __call metamethod should be used, if provided')
assertTrue (y == 'CEO', 'When executing a table with a __call metamethod, the return value(s) of __call function should be returned')



