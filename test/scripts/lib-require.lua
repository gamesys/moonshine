

-- Implicit in the fact that it's already using assertTrue()
assertTrue (mainGlobal2 == 'mainGlbl', 'Modules should have access to the same global namespace')
assertTrue (mainLocal == nil, 'Modules should not have access to the local scope of the caller')

local testModName = ...
assertTrue (testModName == 'scripts.lib-require', 'A module\'s name should be passed into the module using varargs.')


local sub = require 'scripts.lib-require.sub-module'	-- test dot syntax
assertTrue(type(sub) == 'table', 'Module should be able to load more modules.')

mainGlobal1 = 'innerGlbl'
local innerLocal = 'innerLoc'


return {
	getValue = function ()
		return 'modVal'
	end
}

