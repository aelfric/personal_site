/*

Created By: Dustin Diaz
Website: http://www.dustindiaz.com

Modified by: Frank Riccobono
*/
var toolTipLib = {
 
	xCord : 0,

	yCord : 0,

	obj : null,

	tipElements : ['a','abbr','acronym'],

	attachToolTipBehavior: function() {

		if ( !document.getElementById ||

			!document.createElement ||

			!document.getElementsByTagName ) {

			return;

		}

		var i,j;

		addEvent(document,'mousemove',toolTipLib.updateXY,false);

		if ( document.captureEvents ) {

				document.captureEvents(Event.MOUSEMOVE);

		}

		for ( i=0;i<toolTipLib.tipElements.length;i++ ) {

			var current = document.getElementsByTagName(toolTipLib.tipElements[i]);

			for ( j=0;j<current.length;j++ ) {

				addEvent(current[j],'mouseover',toolTipLib.tipOver,false);

				addEvent(current[j],'mouseout',toolTipLib.tipOut,false);

				current[j].setAttribute('tip',current[j].title);

				current[j].removeAttribute('title');

			}

		}

	},

	updateXY : function(e) {

		if ( document.captureEvents ) {

			toolTipLib.xCord = e.pageX;

			toolTipLib.yCord = e.pageY;

		} else if ( window.event.clientX ) {

			toolTipLib.xCord = window.event.clientX+document.documentElement.scrollLeft;

			toolTipLib.yCord = window.event.clientY+document.documentElement.scrollTop;

		}

	},

	tipOut: function(e) {

		if ( window.tID ) {

			clearTimeout(tID);

		}

		if ( window.opacityID ) {

			clearTimeout(opacityID);

		}

		var l = getEventSrc(e);

		var div = document.getElementById('toolTip');

		if ( div ) {

			div.parentNode.removeChild(div);

		}

	},

	checkNode : function(obj) {

		var trueObj = obj;

		if ( trueObj.nodeName.toLowerCase() == 'a' || trueObj.nodeName.toLowerCase() == 'acronym' || trueObj.nodeName.toLowerCase() == 'abbr' ) {

			return trueObj;

		} else {

			return trueObj.parentNode;

		}

	},

	tipOver : function(e) {

		toolTipLib.obj = getEventSrc(e);

		tID = setTimeout("toolTipLib.tipShow()",500)

	},

	tipShow : function() {

		var newDiv = document.createElement('div');

		var scrX = Number(toolTipLib.xCord);

		var scrY = Number(toolTipLib.yCord);

		var tp = parseInt(scrY+15);

		var lt = parseInt(scrX+10);

		var anch = toolTipLib.checkNode(toolTipLib.obj);

		var addy = '';

		var access = '';

		addy = anch.firstChild.nodeValue;
		newDiv.id = 'toolTip';

		document.getElementsByTagName('body')[0].appendChild(newDiv);

		newDiv.style.opacity = '.1';

		newDiv.innerHTML = "<p><em>"+access+addy+"</em>"+anch.getAttribute('tip')+"</p>";

		if ( parseInt(document.documentElement.clientWidth+document.documentElement.scrollLeft) < parseInt(newDiv.offsetWidth+lt) ) {

			newDiv.style.left = parseInt(lt-(newDiv.offsetWidth+10))+'px';

		} else {

			newDiv.style.left = lt+'px';

		}

		if ( parseInt(document.documentElement.clientHeight+document.documentElement.scrollTop) < parseInt(newDiv.offsetHeight+tp) ) {

			newDiv.style.top = parseInt(tp-(newDiv.offsetHeight+10))+'px';

		} else {

			newDiv.style.top = tp+'px';

		}

		toolTipLib.tipFade('toolTip',10);

	},

	tipFade: function(div,opac) {

		var obj = document.getElementById(div);

		var passed = parseInt(opac);

		var newOpac = parseInt(passed+10);

		if ( newOpac < 80 ) {

			obj.style.opacity = '.'+newOpac;

			obj.style.filter = "alpha(opacity:"+newOpac+")";

			opacityID = setTimeout("toolTipLib.tipFade('toolTip','"+newOpac+"')",20);

		}

		else {
 
			obj.style.opacity = '.95';

			obj.style.filter = "alpha(opacity:95)";

		}

	}

};


addEvent(window,'load',toolTipLib.attachToolTipBehavior,false);

function addEvent(elm, evType, fn, useCapture) {

	if (elm.addEventListener) {
 
	elm.addEventListener(evType, fn, useCapture);
 
	return true;
 
	}

	else if (elm.attachEvent) {
 
	var r = elm.attachEvent('on' + evType, fn);
 
	EventCache.add(elm, evType, fn);

	return r;
 
	}

	else {

	elm['on' + evType] = fn;

	}
}
function getEventSrc(e) {

	if (!e) e = window.event;


	if (e.originalTarget)

	return e.originalTarget;

	else if (e.srcElement)

	return e.srcElement;

}

function addLoadEvent(func) {
var oldonload = window.onload;

	if (typeof window.onload != 'function') {

	window.onload = func;

	} else {

	window.onload = 

		function() {

		oldonload();

		func();

		}

	}

}


var EventCache = function(){

	var listEvents = [];

	return {

		listEvents : listEvents,

	
		add : function(node, sEventName, fHandler, bCapture){

			listEvents.push(arguments);

		},

	
		flush : function(){

			var i, item;

			for(i = listEvents.length - 1; i >= 0; i = i - 1){

				item = listEvents[i];

				if(item[0].removeEventListener){

					item[0].removeEventListener(item[1], item[2], item[3]);

				};

				
				/* From this point on we need the event names to be prefixed with 'on" */

				if(item[1].substring(0, 2) != "on"){

					item[1] = "on" + item[1];

				};


				if(item[0].detachEvent){

					item[0].detachEvent(item[1], item[2]);

				};
 
				item[0][item[1]] = null;

			};

		}

	};

}();




addEvent(window,'unload',EventCache.flush, false);