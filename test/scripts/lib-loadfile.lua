
-- Implicit in the fact that it's already using assertTrue()
assertTrue (mainGlobal2 == 'mainGlbl', 'Files loaded by loadfile() should have access to the same global namespace')
assertTrue (mainLocal == nil, 'Files loaded by loadfile() should not have access to the local scope of the caller')

local testModName = ...
assertTrue (testModName == nil, 'Files loaded by loadfile() should not be passed any values in varargs.')


mainGlobal1 = 'innerGlbl'
local innerLocal = 'innerLoc'


return {
	getValue = function ()
		return 'moo'
	end
}