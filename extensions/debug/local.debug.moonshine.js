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

/**
 * @fileOverview Local UI for debug engine.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */


var shine = shine || {};
shine.debug = shine.debug || {};


shine.debug.LOCAL_UI_URL = (function () {
	var script = document.querySelector('script[src$="local.debug.moonshine.js"]');
	return shine.debug.LOCAL_UI_URL || (script? script.src.substr(0, script.src.length - 25) : './js/moonshine/extensions/debug') + '/ui';
})();




shine.debug.ui = {

	name: 'local',

	init: function () {

		var me = this,
			iframe = this.iframe = document.createElement('iframe');

		iframe.src = shine.debug.LOCAL_UI_URL;
		iframe.style.position = 'fixed';
		iframe.style.top = '0';
		iframe.style.right = '20px';
		iframe.style.width = '270px';
		iframe.style.height = '30px';
		iframe.style.overflow = 'hidden';
		iframe.style.border = 'none';


		function append () {
			document.body.appendChild(iframe);

			iframe.contentWindow.addEventListener('load', function () {
				me._initIFrame(iframe);
			});			
		}

		if (document.body) {
			append();
		} else {
			window.addEventListener('load', append, false);
		}
	},




	_initIFrame: function (iframe) {
		var doc = iframe.contentDocument,
			toggle = document.createElement('button');

		// Toggle size;
		toggle.className = 'toggle';
		toggle.title = 'Toggle size';
		toggle.textContent = 'Size';


		function toggleExpanded () {
			var expand = toggle.className == 'toggle';

			if (expand) {
				iframe.style.width = '50%';
				iframe.style.right = '0';
				iframe.style.height = '100%';
				toggle.className = 'toggle expanded';

			} else {
				iframe.style.right = '20px';
				iframe.style.width = '270px';
				iframe.style.height = '30px';
				toggle.className = 'toggle';
			}

			if (sessionStorage) sessionStorage.setItem('expanded', expand? '1' : '');
		}

		toggle.addEventListener('click', toggleExpanded);	
		if (sessionStorage && sessionStorage.getItem('expanded')) toggleExpanded();


		iframe.contentDocument.querySelector('.buttons').appendChild(toggle);
		iframe.contentWindow.registerDebugEngine(shine.debug);
		shine.debug._clearLoadQueue();
	}

};




shine.debug.ui.init();

