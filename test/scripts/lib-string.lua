

-- STRING FUNCTIONS


-- byte

local a, b = string.byte ('Mo0')

assertTrue (a == 77, 'string.byte() should return the numerical code for the first character in the first returned item')
assertTrue (b == nil, 'string.byte() should return only one item when only no length is given [1]')


local a, b = string.byte ('Mo0', 2)

assertTrue (a == 111, 'string.byte() should return the numerical code for the nth character in the first returned item, when n is specified in the second argument [1]')
assertTrue (b == nil, 'string.byte() should return only one item when only no length is given [2]')


local a, b, c = string.byte ('Mo0', 2, 3)

assertTrue (a == 111, 'string.byte() should return the numerical code for the nth character in the first returned item, when n is specified in the second argument [2]')
assertTrue (b == 48, 'string.byte() should return the numerical code for the nth character in the first returned item, when n is specified in the second argument [3]')
assertTrue (c == nil, 'string.byte() should return only the number of items specified in the length argument or the up to the end of the string, whichever is encountered first [1]')


local a, b, c = string.byte ('Mo0', 3, 20)

assertTrue (a == 48, 'string.byte() should return the numerical code for the nth character in the first returned item, when n is specified in the second argument [4]')
assertTrue (b == nil, 'string.byte() should return only the number of items specified in the length argument or the up to the end of the string, whichever is encountered first [2]')




-- char

local a = string.char ()
local b = string.char (116, 101, 115, 116, 105, 99, 108, 101, 115)

assertTrue (a == '', 'string.byte() should return an empty string when called with no arguments')
assertTrue (b == 'testicles', 'string.byte() should return a string comprising of characters representing by the value each of the arguments passed')




-- find

local a = 'The quick brown fox'

local b = string.find (a, 'quick');
local c = string.find (a, 'fox');
local d = string.find (a, 'kipper');
local e = string.find (a, '');

local f = string.find (a, 'quick', 8);
local g = string.find (a, 'fox', 8);

assertTrue (b == 5, 'string.find() should return the location of the first occurrence of the second argument within the first, if it is present [1]')
assertTrue (c == 17, 'string.find() should return the location of the first occurrence of the second argument within the first, if it is present [2]')
assertTrue (d == nil, 'string.find() should return nil if the second argument is not contained within the first [1]')
assertTrue (e == 1, 'string.find() should return return 1 if the second argument is an empty string')
assertTrue (f == nil, 'string.find() should return nil if the second argument is not contained within the first after the index specified by the third argument')
assertTrue (g == 17, 'string.find() should return the location of the second argument if it is contained within the first after the index specified by the third argument')

local b, c, d, e = string.find (a, 'q(.)(.)');
assertEqual (b, 5, 'string.find() should return the location of the first occurrence of the second argument within the first, if it is present [3]')
assertEqual (c, 7, 'string.find() should return the location of the last character of the first occurrence of the second argument within the first, if it is present')
assertEqual (d, 'u', 'string.find() should return the groups that are specified in the regex. [1]')
assertEqual (e, 'i', 'string.find() should return the groups that are specified in the regex. [2]')


-- gmatch

local s = "from=world, to=Lua"
local x = string.gmatch(s, "(%w+)=(%w+)")

assertTrue (type(x) == 'function', 'string.gmatch() should return an iterator function')

local a, b, c = x()
assertTrue (a == 'from', 'string.gmatch() iterator should return the first group matched in the string [1]')
assertTrue (b == 'world', 'string.gmatch() iterator should return the second group matched in the string [1]')
assertTrue (c == nil, 'string.gmatch() iterator should return nil after all groups are matched [1]')

local a, b, c = x()
assertTrue (a == 'to', 'string.gmatch() iterator should return the first group matched in the string [2]')
assertTrue (b == 'Lua', 'string.gmatch() iterator should return the second group matched in the string [2]')
assertTrue (c == nil, 'string.gmatch() iterator should return nil after all groups are matched [2]')

local a = x()
assertTrue (a == nil, 'string.gmatch() iterator should return nil after all matches have ben returned')


local x = string.gmatch(s, "%w+=%w+")
local a, b = x()
assertTrue (a == 'from=world', 'string.gmatch() iterator should return the first match when no groups are specified')
assertTrue (b == nil, 'string.gmatch() iterator should return nil as second return value when no groups are specified [1]')

local a, b = x()
assertTrue (a == 'to=Lua', 'string.gmatch() iterator should return the second match when no groups are specified')
assertTrue (b == nil, 'string.gmatch() iterator should return nil as second return value when no groups are specified [2]')

