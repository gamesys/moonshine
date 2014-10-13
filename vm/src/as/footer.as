
			shine.debug = {};

			shine.lib.load = shine.lib.loadfile = function () { throw new ReferenceError('load() and loadfile() currently not implemented on Flash platform') };


			Moonshine.Table = shine.Table;
			Moonshine.utils = shine.utils;
			Moonshine.lib = shine.lib;

			VM = new shine.VM(env);
		}
	}
}