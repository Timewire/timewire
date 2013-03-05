var context;
var plainCanvas;
var log;
var pointerDown = {};
var lastPositions = {};
var colors = ["rgb(100, 255, 100)", "rgb(255, 0, 0)", "rgb(0, 255, 0)", "rgb(0, 0, 255)", "rgb(0, 255, 100)", "rgb(10, 255, 255)", "rgb(255, 0, 100)"];

var onPointerMove = function(evt) {
    if (pointerDown[evt.pointerId]) {

        var color = colors[evt.pointerId % colors.length];

        context.strokeStyle = color;

        context.beginPath();
        context.lineWidth = 2;
        context.moveTo(lastPositions[evt.pointerId].x, lastPositions[evt.pointerId].y);
        context.lineTo(evt.clientX, evt.clientY);
        context.closePath();
        context.stroke();

        lastPositions[evt.pointerId] = { x: evt.clientX, y: evt.clientY };

        log.innerHTML = "pointerId:" + evt.pointerId + "<br>Pressure:" + evt.pressure + "<br>Type:" + evt.pointerType;
    }    
};

var onPointerOut = function (evt) {
    pointerDown[evt.pointerId] = false;
};

var onPointerUp = function (evt) {
    pointerDown[evt.pointerId] = false;
};

var onPointerDown = function (evt) {
    pointerDown[evt.pointerId] = true;

    lastPositions[evt.pointerId] = { x: evt.clientX, y: evt.clientY };
};

var onload = function() {
    plainCanvas = document.getElementById("plainCanvas");
    log = document.getElementById("log");

    plainCanvas.width = plainCanvas.clientWidth;
    plainCanvas.height = plainCanvas.clientHeight;

    context = plainCanvas.getContext("2d");

    context.fillStyle = "rgba(50, 50, 50, 1)";
    context.fillRect(0, 0, plainCanvas.width, plainCanvas.height);

    plainCanvas.addEventListener("pointerdown", onPointerDown, false);
    plainCanvas.addEventListener("PointerMove", onPointerMove, false);
    plainCanvas.addEventListener("PointerUp", onPointerUp, false);
    plainCanvas.addEventListener("PointerOut", onPointerUp, false);
};

document.addEventListener("DOMContentLoaded", onload, false);