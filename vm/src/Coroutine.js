/**
 * @fileOverview Coroutine class.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
 */


'use strict';


var shine = shine || {};


/**
 * Represents a single coroutine (thread).
 * @constructor
 * @extends shine.EventEmitter
 * @param {shine.Closure} closure The closure that is to be executed in the thread.
 */
shine.Coroutine = function (closure) {
	shine.EventEmitter.call(this);

	this._func = closure.getInstance();
	this._index = shine.Coroutine._index++;
	this._started = false;
	this._yieldVars = undefined;
	this._resumeStack = this._resumeStack || shine.gc.createArray();
	this.status = shine.SUSPENDED;

	shine.stddebug.write ('[coroutine created]\n');
};


shine.Coroutine.prototype = new shine.EventEmitter();
shine.Coroutine.prototype.constructor = shine.Function;


shine.Coroutine._index = 0;
shine.Coroutine._stack = [];
shine.Coroutine._graveyard = [];


shine.Coroutine.create = function (closure) {
	var instance = shine.Coroutine._graveyard.pop();
	
	if (instance) {
		shine.Coroutine.apply(instance, arguments);
		return instance;
		
	} else {
		return new shine.Coroutine(closure);
	}
};




/**
 * Adds a new coroutine to the top of the run stack.
 * @static
 * @param {shine.Coroutine} co A running coroutine.
 */
shine.Coroutine._add = function (co) {
	shine.Coroutine._stack.push(shine.Coroutine._running);
	shine.Coroutine._running = co;
};




/**
 * Removes a coroutine from the run stack.
 * @static
 */
shine.Coroutine._remove = function () {
	shine.Coroutine._running = shine.Coroutine._stack.pop();
};




/**
 * Rusumes a suspended coroutine.
 * @returns {Array} Return values, either after terminating or from a yield.
 */
shine.Coroutine.prototype.resume = function () {
	var retval,
		funcToResume,
		vm = this._func._instance._vm;

	try {
		if (this.status == shine.DEAD) throw new shine.Error ('cannot resume dead coroutine');

		shine.Coroutine._add(this);
		
		if (vm && vm._status == shine.RESUMING) {
			funcToResume = vm._resumeStack.pop();

		} else if (shine.debug && shine.debug._status == shine.RESUMING) {
			funcToResume = shine.debug._resumeStack.pop();
		}

		if (funcToResume) {
			if (funcToResume instanceof shine.Coroutine) {
				retval = funcToResume.resume();

			} else if (funcToResume instanceof Function) {
				retval = funcToResume();

			} else {
				retval = this._func._instance._run();
			}

		} else if (!this._started) {
			this.status = shine.RUNNING;
			shine.stddebug.write('[coroutine started]\n');

			this._started = true;
			retval = this._func.apply(null, arguments);

		} else {
			this.status = shine.RESUMING;
			shine.stddebug.write('[coroutine resuming]\n');

			if (!arguments.length) {
				this._yieldVars = undefined;

			} else {
				var args = shine.gc.createArray();
				for (var i = 0, l = arguments.length; i < l; i++) args.push(arguments[i]);	

				this._yieldVars = args;
			}

			retval = this._resumeStack.pop()._run();
		}	
	
		if (shine.debug && shine.debug._status == shine.SUSPENDING) {
			shine.debug._resumeStack.push(this);
			return;
		}
		
		this.status = this._func._instance.terminated? shine.DEAD : shine.SUSPENDED;

		if (retval) retval.unshift(true);

	} catch (e) {
		if (!e.luaStack) e.luaStack = shine.gc.createArray();
		e.luaStack.push([this._func._instance, this._func._instance._pc - 1]);

		retval = [false, e];
		this.status = shine.DEAD;
	}

	if (this.status == shine.DEAD) {
		shine.Coroutine._remove();
		shine.stddebug.write('[coroutine terminated]\n');
		this._dispose();
	}

	return retval;
};




/**
 * Returns a unique identifier for the thread.
 * @returns {string} Description.
 */
shine.Coroutine.prototype.toString = function () {
	return 'thread:' + (this._index? '0x' + this._index.toString(16) : '[dead]');
};




/**
 * Dumps memory used by the coroutine.
 */
shine.Coroutine.prototype._dispose = function () {

	delete this._func;
	delete this._index;
	delete this._listeners;
	// delete this._resumeStack;
	delete this._started;
	delete this._yieldVars
	delete this.status

	this._resumeStack.length = 0;

	shine.Coroutine._graveyard.push(this);
};



