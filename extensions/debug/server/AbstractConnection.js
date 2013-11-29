/*
 * Moonshine - a Lua virtual machine.
 *
 * Copyright (C) 2013 Gamesys Limited,
 * 10 Piccadilly, London W1J 0DD
 * Email: moonshine@gamesys.co.uk
 * http://moonshinejs.org
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
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

