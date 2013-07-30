



luajs.Register = function () {
	this._register = luajs.gc.createArray();
}




luajs.Register.prototype.getLength = function () {
	return this._register.length;
}




luajs.Register.prototype.getItem = function (index) {
	return this._register[index];
}




luajs.Register.prototype.setItem = function (index, value) {
	var item = this._register[index];
	luajs.gc.decrRef(item);

	item = this._register[index] = value;
	luajs.gc.incrRef(item);
}




luajs.Register.prototype.set = function (arr) {
	for (var i = 0, l = arr.length; i < l; i++) this.setItem(i, arr[i]);
}




luajs.Register.prototype.push = function () {
	this._register.push.apply(this._register, arguments);
}




luajs.Register.prototype.splice = function () {
	this._register.splice.apply(this._register, arguments);
}




luajs.Register.prototype.reset = function () {
	for (var i = 0, l = this._register.length; i < l; i++) luajs.gc.decrRef(this._register[i]);
	this._register.length = 0;
}




luajs.Register.prototype.clearItem = function (index) {
	delete this._register[index];
}



