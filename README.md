Mixcandy
========

Project for Music Hack Day 2014, San Francisco.
[@cweichen](https://twitter.com/cweichen), [@francismakes](https://twitter.com/francismakes), [@scanlime](https://twitter.com/scanlime)

We built a live performance tool that combines music analysis, MIDI controller input, and real-time LED light visuals.

Songs are analyzed for beat, mood, and segmentation using Gracenote's timeline API. The beat data is used to automatically slice a song into samples which map to an 8x8 grid of buttons. We use the beat data in combination with mood and segmentation data to create unique real-time visuals.

The Mixcandy plays like a sampler, a drum machine, and a unique synesthetic light instrument all in one.

The project runs entirely in the browser, using the Web MIDI API, Howler.js, and Fadecandy. Audio output is handled by rapidly seeking pre-cached tracks, and LED visualization frames are computed in JavaScript and sent to the Fadecandy daemon over WebSockets. Low latency and high frame rate make Mixcandy deliciously smooth, and so much fun that we have a hard time walking away from it.

* [Demo Video](https://vimeo.com/95657005)
