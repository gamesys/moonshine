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


a = {1,2,3,4}
b = a

assertTrue (a == b, 'Tables should be able to be compared by identity')
assertTrue (not (a == {1,2,3,4}), 'Tables should not be able to be compared to literals')
assertTrue (#a == 4, 'Length operator should return the number of items in a table')


assertTrue (a[1] == 1, 'Square brackets operation on table should return correct value for index [1]')
assertTrue (a[2] == 2, 'Square brackets operation on table should return correct value for index [2]')
assertTrue (a[3] == 3, 'Square brackets operation on table should return correct value for index [3]')
assertTrue (a[4] == 4, 'Square brackets operation on table should return correct value for index [4]')
assertTrue (a[5] == nil, 'Square brackets operation on table should return nil for an index greater than the length')
assertTrue (a[0] == nil, 'Square brackets operation on table should return nil for an index of 0')
assertTrue (a[-1] == nil, 'Square brackets operation on table should return nil for an index less than 0')


a = {[1] = 20, [3] = 40}
assertTrue (a[1] == 20, 'Square brackets operation on table should return correct value for index when keys are used in literal assignment [1]')
assertTrue (a[2] == nil, 'Square brackets operation on table should return correct value for index when keys are used in literal assignment [2]')
assertTrue (a[3] == 40, 'Square brackets operation on table should return correct value for index when keys are used in literal assignment [3]')
assertTrue (a[4] == nil, 'Square brackets operation on table should return correct value for index when keys are used in literal assignment [4]')




-- TABLES


Account = { balance = 0 }

function Account:new (o)
	o = o or {}
	setmetatable (o,self)
	self.__index = self
	return o
end 

function Account:deposit (v)
	self.balance = self.balance + v
end

function Account:withdraw (v)
	if v > self.balance then error "insufficient funds" end
	self.balance = self.balance - v
end


acc = Account:new ()


assertTrue (acc.balance == 0, 'Class properties should be initiated when instantiated [1]')

acc:deposit (20)
assertTrue (acc.balance == 20, 'Class instance properties should be updatable though instance method calls [1]')

acc:withdraw (5)
assertTrue (acc.balance == 15, 'Class instance properties should maintain their value in the instance')


acc2 = Account:new ()

assertTrue (acc2.balance == 0, 'Class properties should be initiated when instantiated [2]')

acc2:deposit (50)
assertTrue (acc2.balance == 50, 'Class instance properties should be updatable though instance method calls [2]')
assertTrue (acc.balance == 15, 'Class instance properties should maintain their value separate to other instances')



SpecialAccount = Account:new ()

function SpecialAccount:withdraw (v)
	if v - self.balance >= self:getLimit () then
		error "insufficient funds"
	end
	
	self.balance = self.balance - v
end

function SpecialAccount:getLimit ()
	return self.limit or 0
end


s = SpecialAccount:new {limit=1000.00}

assertTrue (s.balance == 0, 'Class properties should be initiated when instantiated, even if class is inherited')
assertTrue (s:getLimit () == 1000, 'Inherited class should have its own properties')
assertTrue (acc.getLimit == nil, 'Base class properties should not change when inherited class manipulated')

s:deposit (500)
assertTrue (s.balance == 500, 'Class instance properties should be updatable though instance method calls [3]')


function f () 
	return 1, 3, 9
end

local t = {f()}

assertTrue (t[1] == 1, 'Table should be able to be instantiated by the result of a function [1]')
assertTrue (t[2] == 3, 'Table should be able to be instantiated by the result of a function [2]')
assertTrue (t[3] == 9, 'Table should be able to be instantiated by the result of a function [3]')



t = {}
t[1] = 'number'
t['1'] = 'string'

assertTrue (t[1] == 'number', 'A numerical table index should return a different value than when using the same index as a sting. [1]')
assertTrue (t['1'] == 'string', 'A numerical table index should return a different value than when using the same index as a sting. [2]')


