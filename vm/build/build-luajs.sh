echo > ../luajs.js

cat ../moonshine.js >> ../luajs.js
echo "(function () { var Moonshine = function () { this.VM = function (env) { console.warn('luajs namespace is deprecated; use shine instead.'); return new shine.VM(env); };}; Moonshine.prototype = shine; window.luajs = new Moonshine(); })();" >> ../luajs.js
