

(function () {
	

	/////////////////////////////////
	// Array implementation
	/////////////////////////////////


	var ArrayInstructionSet = function (data) {
		this._data = data;
	}




	ArrayInstructionSet.prototype.get = function (index, part) {
		return this._data[index][part];
	};





	/////////////////////////////////
	// Array buffer implementation
	/////////////////////////////////


	var ArrayBufferInstructionSet = function (data) {
		this._buffer = new ArrayBuffer(data.length * 4 * 4);
		this._view = new Int32Array(this._buffer);

		var instruction,
			i, l;

		for (i = 0, l = data.length; i < l; i++) {
			var instruction = data[i];

			this._view[i * 4] = instruction.op;
			this._view[i * 4 + 1] = instruction.A;
			this._view[i * 4 + 2] = instruction.B;
			if (instruction.C) this._view[i * 4 + 3] = instruction.C;
		}
	}




	ArrayBufferInstructionSet.prototype.get = function (index, part) {
		switch (part) {
			case 'op': return this._view[index * 4];
			case 'A': return this._view[index * 4 + 1];
			case 'B': return this._view[index * 4 + 2];
			case 'C': return this._view[index * 4 + 3];
		}
	};




	luajs.InstructionSet = ('ArrayBuffer' in window)? ArrayBufferInstructionSet : ArrayInstructionSet;

})();

