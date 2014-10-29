
(function () {
	var originalValue = window.shine;

	window.shine = {
		noConflict: function () {
			window.shine = originalValue;
			return this;
		}
	};

})();
