echo > ../Luajs.as

cat ../src/as/header.as >> ../Luajs.as

cat ../src/EventEmitter.js >> ../Luajs.as
cat ../src/VM.js >> ../Luajs.as
cat ../src/InstructionSet.js >> ../Luajs.as
cat ../src/Closure.js >> ../Luajs.as
cat ../src/Function.js >> ../Luajs.as
cat ../src/Coroutine.js >> ../Luajs.as
cat ../src/Table.js >> ../Luajs.as
cat ../src/Error.js >> ../Luajs.as
cat ../src/lib.js >> ../Luajs.as
cat ../src/output.js >> ../Luajs.as
cat ../src/utils.js >> ../Luajs.as

cat ../src/as/footer.as >> ../Luajs.as

compc -include-classes=Luajs -output=../luajs.swc -source-path=../ -warnings=false
