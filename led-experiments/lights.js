var Lights = function (o) {
    var self = this;
    o = o || {};

    // Required parameters
    self.song = o.song;
    self.layoutURL = o.layoutURL;
    self.analysis = o.analysis;

    // Optional lag adjustment, in seconds
    self.lagAdjustment = o.lagAdjustment || 0;

    // Optional Fadecandy connection parameters
    self.serverURL = o.serverURL || "ws://localhost:7890";
    self.retryInterval = o.retryInterval || 1000;
    self.frameInterval = o.frameInterval || 10;

    // Callbacks
    self.onconnecting = o.onconnecting || function() {};
    self.onconnected = o.onconnected || function() {};
    self.onerror = o.onerror || function() {};

    // Instance of the Fadecandy "Rings" effect to use as a background
    self.rings = new Rings();

    // Analysis tracking
    this.mood = null;
    this.segment = null;
    this._songPosition = 0;

    // Visualization state (particle array)
    self.particles = [];
    self.particleLifespan = 2 * (60.0 / self.analysis.features.BPM);

    // Download layout file before connecting
    $.getJSON(this.layoutURL, function(data) {
        self.layout = data;
        self.connect();
    });
}

Lights.prototype.moodTable = {
    Peaceful:      { valence: 0/4, energy: 0/4 },
    Easygoing:     { valence: 0/4, energy: 1/4 },
    Upbeat:        { valence: 0/4, energy: 2/4 },
    Lively:        { valence: 0/4, energy: 3/4 },
    Excited:       { valence: 0/4, energy: 4/4 },
    Tender:        { valence: 1/4, energy: 0/4 },
    Romantic:      { valence: 1/4, energy: 1/4 },
    Empowering:    { valence: 1/4, energy: 2/4 },
    Stirring:      { valence: 1/4, energy: 3/4 },
    Rowdy:         { valence: 1/4, energy: 4/4 },
    Sentimental:   { valence: 2/4, energy: 0/4 },
    Sophisticated: { valence: 2/4, energy: 1/4 },
    Sensual:       { valence: 2/4, energy: 2/4 },
    Fiery:         { valence: 2/4, energy: 3/4 },
    Energizing:    { valence: 2/4, energy: 4/4 },
    Melancholy:    { valence: 3/4, energy: 0/4 },
    Blue:          { valence: 3/4, energy: 0/4 },  // Not sure if this is right
    Cool:          { valence: 3/4, energy: 1/4 },
    Yearning:      { valence: 3/4, energy: 2/4 },
    Urgent:        { valence: 3/4, energy: 3/4 },
    Defiant:       { valence: 3/4, energy: 4/4 },
    Somber:        { valence: 4/4, energy: 0/4 },
    Gritty:        { valence: 4/4, energy: 1/4 },
    Serious:       { valence: 4/4, energy: 2/4 },
    Brooding:      { valence: 4/4, energy: 3/4 },
    Aggressive:    { valence: 4/4, energy: 4/4 },
};

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
    self.doFrame();
    window.setTimeout(function() {
        self._animationLoop();
    }, self.frameInterval);
}

Lights.prototype.doFrame = function() {
    // Main animation function, runs once per frame

    this.frameTimestamp = new Date().getTime() * 1e-3;
    this.followAnalysis();
    this.updateBackground();
    this.particles = this.particles.filter(this.updateParticle, this);
    this.renderParticles();
}

Lights.prototype.updateBackground = function() {
    // Background is based on the current segment
    if (this.segment) {
        var type = this.segment.TYPE;
        var targetContrast, targetSaturation, targetBrightness, targetHue;

        if (type == "Chorus") {
            // Something bright and desaturated

            targetContrast = 2.0;
            targetSaturation = 0.1;
            targetBrightness = -1.5;
            targetHue = this.rings.hue;

        } else if (type == "Verse") {
            // Verse, do something bright and saturated

            targetContrast = 2.0;
            targetSaturation = 0.5;
            targetBrightness = -1.5;
            targetHue = this.rings.hue;

        } else {
            // Lettered section, make something arbitrary and uniqueish

            var id = type.charCodeAt(0) - "a".charCodeAt(0);

            targetContrast = 0.8;
            targetSaturation = 0.3;
            targetBrightness = -0.7;
            targetHue = id * 0.3;
        }

        var filterRate = 0.2;
        this.rings.contrast += (targetContrast - this.rings.contrast) * filterRate;
        this.rings.saturation += (targetSaturation - this.rings.saturation) * filterRate;
        this.rings.brightness += (targetBrightness - this.rings.brightness) * filterRate;
        this.rings.hue += (targetHue - this.rings.hue) * filterRate;

        console.log(targetContrast, targetSaturation, targetBrightness, targetHue);
    }

    this.rings.beginFrame(this.frameTimestamp);
}

