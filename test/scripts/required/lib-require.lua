

-- Implicit in the fact that it's already using assertTrue()
assertTrue (mainGlobal2 == 'mainGlbl', 'Modules should have access to the same global namespace')
assertTrue (mainLocal == nil, 'Modules should not have access to the local scope of the caller')

mainGlobal1 = 'innerGlbl'
local innerLocal = 'innerLoc'


return {
	getValue = function ()
		return 'modVal'
	end
}

