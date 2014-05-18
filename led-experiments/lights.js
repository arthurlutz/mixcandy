var Lights = function (o) {
    var self = this;
    o = o || {};

    // Required parameters
    self.song = o.song;
    self.layoutURL = o.layoutURL;

    // Optional Fadecandy connection parameters
    self.serverURL = o.serverURL || "ws://localhost:7890";
    self.retryInterval = o.retryInterval || 1000;
    self.drawInterval = o.drawInterval || 2;

    // Callbacks
    self.onconnecting = o.onconnecting || function() {};
    self.onconnected = o.onconnected || function() {};
    self.onerror = o.onerror || function() {};

    // Download layout file before connecting
    $.getJSON(this.layoutURL, function(data) {
        self.layout = data;
        self.connect();
    });
}

Lights.prototype.connect = function() {
    var self = this;
    self.ws = new WebSocket(this.serverURL);

    self.ws.onerror = function(event) {
        self.status = "error";
        self.onerror(event);
    }

    self.ws.onclose = function(event) {
        self.status = "closed";
        self.onclose(event);

        // Retry
        if (self.retryInterval) {
            window.setTimeout(function() {
                self.connect();
            }, self.retryInterval);
        }
    }

    self.ws.onopen = function(event) {
        self.status = "connected";
        self.onconnected();
        self._animationLoop();
    }

    self.status = "connecting";
    self.onconnecting();
}

Lights.prototype._animationLoop = function() {
    var self = this;
    self.draw();
    window.setTimeout(function() {
        self._animationLoop();
    }, self.drawInterval);
}

Lights.prototype.hsv = function(h, s, v)
{
    /*
     * Converts an HSV color value to RGB.
     *
     * Normal hsv range is in [0, 1], RGB range is [0, 255].
     * Colors may extend outside these bounds. Hue values will wrap.
     *
     * Based on tinycolor:
     * https://github.com/bgrins/TinyColor/blob/master/tinycolor.js
     * 2013-08-10, Brian Grinstead, MIT License
     */

    h = (h % 1) * 6;
    if (h < 0) h += 6;

    var i = h | 0,
        f = h - i,
        p = v * (1 - s),
        q = v * (1 - f * s),
        t = v * (1 - (1 - f) * s),
        r = [v, q, p, p, t, v][i],
        g = [t, v, v, q, p, p][i],
        b = [p, p, t, v, v, q][i];

    return [ r * 255, g * 255, b * 255 ];
}

Lights.prototype.draw = function() {
    // Main animation function; redraw the LEDs and send a frame to the server

    // XXX: Demo copied from particle_trail.js FC example

    var time = 0.009 * new Date().getTime();
    var numParticles = 200;
    var particles = [];

    for (var i = 0; i < numParticles; i++) {
        var s = i / numParticles;

        var radius = 0.2 + 1.5 * s;
        var theta = time + 0.04 * i;
        var x = radius * Math.cos(theta);
        var y = radius * Math.sin(theta + 10.0 * Math.sin(theta * 0.15));
        var hue = time * 0.01 + s * 0.2;

        particles[i] = {
            point: [x, 0, y],
            intensity: 0.2 * s,
            falloff: 60,
            color: this.hsv(hue, 0.5, 0.8)
        };
    }

    this.renderParticles(particles);
}

Lights.prototype.renderParticles = function(particles) {
    // Big monolithic chunk of performance-critical code to render particles to the LED
    // model, assemble a framebuffer, and send it out over WebSockets.

    var layout = this.layout;
    var socket = this.ws;
    var packet = new Uint8ClampedArray(4 + this.layout.length * 3);

    if (socket.readyState != 1 /* OPEN */) {
        // The server connection isn't open. Nothing to do.
        return;
    }

    if (socket.bufferedAmount > packet.length) {
        // The network is lagging, and we still haven't sent the previous frame.
        // Don't flood the network, it will just make us laggy.
        // If fcserver is running on the same computer, it should always be able
        // to keep up with the frames we send, so we shouldn't reach this point.
        return;
    }

    // Dest position in our packet. Start right after the header.
    var dest = 4;

    // Sample the center pixel of each LED
    for (var led = 0; led < layout.length; led++) {
        var p = layout[led];

        var r = 0;
        var g = 0;
        var b = 0;

        for (var i = 0; i < particles.length; i++) {
            var particle = particles[i];

            // Particle to sample distance
            var dx = (p.point[0] - particle.point[0]) || 0;
            var dy = (p.point[1] - particle.point[1]) || 0;
            var dz = (p.point[2] - particle.point[2]) || 0;
            var dist2 = dx * dx + dy * dy + dz * dz;

            // Particle edge falloff
            var intensity = particle.intensity / (1 + particle.falloff * dist2);

            // Intensity scaling
            r += particle.color[0] * intensity;
            g += particle.color[1] * intensity;
            b += particle.color[2] * intensity;
        }

        packet[dest++] = r;
        packet[dest++] = g;
        packet[dest++] = b;
    }

    socket.send(packet.buffer);
}

Lights.prototype.shader = function(pixelInfo) {
    return [0.2, 0.1, 0.1];
}
