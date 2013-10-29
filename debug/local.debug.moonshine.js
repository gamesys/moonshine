/**
 * @fileOverview Local UI for debug engine.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 * @copyright Gamesys Limited 2013
 */


var shine = shine || {};
shine.debug = shine.debug || {};
shine.debug.DEBUG_PAGE_PATH = '../debug/ui/index.html';



shine.debug.ui = {

	init: function () {

		var me = this,
			iframe = this.iframe = document.createElement('iframe');

		iframe.src = shine.debug.DEBUG_PAGE_PATH;
		iframe.style.position = 'fixed';
		iframe.style.top = '0';
		iframe.style.right = '20px';
		iframe.style.width = '270px';
		iframe.style.height = '30px';
		iframe.style.overflow = 'hidden';
		iframe.style.border = 'none';

		// window.addEventListener('load', function () {
			document.body.appendChild(iframe);

			iframe.contentWindow.addEventListener('load', function () {
				me._initIFrame(iframe);
			});			
		// });

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
	},

};


// Give time for the ui to be overridden
window.addEventListener('load', function () { shine.debug.ui.init(); });



