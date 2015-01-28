/*
 * Moonshine - a Lua virtual machine.
 *
 * Email: moonshine@gamesys.co.uk
 * http://moonshinejs.org
 *
 * Copyright (c) 2013-2015 Gamesys Limited. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


var http = require('http'),
	express = require('express'),
	socketio = require('socket.io'),
	EventEmitter = require('../../../vm/src/EventEmitter').EventEmitter;




AbstractConnection = function () {
	EventEmitter.apply(this);

	this.connected = false;
	if (this._port) this._open(this._port);
};


AbstractConnection.prototype = new EventEmitter;
AbstractConnection.prototype.constructor = AbstractConnection;




AbstractConnection.prototype._open = function (port) {
	var me = this;

	this._app = express();
	this._server = http.createServer(this._app).listen(port);
	this._io = socketio.listen(this._server, { 'log level': 0 });

	this._onReady();


	this._io.on('connection', function (socket) {

		if (me.connected) {
			var errorMessage = me._onFailedConnection();
			socket.emit('error', { message: errorMessage || 'Already connected to another instance.' });

			return;
		}


		socket.on('disconnect', function () {
			delete me._socket;

			me.connected = false;
			me._onDisconnect();
			me._trigger('disconnect');
		});


		socket.on('message', function (data, callback) {
			me._processMessage(data[0], data[1], callback);
		});


		me._socket = socket;
		me.connected = true;

		me._onConnection();
	});

};




AbstractConnection.prototype.disconnect = function () {
	this._socket.disconnect();
};




AbstractConnection.prototype._send = function (event, data, callback) {
	var socket = this._socket;
	if (socket) socket.emit(event, data, callback);
};




AbstractConnection.prototype._sendStatus = function (status) {
	this._send('status', status);
};




AbstractConnection.prototype._onReady = function () {
	// Override
};




AbstractConnection.prototype._onConnection = function () {
	// Override
};




AbstractConnection.prototype._onFailedConnection = function () {
	// Override
	// Return error message.
};




AbstractConnection.prototype._onDisconnect = function () {
	// Override
};




AbstractConnection.prototype._processMessage = function (event, data, callback) {
	// Override
};




module.exports = AbstractConnection;

