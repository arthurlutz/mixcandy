/*
 * Three dimensional JavaScript LED pattern based on the
 * Fadecandy "Rings" Processing example.
 *
 * Uses noise functions modulated by sinusoidal rings, which themselves
 * wander and shift according to some noise functions.
 *
 * Hacked up some for the hackathon...
 *
 * 2014 Micah Elizabeth Scott
 */

var Rings = function (o) {
    var self = this;
    o = o || {};

    self.hue = 0;
    self.saturation = 0.2;
    self.brightness = -0.7;
    self.contrast = 0.8;
    self.angle = 0;
    self.speed = 0.002;

    self.noiseScale = 0.02;
    self.wspeed = 0.01;
    self.scale = 0.3;
    self.ringScale = 3.0;
    self.wanderSpeed = 0.00005;
    self.dx = 0;
    self.dz = 0;
    self.dw = 0;

    // Initialize noise lookup table
    var simplex = new SimplexNoise();

    var min = Math.min;
    var max = Math.max;
    var sin = Math.sin;
    var cos = Math.cos;
    var pow = Math.pow;
    var sqrt = Math.sqrt;

    function fractalNoise(x, y, z, w) {
        // 4D fractal noise (fractional brownian motion)

        var r = 0;
        var amp = 0.5;
        for (var octave = 0; octave < 4; octave++) {
            r += (simplex.noise4D(x, y, z, w) + 1) * amp;
            amp /= 2;
            x *= 2;
            y *= 2;
            z *= 2;
            w *= 2;
        }
        return r;
    }

    function noise(x, spin) {
        // 1-dimensional noise. Cut a zig-zag path through
        // the simplex 2D noise space, so we repeat much less often.
        spin = spin || 0.01;
        return simplex.noise2D(x, x * spin) * 0.5 + 0.5;
    }

    self.beginFrame = function (now) {
        // Per-frame updates

        self.spacing = noise(now * 0.000124) * self.ringScale;

        // Rotate movement in the XZ plane
        self.dx += cos(self.angle) * self.speed;
        self.dz += sin(self.angle) * self.speed;

        // Random wander along the W axis
        self.dw += (noise(now * 0.00002) - 0.5) * self.wspeed;

        self.centerx = (noise(now * self.wanderSpeed, 0.9) - 0.5) * 1.25;
        self.centery = (noise(now * self.wanderSpeed, 1.4) - 0.5) * 1.25;
        self.centerz = (noise(now * self.wanderSpeed, 1.7) - 0.5) * 1.25;
    }

    self.shader = function (p) {
        // Pixel shader, maps LED layout data to RGB

        var x = p.point[0];
        var y = p.point[1];
        var z = p.point[2];

        var distx = x - self.centerx;
        var disty = y - self.centery;
        var distz = z - self.centerz;

        var dist = sqrt(distx*distx + disty*disty + distz*distz);
        var pulse = (sin(self.dz + dist * self.spacing) - 0.3) * 0.3;
      
        var n = fractalNoise(
            x * self.scale + self.dx + pulse,
            y * self.scale,
            z * self.scale + self.dz,
            self.dw
        );

        var m = fractalNoise(
            x * self.scale + self.dx,
            y * self.scale,
            z * self.scale + self.dz,
            self.dw + 10.0
        ) - 0.75;

        return hsv(
            self.hue + 0.2 * m,
            self.saturation,
            max(0, self.contrast * n + self.brightness)
        );
    }
}
