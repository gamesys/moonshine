echo > ../Moonshine.as

cat ../src/as/header.as >> ../Moonshine.as

cat ../src/gc.js >> ../Moonshine.as
cat ../src/EventEmitter.js >> ../Moonshine.as
cat ../src/VM.js >> ../Moonshine.as
cat ../src/Register.js >> ../Moonshine.as
cat ../src/Closure.js >> ../Moonshine.as
cat ../src/Function.js >> ../Moonshine.as
cat ../src/Coroutine.js >> ../Moonshine.as
cat ../src/Table.js >> ../Moonshine.as
cat ../src/Error.js >> ../Moonshine.as
cat ../src/lib.js >> ../Moonshine.as
cat ../src/output.js >> ../Moonshine.as
cat ../src/utils.js >> ../Moonshine.as

cat ../src/as/footer.as >> ../Moonshine.as

compc -include-classes=Moonshine -output=../moonshine.swc -source-path=../ -warnings=false
