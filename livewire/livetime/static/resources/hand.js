(function () {

    var supportedEventsNames = ["PointerDown", "PointerUp", "PointerMove", "PointerOver", "PointerOut", "PointerCancel", "PointerEnter", "PointerLeave",
                                "pointerdown", "pointerup", "pointermove", "pointerover", "pointerout", "pointercancel", "pointerenter", "pointerleave"
    ];

    var POINTER_TYPE_TOUCH = "touch";
    var POINTER_TYPE_PEN = "pen";
    var POINTER_TYPE_MOUSE = "mouse";

    // Touch events
    var generateTouchClonedEvent = function (sourceEvent, newName) {
        // Considering touch events are almost like super mouse events
        var evObj = document.createEvent('MouseEvents');
        evObj.initMouseEvent(newName, true, true, window, 1, sourceEvent.screenX, sourceEvent.screenY,
            sourceEvent.clientX, sourceEvent.clientY, sourceEvent.ctrlKey, sourceEvent.altKey,
            sourceEvent.shiftKey, sourceEvent.metaKey, sourceEvent.button, null);

        // offsets
        if (evObj.offsetX === undefined) {
            if (sourceEvent.offsetX !== undefined) {

                // For Opera which creates readonly properties
                if (Object && Object.defineProperty !== undefined) {
                    Object.defineProperty(evObj, "offsetX", {
                        writable: true
                    });
                    Object.defineProperty(evObj, "offsetY", {
                        writable: true
                    });
                }

                evObj.offsetX = sourceEvent.offsetX;
                evObj.offsetY = sourceEvent.offsetY;
            }
            else if (sourceEvent.layerX !== undefined) {
                evObj.offsetX = sourceEvent.layerX - sourceEvent.currentTarget.offsetLeft;
                evObj.offsetY = sourceEvent.layerY - sourceEvent.currentTarget.offsetTop;
            }
        }

        // adding missing properties

        if (sourceEvent.isPrimary !== undefined)
            evObj.isPrimary = sourceEvent.isPrimary;
        else
            evObj.isPrimary = true;

        if (sourceEvent.pressure)
            evObj.pressure = sourceEvent.pressure;
        else {
            var button = 0;

            if (sourceEvent.which !== undefined)
                button = sourceEvent.which;
            else if (sourceEvent.button !== undefined) {
                button = sourceEvent.button;
            }
            evObj.pressure = (button == 0) ? 0 : 0.5;
        }


        if (sourceEvent.rotation)
            evObj.rotation = sourceEvent.rotation;
        else
            evObj.rotation = 0;

        // Timestamp
        if (sourceEvent.hwTimestamp)
            evObj.hwTimestamp = sourceEvent.hwTimestamp;
        else
            evObj.hwTimestamp = 0;

        // Tilts
        if (sourceEvent.tiltX)
            evObj.tiltX = sourceEvent.tiltX;
        else
            evObj.tiltX = 0;

        if (sourceEvent.tiltY)
            evObj.tiltY = sourceEvent.tiltY;
        else
            evObj.tiltY = 0;

        // Width and Height
        if (sourceEvent.height)
            evObj.height = sourceEvent.height;
        else
            evObj.height = 0;

        if (sourceEvent.width)
            evObj.width = sourceEvent.width;
        else
            evObj.width = 0;

	var stop_p = evObj.stopPropagation;

	if (sourceEvent.stopPropagation !== undefined) {
	    sourceEvent.stopPropagation();
	}
	evObj.stopPropagation = function () {
	    stop_p.apply(this);
	};
        // PreventDefault
        evObj.preventDefault = function () {
            if (sourceEvent.preventDefault !== undefined)
                sourceEvent.preventDefault();
        };

        // Constants
        evObj.POINTER_TYPE_TOUCH = POINTER_TYPE_TOUCH;
        evObj.POINTER_TYPE_PEN = POINTER_TYPE_PEN;
        evObj.POINTER_TYPE_MOUSE = POINTER_TYPE_MOUSE;

        // Pointer values
        evObj.pointerId = sourceEvent.pointerId;
        evObj.pointerType = sourceEvent.pointerType;

        switch (evObj.pointerType) {// Old spec version check
            case 2:
                evObj.pointerType = evObj.POINTER_TYPE_TOUCH;
                break;
            case 3:
                evObj.pointerType = evObj.POINTER_TYPE_PEN;
                break;
            case 4:
                evObj.pointerType = evObj.POINTER_TYPE_MOUSE;
                break;
        }

        // If force preventDefault
        if (sourceEvent.currentTarget.handjs_forcePreventDefault === true)
            evObj.preventDefault();

        // Fire event
        sourceEvent.currentTarget.dispatchEvent(evObj);
    };

    var generateMouseProxy = function (evt, eventName) {
        evt.pointerId = 1;
        evt.pointerType = POINTER_TYPE_MOUSE;
        generateTouchClonedEvent(evt, eventName);
    };

    var handleOtherEvent = function (eventObject, name) {
        if (eventObject.preventManipulation)
            eventObject.preventManipulation();

        for (var i = 0; i < eventObject.changedTouches.length; ++i) {
            var touchPoint = eventObject.changedTouches[i];
            var touchPointId = touchPoint.identifier + 2; // Just to not override mouse id

            touchPoint.pointerId = touchPointId;
            touchPoint.pointerType = POINTER_TYPE_TOUCH;
            touchPoint.currentTarget = eventObject.currentTarget;

            if (eventObject.preventDefault !== undefined) {
                touchPoint.preventDefault = function () {
                    eventObject.preventDefault();
                };
            }

            generateTouchClonedEvent(touchPoint, name);
        }
    };

    var makeTouchAware = function (item, eventName) {
        // If item is already touch aware, do nothing
        if (item.onpointerdown !== undefined) {
            return;
        }

        // IE 10
        if (item.onmspointerdown !== undefined) {
            var msEventName;

            if (eventName == eventName.toLowerCase()) {
                var indexOfUpperCase = supportedEventsNames.indexOf(eventName) - (supportedEventsNames.length / 2);
                msEventName = "MS" + supportedEventsNames[indexOfUpperCase];
            }
            else {
                msEventName = "MS" + eventName;
            }

            item.addEventListener(msEventName, function (evt) { generateTouchClonedEvent(evt, eventName); }, false);

            // We can return because MSPointerXXX integrate mouse support
            return;
        }

        // Chrome, Firefox
        if (item.ontouchstart !== undefined) {
            switch (eventName.toLowerCase()) {
                case "pointerdown":
                    item.addEventListener("touchstart", function (evt) { handleOtherEvent(evt, eventName); }, false);
                    break;
                case "pointermove":
                    item.addEventListener("touchmove", function (evt) { handleOtherEvent(evt, eventName); }, false);
                    break;
                case "pointerup":
                    item.addEventListener("touchend", function (evt) { handleOtherEvent(evt, eventName); }, false);
                    break;
                case "pointercancel":
                    item.addEventListener("touchcancel", function (evt) { handleOtherEvent(evt, eventName); }, false);
                    break;
            }
        }

        // Fallback to mouse
        switch (eventName.toLowerCase()) {
            case "pointerdown":
                item.addEventListener("mousedown", function (evt) { generateMouseProxy(evt, eventName); }, false);
                break;
            case "pointermove":
                item.addEventListener("mousemove", function (evt) { generateMouseProxy(evt, eventName); }, false);
                break;
            case "pointerup":
                item.addEventListener("mouseup", function (evt) { generateMouseProxy(evt, eventName); }, false);
                break;
            case "pointerover":
                item.addEventListener("mouseover", function (evt) { generateMouseProxy(evt, eventName); }, false);
                break;
            case "pointerout":
                item.addEventListener("mouseout", function (evt) { generateMouseProxy(evt, eventName); }, false);
                break;
            case "pointerenter":
                item.addEventListener("mousenter", function (evt) { generateMouseProxy(evt, eventName); }, false);
                break;
            case "pointerleave":
                item.addEventListener("mouseleave", function (evt) { generateMouseProxy(evt, eventName); }, false);
                break;
        }
    };

    var removeTouchAware = function (item, eventName) {
        // If item is already touch aware, do nothing
        if (item.onpointerdown !== undefined) {
            return;
        }

        // IE 10
        if (item.onmspointerdown !== undefined) {
            var msEventName;

            if (eventName == eventName.toLowerCase()) {
                var indexOfUpperCase = supportedEventsNames.indexOf(eventName) - (supportedEventsNames.length / 2);
                msEventName = "MS" + supportedEventsNames[indexOfUpperCase];
            }
            else {
                msEventName = "MS" + eventName;
            }
            item.removeEventListener(msEventName, function (evt) { generateTouchClonedEvent(evt, eventName); });
            return;
        }

        // Chrome, Firefox
        if (item.ontouchstart !== undefined) {
            switch (eventName.toLowerCase()) {
                case "pointerdown":
                    item.removeEventListener("touchstart", function (evt) { handleOtherEvent(evt, eventName); });
                    break;
                case "pointermove":
                    item.removeEventListener("touchmove", function (evt) { handleOtherEvent(evt, eventName); });
                    break;
                case "pointerup":
                    item.removeEventListener("touchend", function (evt) { handleOtherEvent(evt, eventName); });
                    break;
                case "pointercancel":
                    item.removeEventListener("touchcancel", function (evt) { handleOtherEvent(evt, eventName); });
                    break;
            }
        }
        // Fallback to mouse
        switch (eventName.toLowerCase()) {
            case "pointerdown":
                item.removeEventListener("mousedown", function (evt) { generateMouseProxy(evt, eventName); });
                break;
            case "pointermove":
                item.removeEventListener("mousemove", function (evt) { generateMouseProxy(evt, eventName); });
                break;
            case "pointerup":
                item.removeEventListener("mouseup", function (evt) { generateMouseProxy(evt, eventName); });
                break;
            case "pointerover":
                item.removeEventListener("mouseover", function (evt) { generateMouseProxy(evt, eventName); });
                break;
            case "pointerout":
                item.removeEventListener("mouseout", function (evt) { generateMouseProxy(evt, eventName); });
                break;
            case "pointerenter":
                item.removeEventListener("mouseenter", function (evt) { generateMouseProxy(evt, eventName); });
                break;
            case "pointerleave":
                item.removeEventListener("mouseleave", function (evt) { generateMouseProxy(evt, eventName); });
                break;
        }
    };

    // Intercept addEventListener calls by changing the prototype
    var interceptAddEventListener = function (root) {
        var current = root.prototype.addEventListener;

        var customAddEventListener = function (name, func, capture) {
            // Branch when a PointerXXX is used
            if (supportedEventsNames.indexOf(name) != -1) {
                makeTouchAware(this, name);
            }

            current.call(this, name, func, capture);
        };

        root.prototype.addEventListener = customAddEventListener;
    };

    // Intercept removeEventListener calls by changing the prototype
    var interceptRemoveEventListener = function (root) {
        var current = root.prototype.removeEventListener;

        var customRemoveEventListener = function (name, func, capture) {
            // Release when a PointerXXX is used
            if (supportedEventsNames.indexOf(name) != -1) {
                removeTouchAware(this, name);
            }

            current.call(this, name, func, capture);
        };

        root.prototype.removeEventListener = customRemoveEventListener;
    };

    // Hooks
    interceptAddEventListener(HTMLBodyElement);
    interceptAddEventListener(HTMLCanvasElement);
    interceptAddEventListener(HTMLDivElement);
    interceptAddEventListener(HTMLImageElement);
    interceptAddEventListener(HTMLSpanElement);
    interceptAddEventListener(HTMLUListElement);
    interceptAddEventListener(HTMLAnchorElement);
    interceptAddEventListener(HTMLLIElement);

    interceptRemoveEventListener(HTMLBodyElement);
    interceptRemoveEventListener(HTMLCanvasElement);
    interceptRemoveEventListener(HTMLDivElement);
    interceptRemoveEventListener(HTMLImageElement);
    interceptRemoveEventListener(HTMLSpanElement);
    interceptRemoveEventListener(HTMLUListElement);
    interceptRemoveEventListener(HTMLAnchorElement);
    interceptRemoveEventListener(HTMLLIElement);

    // Extension to navigator
    if (navigator.pointerEnabled === undefined) {

        // Indicates if the browser will fire pointer events for pointing input
        navigator.pointerEnabled = true;

        // IE
        if (navigator.msPointerEnabled) {
            navigator.maxTouchPoints = navigator.msMaxTouchPoints;
        }
    }

    // Handling touch-action css rule
    if (document.styleSheets) {
        document.addEventListener("DOMContentLoaded", function () {

            var trim = function (string) {
                return string.replace(/^\s+|\s+$/, '');
            };

            var processStylesheet = function (unfilteredSheet) {
                var globalRegex = new RegExp(".+?{.*?}", "m");
                var selectorRegex = new RegExp(".+?{", "m");

                while (unfilteredSheet != "") {
                    var block = globalRegex.exec(unfilteredSheet)[0];
                    unfilteredSheet = trim(unfilteredSheet.replace(block, ""));
                    var selectorText = trim(selectorRegex.exec(block)[0].replace("{", ""));

                    // Checking if the user wanted to deactivate the default behavior
                    if (block.replace(/\s/g, "").indexOf("touch-action:none") != -1) {
                        var elements = document.querySelectorAll(selectorText);

                        for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
                            var element = elements[elementIndex];

                            if (element.style.msTouchAction !== undefined) {
                                element.style.msTouchAction = "none";
                            }
                            else {
                                element.handjs_forcePreventDefault = true;
                            }
                        }
                    }
                }
            };

            // Looking for touch-action in referenced stylesheets
            for (var index = 0; index < document.styleSheets.length; index++) {
                var sheet = document.styleSheets[index];

                if (sheet.href == undefined) { // it is an inline style
                    continue;
                }

                // Loading the original stylesheet
                var xhr = new XMLHttpRequest();


		// guard against cross-domain requests.
		// This should really allow explicitly cross-origin shared style sheets
		// at least this doesn't throw errors where there are external css sheets
		if(sheet.href.split('://')[1].indexOf(location.host) == 0) {
		    xhr.open("get", sheet.href, false);
                    xhr.send();
		}

                var unfilteredSheet = xhr.responseText.replace(/(\n|\r)/g, "");

                processStylesheet(unfilteredSheet);
            }

            // Looking for touch-action in inline styles
            var styles = document.getElementsByTagName("style");
            for (var index = 0; index < styles.length; index++) {
                var inlineSheet = styles[index];

                var inlineUnfilteredSheet = trim(inlineSheet.innerHTML.replace(/(\n|\r)/g, ""));

                processStylesheet(inlineUnfilteredSheet);
            }
        }, false);
    }

})();
