/**
 * beatpad.js
 *
 * (LPR) LaunchPad Programmer's Reference
 * http://d19ulaff0trnck.cloudfront.net/sites/default/files/novation/downloads/4080/launchpad-programmers-reference.pdf
 */

(function () {

  // LaunchPad S Configuration (8x8 Grid)
  var numRows = 8,
      numCols = 8,
      offset = 200; // Compensates for 200ms lag (LPR:2)

  // Message Table
  var message = {
    off: 0x80,
    on: 0x90,
    rapid: 0x92
  };

  // Color Table
  var color = {
    none: 0x00,
    lGreen: 0x10,
    mGreen: 0x20,
    hGreen: 0x30,
    hYellow: 0x3f,
    mYellow: 0x2f,
    lYellow: 0x1f,
    red: 0x0f
  };

  // Instantiate a new Howl instance with a particular `.mp3`.
  var songURL = "https://dl.dropboxusercontent.com/s/dwg72gzye916r7m/The%20Glitch%20Mob%20-%20We%20Can%20Make%20the%20World%20Stop.mp3?dl=1&token_hash=AAGF9W1cmy1WpBYXw_nmdnlVd9BVq-O5RfEdXlOIgpAntw&expiry=1400382086";
  var analysisURL = "data/The Glitch Mob - We Can Make the World Stop.json";

  // Asynchronously loaded things
  var song, analysis, lights;

  // Globally scoped data shared with MIDI callbacks
  var m = null;
  var outputs = null;

  /**
   * @function - myMidiMessageHandler
   * Handles a recieved MIDI message.
   * @param event {MidiMessageEvent}
   * @api public
   */
  function myMIDIMessagehandler (event) {

    // if velocity != 0, this is a note-on message
    // if velocity == 0, fall thru: it's a note-off.
    var currentVelocity = event.data[2];

    if (currentVelocity == 0) {

      var currentButton = event.data[1];
      console.log(currentButton);

      // Set the song position accordingly.
      song.pos(BEATS[offset + currentButton]);

      // TODO: Refactor this into some configurable function.
      // This alone will leave the button on.
      outputs.send([0x90, currentButton, 0x3f]);
      outputs.send([0x90, currentButton + 15, 0x3f]);
      outputs.send([0x90, currentButton - 15, 0x3f]);
      outputs.send([0x90, currentButton + 16, 0x3f]);
      outputs.send([0x90, currentButton - 16, 0x3f]);
      outputs.send([0x90, currentButton + 17, 0x3f]);
      outputs.send([0x90, currentButton - 17, 0x3f]);
      outputs.send([0x90, currentButton + 1, 0x3f]);
      outputs.send([0x90, currentButton - 1, 0x3f]);

      // But adding this creates a press-and-release effect.
      outputs.send([0x90, currentButton, 0x00], window.performance.now() + 100);
      outputs.send([0x90, currentButton + 15, 0x00], window.performance.now() + 100);
      outputs.send([0x90, currentButton - 15, 0x00], window.performance.now() + 100);
      outputs.send([0x90, currentButton + 16, 0x00], window.performance.now() + 100);
      outputs.send([0x90, currentButton - 16, 0x00], window.performance.now() + 100);
      outputs.send([0x90, currentButton + 17, 0x00], window.performance.now() + 100);
      outputs.send([0x90, currentButton - 17, 0x00], window.performance.now() + 100);
      outputs.send([0x90, currentButton + 1, 0x00], window.performance.now() + 100);
      outputs.send([0x90, currentButton - 1, 0x00], window.performance.now() + 100);

    }
  }

  /**
   * @function - onMIDIFailure
   * Callback for failed MIDI access.
   * @param event
   * @api public
   * @return console.log('err message') {String}
   */
  function onMIDIFailure (err) {
    $('#midiStatus').text("MIDI failed! Error code: " + err.code);
  }

  /**
   * @function - onMIDISuccess
   * Callback for successful MIDI access.
   * @param event
   * @api public
   */
  function onMIDISuccess (access) {

    m = access;

    // Setup inputs.
    var inputs = m.inputs();

    // Assign event handler for recieved MIDI messages.
    inputs[0].onmidimessage = myMIDIMessagehandler;

    // Grabs first output device.
    outputs = m.outputs()[0];

    /**
     * @method outputs#send - LaunchPad Message API
     *
     * @param midiMessage [sp1, sp2, sp3]
     *    => @sp1 messageType {Number (hex)}
     *    => @sp2 event.data[1] {Number} // Origin: myMIDIMessagehandler
     *    => @sp3 velocity {Number (hex)} // (LPR:3)
     * @param optionalDelay {Number}
     */

    // LaunchPad S will light amber at start or every time browser refreshes.
    outputs.send([message.off, 0x25, color.hYellow], window.performance.now() + 1000);
    outputs.send([message.on, 0x25, color.hYellow]);

    $('#midiStatus').text("MIDI connected");
  }

  function createLaunchpad(launchPad) {
    // Create the Grid UI.

    for (var i = 0, il = numRows; i < il; i++) {

      // Create the `row` div.
      var rowElem = document.createElement("div");
      rowElem.className = "row";
      rowElem.row = i;

      // Run another for-loop for the row's squares.
      for (var j = 0, jl = numCols; j < jl; j++) {

        // Create the `cell` element with unique `id` and class cell.
        var cellElem = document.createElement("div");
        cellElem.row = i;
        cellElem.col = j;

        // Current row plus current column ensures uniqueness.
        cellElem.id = (i * numRows) + j;
        cellElem.className = "cell";
        rowElem.appendChild(cellElem);

        // Add event listener to each cell element.
        cellElem.onclick = function () {

          // Retrieve the integer from the cellElement's `id`
          beat = parseInt(this.id);

          // How does this log differ from what's present in `myMIDIMessagehandler`?
          console.log(analysis.features.BEATS[offset + beat]);

          // song#pos: get/set the position of playback.
          song.pos(analysis.features.BEATS[offset + beat]);
        };
      }

      // Attach entire row to launchPad.
      launchPad.appendChild(rowElem);
    }

    // UI Callbacks

    document.getElementById('play').onclick = function () {
      song.play();
    }
    document.getElementById('pause').onclick = function () {
      song.pause();
    }
    document.getElementById('jump10000').onclick = function () {
      song.pos(position = 10);
    }
    document.getElementById('jump100000').onclick = function () {
      song.pos(position = 100);
    }
  }

  // Add event listener after all the content has loaded.
  window.addEventListener('load', function() {

    // Start asynchronously loading the song, update status when it's done
    song = new Howl({
      urls: [songURL],
      autoplay: true,
      loop: false,
      onload: function() {
          $('#musicStatus').text("Music loaded!");
      }   
    });
    $('#musicStatus').text("Loading music...");

    // Load analysis data asynchronously, and start Lights immediately after
    $.getJSON(analysisURL, function (data) {
      analysis = data;

      lights = new Lights({
        song: song,
        analysis: analysis,
        lagAdjustment: -0.025,
        layoutURL: "data/grid32x16z.json",
        onconnecting: function() {
            $('#ledStatus').text("Connecting to Fadecandy LED server...");
        },
        onconnected: function() {
            $('#ledStatus').text("Connected to Fadecandy LED server");
        },
        onerror: function() {
            $('#ledStatus').text("Error connecting to LED server");
        }
      });
    });

    // when invoked, `.requestMIDIAccess` returns a
    // Promise object representing a request for access
    // to MIDI devices on the user's system.
    window.navigator
      .requestMIDIAccess()
      .then(onMIDISuccess, onMIDIFailure);
    $('#midiStatus').text("Requesting MIDI access...");

    // Create the launchpad (grid) UI
    createLaunchpad(document.getElementById("launchpad"));
	});

})();
