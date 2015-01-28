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


-- MATHS FUNCTIONS


-- abs

local a = math.abs (10)
local b = math.abs (-20)
local c = math.abs (2.56)
local d = math.abs (-34.67)
local e = math.abs (-0)

assertTrue (a == 10, 'math.abs() should return the passed argument if it is positive')
assertTrue (b == 20, 'math.abs() should return the positive form of the passed argument if it is negative')
assertTrue (c == 2.56, 'math.abs() should return the passed argument if it is a positive floating point number')
assertTrue (d == 34.67, 'math.abs() should return the positive form of the passed argument if it is a positive floating point number')
assertTrue (e == 0, 'math.abs() should return zero if passed zero')




-- math.acos
-- math.cos


local a = math.acos (1)
--local b = math.acos (math.cos (0.3))
local c = math.cos (0)
--local d = math.cos (math.acos (0.3))

assertTrue (a == 0, 'math.acos() should return 0 when passed 1')
--assertTrue (b == 0.3, 'math.acos() should return x when passed math.cos(x)')
assertTrue (c == 1, 'math.cos() should return 1 when passed 0')
--assertTrue (d == 0.3, 'math.cos() should return x when passed math.acos(x)')




-- math.asin
-- math.sin


local a = math.asin (0)
--local b = math.asin (math.sin (90))
local c = math.sin (0)
local d = math.sin (math.asin (0.3))

assertTrue (a == 0, 'math.asin() should return 0 when passed 0')
--assertTrue (b == 90, 'math.asin() should return x when passed math.sin(x)')
assertTrue (c == 0, 'math.sin() should return 0 when passed 0')
assertTrue (d == 0.3, 'math.sin() should return x when passed math.asin(x)')




-- math.atan
-- math.tan


local a = math.atan (0)
--local b = math.atan (math.tan (0.3))
local c = math.tan (0)
local d = math.tan (math.atan (0.3))

assertTrue (a == 0, 'math.atan() should return 0 when passed 0')
--assertTrue (b == 0.3, 'math.atan() should return x when passed math.tan(x)')
assertTrue (c == 0, 'math.tan() should return 0 when passed 0')
assertTrue (d == 0.3, 'math.tan() should return x when passed math.atan(x)')




-- math.ceil

local a = math.ceil (14)
local b = math.ceil (14.45)
local c = math.ceil (14.5)
local d = math.ceil (0.1)
local e = math.ceil (0.6)
local f = math.ceil (-0.6)
local g = math.ceil (-122.4)

assertTrue (a == 14, 'math.ceil() should round up to the next integer [1]')
assertTrue (b == 15, 'math.ceil() should round up to the next integer [2]')
assertTrue (c == 15, 'math.ceil() should round up to the next integer [3]')
assertTrue (d == 1, 'math.ceil() should round up to the next integer [4]')
assertTrue (e == 1, 'math.ceil() should round up to the next integer [5]')
assertTrue (f == 0, 'math.ceil() should round up to the next integer [6]')
assertTrue (g == -122, 'math.ceil() should round up to the next integer [7]')




-- math.deg

a = math.deg (0)
b = math.deg (math.pi)
c = math.deg (math.pi * 2)
d = math.deg (math.pi / 2)

assertTrue (a == 0, 'math.deg() should return 0 when passed zero')
assertTrue (b == 180, 'math.deg() should return 180 when passed Pi')
assertTrue (c == 360, 'math.deg() should return 360 when passed 2Pi')
assertTrue (d == 90, 'math.deg() should return 90 when passed Pi/2')



--math.frexp

a, b = math.frexp(63)
assertTrue (a == 0.984375, 'math.frexp should return the correct mantissa when passed a positive number.')
assertTrue (b == 6, 'math.frexp should return the correct exponent when passed a positive number.')

a, b = math.frexp(-63)
assertTrue (a == -0.984375, 'math.frexp should return the correct mantissa when passed a negative number.')
assertTrue (b == 6, 'math.frexp should return the correct exponent when passed a negative number.')

a, b = math.frexp(0)
assertTrue (a == 0, 'math.frexp should return a zero mantissa when passed zero.')
assertTrue (b == 0, 'math.frexp should return a zero exponent when passed zero.')




--math.huge

a = math.huge + 1
b = -math.huge - 1

assertTrue (a == math.huge, 'math.huge should not change value with addition.')
assertTrue (b == -math.huge, 'Negative math.huge should not change value with subtraction.')




-- math.rad

a = math.rad (0)
b = math.rad (180)
c = math.rad (270)
d = math.rad (360)
e = math.rad (450)
f = math.rad (-180)

assertTrue (a == 0, 'math.rad() should return 0 when passed zero')
assertTrue (b == math.pi, 'math.rad() should return Pi when passed 180')
assertTrue (c == 1.5 * math.pi, 'math.rad() should return 1.5*Pi when passed 270')
assertTrue (d == 2 * math.pi, 'math.rad() should return 2*Pi when passed 360')
assertTrue (e == 2.5 * math.pi, 'math.rad() should return 2.5*Pi when passed 450')
assertTrue (f == -math.pi, 'math.rad() should return -Pi when passed -180')


-- math.random

a = math.random()
b = math.random()

assertTrue (a == 16807 / 2147483647, 'math.random() should initialise with a value of 1')
assertTrue (b == ((16807 * a * 2147483647) % 2147483647) / 2147483647, 'math.random() should follow the right sequence [1]')



-- math.randomseed

math.randomseed(123)

c = math.random()
d = math.random()

assertTrue (c == ((16807 * 123) % 2147483647) / 2147483647, 'math.random() should follow the right sequence [2]')
assertTrue (d == ((16807 * c * 2147483647) % 2147483647) / 2147483647, 'math.random() should follow the right sequence [3]')



