


shine.Register = function () {
	shine.Register.count++;
	this._register = shine.gc.createArray();
}
shine.Register.count = 0;


shine.Register._graveyard = [];



shine.Register.create = function () {
	var o = shine.Register._graveyard.pop();
	return o || new shine.Register(arguments);
}




shine.Register.prototype.getLength = function () {
	return this._register.length;
}




shine.Register.prototype.getItem = function (index) {
	return this._register[index];
}




shine.Register.prototype.setItem = function (index, value) {
	var item = this._register[index];
	shine.gc.decrRef(item);

	item = this._register[index] = value;
	shine.gc.incrRef(item);
}




shine.Register.prototype.set = function (arr) {
	for (var i = 0, l = arr.length; i < l; i++) this.setItem(i, arr[i]);
}




shine.Register.prototype.push = function () {
	this._register.push.apply(this._register, arguments);
}




shine.Register.prototype.splice = function () {
	this._register.splice.apply(this._register, arguments);
}




shine.Register.prototype.reset = function () {
	for (var i = 0, l = this._register.length; i < l; i++) shine.gc.decrRef(this._register[i]);
	this._register.length = 0;
}




shine.Register.prototype.clearItem = function (index) {
	delete this._register[index];
}




shine.Register.prototype.dispose = function (index) {
	this._register.reset();
	this.constructor._graveyard.push(this);
}