Lights.prototype.followAnalysis = function() {
    // Follow along with the music analysis in real-time. Fires off a beat() for
    // each beat, and sets "this.mood" and "this.segment" according to the current position.

    // NB: This could be much more efficient, but right now it's optimized to handle arbitrary
    // seeking in a predictable way.

    var pos = this.song.pos() + this.lagAdjustment;
    var lastPos = this._songPosition;
    var beats = this.analysis.features.BEATS;
    var moods = this.analysis.features.MOODS;
    var segments = this.analysis.features.SEGMENT;

    // Find the last beat that happened between the previous frame and this one.
    var foundBeat = null;
    for (var index = 0; index < beats.length; index++) {
        if (beats[index] > lastPos && beats[index] < pos) {
            foundBeat = index;
        }
    }
    if (foundBeat != null) {
        this.beat(foundBeat);
    }

    // Match a mood for the current position
    for (var index = 0; index < moods.length; index++) {
        if (moods[index].START <= pos && moods[index].END > pos) {
            this.mood = moods[index].TYPE;
        }
    }

    // Match a segment to the current position
    for (var index = 0; index < segments.length; index++) {
        if (segments[index].START <= pos && segments[index].END > pos) {
            this.segment = segments[index];
        }
    }

    this._songPosition = pos;
}

Lights.prototype.renderParticles = function() {
    // Big monolithic chunk of performance-critical code to render particles to the LED
    // model, assemble a framebuffer, and send it out over WebSockets.

    var layout = this.layout;
    var socket = this.ws;
    var particles = this.particles;
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

        // Background shader
        var bg = this.rings.shader(p);

        // Fast accumulator for particle brightness
        var r = bg[0];
        var g = bg[1];
        var b = bg[2];

        // Sum the influence of each particle
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

Lights.prototype.beat = function(index) {
    // Each beat launches a new particle for each mood
    // Particle rendering parameters are calculated each frame in updateParticle()

    var totalEnergy = 0;

    for (var tag in this.mood) {
        var moodInfo = this.moodTable[tag];
        if (moodInfo) {
            var valence = moodInfo.valence * this.mood[tag] * 0.01;
            var energy = moodInfo.energy * this.mood[tag] * 0.01;
            totalEnergy += energy;

            // console.log("Beat", index, this.segment, valence, energy);

            this.particles.push({
                timestamp: this.frameTimestamp,
                segment: this.segment,
                falloff: 20 - energy * 16,
                color: hsv( -valence * 0.5 + 0.1, 0.8, 0.4 + energy * energy),
                angle: index * (Math.PI + 0.2) + valence * 20.0,
                wobble: valence * valence * energy * energy
            });

        } else {
            console.log("Unknown mood", tag);
        }
    }

    var sceneEnergy = 0.1 + totalEnergy * totalEnergy;

    // Change background angle at each beat
    this.rings.angle += (Math.random() - 0.5) * 2.0 * sceneEnergy;
    this.rings.speed = 0.01 * sceneEnergy;
    this.rings.wspeed = 0.02 * sceneEnergy;
}

Lights.prototype.updateParticle = function(particle) {
    // Update and optionally delete a particle. Called once per frame per particle.
    // Returns true to keep the particle, false to delete it.

    var age = (this.frameTimestamp - particle.timestamp) / this.particleLifespan;
    if (age > 1.0) {
        return false;
    }

    // Primary particle motion
    var angle = particle.angle;
    var radius = age * 2.0;

    // Damped wobble
    var tangent = radius * particle.wobble * 30.0 * Math.cos(age * Math.PI * 16);
    particle.wobble *= 0.85;

    particle.intensity = 1.0 - age;
    particle.point = [
        radius * Math.cos(angle) + tangent * Math.cos(angle + Math.PI/2),
        0,
        radius * Math.sin(angle) + tangent * Math.sin(angle + Math.PI/2)
    ];

    return true;
}