do
	local x = string.gmatch(';a;', 'a*')
	local a, b, c, d, e, f = x(), x(), x(), x(), x(), x();

	assertEqual (a, '', 'string.gmatch() iterator should return correct values [1]')
	assertEqual (b, 'a', 'string.gmatch() iterator should return correct values [2]')
	assertEqual (c, '', 'string.gmatch() iterator should return correct values [3]')
	assertEqual (d, '', 'string.gmatch() iterator should return correct values [4]')
	assertEqual (e, nil, 'string.gmatch() iterator should return correct values [5]')
	assertEqual (e, nil, 'string.gmatch() iterator should return correct values [6]')
end




-- gsub

a = '<%?xml version="1.0" encoding="UTF%-8"%?>'
b = '<?xml version="1.0" encoding="UTF-8"?><my-xml></my-xml>'

c = string.gsub (b, a, 'moo')

assertTrue (c == 'moo<my-xml></my-xml>', 'string.gsub() should replace the matched part of the string[1]')
-- Not even scraping the surface

a = '%%1'
b = 'Hello %1'

c = string.gsub (b, a, 'world')
assertTrue (c == 'Hello world', 'string.gsub() should replace the matched part of the string[2]')


a = '%d'
b = 'ab5kfd8scf4lll'
c = function (x) return '('..x..')' end

d = string.gsub (b, a, c, 2)
assertTrue (d == 'ab(5)kfd(8)scf4lll', 'string.gsub() should replace the matched part of the string with the value returned from the given map function')


a = "[^:]+"
b = ":aa:bbb:cccc:ddddd:eee:"
c = function (subStr) end

d = string.gsub (b, a, c)
assertTrue (d == ':aa:bbb:cccc:ddddd:eee:', 'string.gsub() should not replace the matched part of the string if the value returned from the map function is nil')

c = function (subStr) return 'X' end

d = string.gsub (b, a, c)
assertTrue (d == ':X:X:X:X:X:', 'string.gsub() should replace the matched part of the string if the value returned from the map function is not nil')


c = string.gsub (';a;', 'a*', 'ITEM')
assertTrue (c == 'ITEM;ITEMITEM;ITEM', 'string.gsub() should replace the matched part of the string[2]')

    



-- len

local a = 'McLaren Mercedes'

local b = string.len ('');
local c = string.len (a);

assertTrue (b == 0, 'string.len() should return 0 if passed an empty string')
assertTrue (c == 16, 'string.len() should return the length of the string in the first argument')





-- lower

local a = 'McLaren Mercedes'

local b = string.lower ('');
local c = string.lower (a);

assertTrue (b == '', 'string.lower() should return an empty string if passed an empty string')
assertTrue (c == 'mclaren mercedes', 'string.lower() should return the string in the first argument with all character in lower case')




-- rep

local a = 'Ho'

local b = string.rep (a, 0);
local c = string.rep (a, 1);
local d = string.rep (a, 3);

assertTrue (b == '', 'string.rep() should return an empty string if the second argument is 0')
assertTrue (c == 'Ho', 'string.rep() should return the first argument if the second argument is 1')
assertTrue (d == 'HoHoHo', 'string.rep() should return a string containing the first argument repeated the second argument number of times')




-- reverse

local a = string.reverse ('');
local b = string.reverse ('x');
local c = string.reverse ('tpircSavaJ');

assertTrue (a == '', 'string.reverse() should return an empty string if passed an empty string')
assertTrue (b == 'x', 'string.reverse() should return the first argument if its length is 1')
assertTrue (c == 'JavaScript', 'string.reverse() should return a string containing the first argument reversed')




-- sub

local a = 'Pub Standards'

local b = string.sub (a, 1)
local c = string.sub (a, 5)
local d = string.sub (a, -4)

local e = string.sub (a, 1, 3)
local f = string.sub (a, 7, 9)
local g = string.sub (a, -4, -2)

local h = string.sub (a, 5, -2)
local i = string.sub (a, 0)

assertTrue (b == 'Pub Standards', 'string.sub() should return the first argument if the second argument is 1')
assertTrue (c == 'Standards', 'string.sub() should return a subset of the first argument from the nth character onwards, when n is the second argument and positive')
assertTrue (d == 'ards', 'string.sub() should return the last n characters of the first argument, where n is the absolute value of the second argument and the second argument is negative')
assertTrue (e == 'Pub', 'string.sub() should return the first n characters of the first argument when the second argument is one and n is the third argument')
assertTrue (f == 'and', 'string.sub() should return a subset of the first argument from the nth character to the mth character, when n is the second argument and positive and m is the third argument and negative')


assertTrue (h == 'Standard', 'string.sub() should return a subset of the first argument from the nth character to the last but mth character, when n is the second argument and positive and m is the third argument and negative')
assertTrue (i == 'Pub Standards', 'string.sub() should return a subset of the first argument from the last but nth character to the last but mth character, when n is the second argument and negative and m is the third argument and negative')




-- upper

local a = string.upper ('');
local b = string.upper ('JavaScript');

assertTrue (a == '', 'string.upper() should return an empty string if passed an empty string')
assertTrue (b == 'JAVASCRIPT', 'string.upper() should return the first argument in uppercase')


