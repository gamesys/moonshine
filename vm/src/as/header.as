package {
	import flash.utils.getQualifiedClassName;
	import flash.utils.setTimeout;

	public class Luajs {
		private var VM : Object;
		public static var Table : Object;
		public static var utils : Object;
		public static var lib : Object;


		public function execute(file : Object) : void {
			VM.execute(false, file);
		}

		public function Luajs(env : Object) {
			var console : Object;

			var window : Object = {};
			window.setTimeout = setTimeout;
			window.isNaN = isNaN;

			var JSON:Object;
			
			