
(function () {
	if (typeof window != 'undefined') {
		var originalValue = window.shine;

		window.shine = {
			noConflict: function () {
				window.shine = originalValue;
				return this;
			}
		};
	}
})();
