/**
 * @fileOverview Coroutine class.
<<<<<<< HEAD
 * @author <a href="http://paulcuth.me.uk">Paul Cuthbertson</a>
=======
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
>>>>>>> master
 * @copyright Gamesys Limited 2013
 */

var luajs = luajs || {};



/**
 * Represents a single coroutine (thread).
 * @constructor
 * @extends luajs.EventEmitter
 * @param {luajs.Closure} closure The closure that is to be executed in the thread.
 */
luajs.Coroutine = function (closure) {
	luajs.EventEmitter.call (this);

	this._func = closure.getInstance ();
	this._index = luajs.Coroutine._index++;
	this._started = false;
	this._yieldVars = undefined;
	this._resumeStack = [];
	this.status = 'suspended';

	luajs.stddebug.write ('[coroutine created]\n');
};


luajs.Coroutine.prototype = new luajs.EventEmitter ();
luajs.Coroutine.prototype.constructor = luajs.Function;


luajs.Coroutine._index = 0;
luajs.Coroutine._stack = [];
luajs.Coroutine._graveyard = [];


luajs.Coroutine.create = function (closure) {
	var instance = luajs.Coroutine._graveyard.pop();
	//console.log (instance? 'reusing' : 'creating');
	
	if (instance) {
		luajs.Coroutine.apply(instance, arguments);
		return instance;
		
	} else {
		return new luajs.Coroutine(closure);
	}
};




/**
 * Adds a new coroutine to the top of the run stack.
 * @static
 * @param {luajs.Coroutine} co A running coroutine.
 */
luajs.Coroutine._add = function (co) {
	luajs.Coroutine._stack.push (luajs.Coroutine._running);
	luajs.Coroutine._running = co;
};




/**
 * Removes a coroutine from the run stack.
 * @static
 */
luajs.Coroutine._remove = function () {
	luajs.Coroutine._running = luajs.Coroutine._stack.pop ();
};




/**
 * Rusumes a suspended coroutine.
 * @returns {Array} Return values, either after terminating or from a yield.
 */
luajs.Coroutine.prototype.resume = function () {
	var retval;

	try {
		if (this.status == 'dead') throw new luajs.Error ('cannot resume dead coroutine');

		luajs.Coroutine._add (this);
		
		if (luajs.debug.status == 'resuming') {
			var funcToResume = luajs.debug.resumeStack.pop ();
			
			if ((funcToResume || {}) instanceof luajs.Coroutine) {
				retval = funcToResume.resume ();
			} else {
				retval = this._func._instance._run ();
			}

		} else if (!this._started) {
			this.status = 'running';
			luajs.stddebug.write ('[coroutine started]\n');

			this._started = true;
			retval = this._func.apply (null, arguments, true);

		} else {
			this.status = 'resuming';
			luajs.stddebug.write ('[coroutine resuming]\n');

			var args = [];
			for (var i = 0, l = arguments.length; i < l; i++) args.push (arguments[i]);	

			this._yieldVars = args;
			retval = this._resumeStack.pop ()._run ();
		}	
	
		if (luajs.debug.status == 'suspending') {
			luajs.debug.resumeStack.push (this);
			return;
		}
		
		this.status = this._func._instance.terminated? 'dead' : 'suspended';

		if (retval) retval.unshift (true);

	} catch (e) {
		retval = [false, e];
		this.status = 'dead';
	}

	if (this.status == 'dead') {
		luajs.stddebug.write ('[coroutine terminated]\n');
		this._dispose();
	}

	return retval;
};




/**
 * Returns a unique identifier for the thread.
 * @returns {string} Description.
 */
luajs.Coroutine.prototype.toString = function () {
	return 'thread: 0x' + this._index.toString (16);
};




/**
 * Dumps memory used by the coroutine.
 */
luajs.Coroutine.prototype._dispose = function () {

	// delete this._func;
	// delete this._index;
	// delete this._listeners;
	// delete this._resumeStack;
	// delete this._started;
	// delete this._yieldVars
	// delete this.status

	this._resumeStack.splice(0, this._resumeStack.length);

	luajs.Coroutine._graveyard.push(this);
};



