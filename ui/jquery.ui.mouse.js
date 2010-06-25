/*!
 * jQuery UI Mouse @VERSION
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Mouse
 *
 * Depends:
 *	jquery.ui.widget.js
 */
(function($) {

$.widget("ui.mouse", {
	options: {
		cancel: ':input,option',
		distance: 1,
		delay: 0
	},
	_eventNames: {
		start: 'mousedown',
		drag: 'mousemove',
		stop: 'mouseup'
	},
	_iPhoneEvent: function(event) {

		// unfortunately, touchend doesn't provide any information about the mouse position, so take
		// the touchmove event from before for that
		if(event.type == 'touchend')
			event = $.extend(event, this._prevEvent);

		// if we got a single touch, make dragging possible by simply copying the touch page information over to the
		// generic event information
		var t = (event.originalEvent || event).touches;
		return !$.ui.touch || (t.length == 1 ? (this._prevEvent = $.extend(event, {
				target: t[0].target.nodeType != 1 ? t[0].target.parentNode : t[0].target, // iOS+jQuery plays not well with text nodes as targets, so replace the target in that case with the parent
				pageX: t[0].pageX,
				pageY: t[0].pageY
			})) : false);
	
	},	
	_mouseInit: function() {
		var self = this;

		$.ui.touch && (this._eventNames = {
			start: 'touchstart',
			drag: 'touchmove',
			stop: 'touchend'
		});

		this.element
			.bind(this._eventNames.start+'.'+this.widgetName, function(event) {
				return self._iPhoneEvent(event) && self._mouseDown(event);
			})
			.bind('click.'+this.widgetName, function(event) {
				if(self._preventClickEvent) {
					self._preventClickEvent = false;
					event.stopImmediatePropagation();
					return false;
				}
			});

		this.started = false;
	},

	// TODO: make sure destroying one instance of mouse doesn't mess with
	// other instances of mouse
	_mouseDestroy: function() {
		this.element.unbind('.'+this.widgetName);
	},

	_mouseDown: function(event) {
		// don't let more than one widget handle mouseStart
		// TODO: figure out why we have to use originalEvent
		event.originalEvent = event.originalEvent || {};
		if (event.originalEvent.mouseHandled) { return; }

		// we may have missed mouseup (out of window)
		(this._mouseStarted && this._mouseUp(event));

		this._mouseDownEvent = event;
		
		var self = this,
			btnIsLeft = (event.which == 1 || $.ui.touch),
			elIsCancel = (typeof this.options.cancel == "string" ? (event.target.nodeType == 1 ? $(event.target).parents().add(event.target).filter(this.options.cancel).length : $(event.target).parents().filter(this.options.cancel).length) : false);
		if (!btnIsLeft || elIsCancel || !this._mouseCapture(event)) {
			return true;
		}

		this.mouseDelayMet = !this.options.delay;
		if (!this.mouseDelayMet) {
			this._mouseDelayTimer = setTimeout(function() {
				self.mouseDelayMet = true;
			}, this.options.delay);
		}

		if (this._mouseDistanceMet(event) && this._mouseDelayMet(event)) {
			this._mouseStarted = (this._mouseStart(event) !== false);
			if (!this._mouseStarted) {
				event.preventDefault();
				return true;
			}
		}

		// these delegates are required to keep context
		this._mouseMoveDelegate = function(event) {
			return self._iPhoneEvent(event) && self._mouseMove(event);
		};
		this._mouseUpDelegate = function(event) {
			return self._iPhoneEvent(event) && self._mouseUp(event);
		};
		$(document)
			.bind(this._eventNames.drag+'.'+this.widgetName, this._mouseMoveDelegate)
			.bind(this._eventNames.stop+'.'+this.widgetName, this._mouseUpDelegate);

		// preventDefault() is used to prevent the selection of text here -
		// however, in Safari, this causes select boxes not to be selectable
		// anymore, so this fix is needed
		(($.browser.safari && !$.ui.touch) || event.preventDefault());

		event.originalEvent.mouseHandled = true;
		return true;
	},

	_mouseMove: function(event) {
		// IE mouseup check - mouseup happened when mouse was out of window
		if ($.browser.msie && !event.button) {
			return this._mouseUp(event);
		}

		if (this._mouseStarted) {
			this._mouseDrag(event);
			return event.preventDefault();
		}

		if (this._mouseDistanceMet(event) && this._mouseDelayMet(event)) {
			this._mouseStarted =
				(this._mouseStart(this._mouseDownEvent, event) !== false);
			(this._mouseStarted ? this._mouseDrag(event) : this._mouseUp(event));
		}

		return !this._mouseStarted;
	},

	_mouseUp: function(event) {
		$(document)
			.unbind(this._eventNames.drag+'.'+this.widgetName, this._mouseMoveDelegate)
			.unbind(this._eventNames.stop+'.'+this.widgetName, this._mouseUpDelegate);

		if (this._mouseStarted) {
			this._mouseStarted = false;
			this._preventClickEvent = (event.target == this._mouseDownEvent.target);
			this._mouseStop(event);
		} else {
			if($.ui.touch) { // stopping propagation on touchstop is preventing the click event, which is bad..TODO: Make this more awesome like a real event on the target
				var event = $.extend(jQuery.Event('click'), { target: this._prevEvent.target, pageX: this._prevEvent.pageX, pageY: this._prevEvent.pageY });
				$(document).trigger(event);
			}
		}

		return false;
	},

	_mouseDistanceMet: function(event) {
		return (Math.max(
				Math.abs(this._mouseDownEvent.pageX - event.pageX),
				Math.abs(this._mouseDownEvent.pageY - event.pageY)
			) >= this.options.distance
		);
	},

	_mouseDelayMet: function(event) {
		return this.mouseDelayMet;
	},

	// These are placeholder methods, to be overriden by extending plugin
	_mouseStart: function(event) {},
	_mouseDrag: function(event) {},
	_mouseStop: function(event) {},
	_mouseCapture: function(event) { return true; }
});

})(jQuery);
