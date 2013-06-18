local dumpVal = [[
	{"sourceName":"","lineDefined":3,"lastLineDefined":7,"upvalueCount":0,"paramCount":1,"is_vararg":0,"maxStackSize":4,"instructions":[{"op":5,"A":1,"B":0},{"op":1,"A":2,"B":1},{"op":28,"A":1,"B":2,"C":1},{"op":26,"A":0,"B":0,"C":0},{"op":22,"A":0,"B":5},{"op":5,"A":1,"B":0},{"op":1,"A":2,"B":2},{"op":0,"A":3,"B":0,"C":0},{"op":21,"A":2,"B":2,"C":3},{"op":28,"A":1,"B":2,"C":1},{"op":1,"A":1,"B":3},{"op":30,"A":1,"B":2,"C":0},{"op":30,"A":0,"B":1,"C":0}],"constants":["print","Hello world!","Hello ","moo"],"functions":[],"linePositions":[4,4,4,5,5,5,5,5,5,5,6,6,7],"locals":[{"varname":"x","startpc":0,"endpc":12}],"upvalues":[]}
]]

local f = loadstring(dumpVal)
local result = f('Lua')

print(result)

