/**
 * beatpad.js
 *
 * (LPR) LaunchPad Programmer's Reference
 * http://d19ulaff0trnck.cloudfront.net/sites/default/files/novation/downloads/4080/launchpad-programmers-reference.pdf
 */

(function () {

  // LaunchPad S Configuration (8x8 Grid)
  var numRows = 8, numColumns = 8;
  var ledFrameRate = 60;
  var ledAnimationStep = 0.08;
  var ledStreakRate = 0.3;
  var ledCursorScale = 0.25;

  // Trigger animation states for each button, indexed by buttonID.
  var buttonAnimationStates = {};

<<<<<<< HEAD
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

  var songFilename = "The%20Glitch%20Mob%20-%20We%20Can%20Make%20the%20World%20Stop";
  // var songFilename = "lookOfLove";
=======
  // var songFilename = "The%20Glitch%20Mob%20-%20We%20Can%20Make%20the%20World%20Stop";
  var songFilename = "lookOfLove";
>>>>>>> 3bebb1a62b972af0b8af87908a0e8ddd41185700
  // var songFilename = "06%20J-Louis%20-%20LA%20Watts";
  // var songFilename = "07%20IAMNOBODI%20-%20Soulection%20Anthem";

  var songURL = "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/" + songFilename + ".mp3";
  var analysisURL = "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/" + songFilename + ".json";

  // Asynchronously loaded things
  var song, analysis, lights;

  // Song playback state; we have to keep track of this ourselves
  var isPlaying = false;
  var isPaused = false;

  // Globally scoped data shared with MIDI callbacks
  var m = null;
  var outputs = null;


  function convertButtonIDToSongPosition (buttonID) {
    var lastButton = numRows * numColumns - 1;
    var lastBeat = analysis.features.BEATS.length - 1;
    var beatIndex = 0 | (buttonID * lastBeat / lastButton);
    return analysis.features.BEATS[beatIndex];
  }

  function convertSongPositionToButtonID (pos) {
    // Find the most recent beat before this position, return a fractional buttonID.

    var beats = analysis.features.BEATS;
    var lastButton = numRows * numColumns - 1;
    var lastBeat = beats.length - 1;
    var index = 0;

    while (index < lastBeat && beats[index + 1] <= pos) {
      index++;
    }

    return index * lastButton / lastBeat;
  }

  function seekToBeat (buttonID) {
    // Set the song position according to a button ID. Scale button ID to beat index.
    // buttonID is a number between 0 and (numRows * numColumns - 1), including the main
    // button grid but not the control buttons.

    if (!isPlaying) {
      song.play();
      isPlaying = true;
      isPaused = false;
    }

    song.pos(convertButtonIDToSongPosition(buttonID));

    // Set this button's animation back to the beginning
    buttonAnimationStates[buttonID] = 0;

    // Animated streak going outward up/down from this button
    for (var step = 0; step < numRows; step++) {
      buttonAnimationStates[buttonID - numColumns * step] = -step * ledStreakRate;
      buttonAnimationStates[buttonID + numColumns * step] = -step * ledStreakRate;
    }

  }

  /**
   * @function - myMidiMessageHandler
   * Handles a recieved MIDI message.
   * @param event {MidiMessageEvent}
   * @api public
   */
  function myMIDIMessagehandler (event) {
    var command = event.data[0];
    var note = event.data[1];

    // if velocity != 0, this is a button press
    // if velocity == 0, button release (ignored)
    var press = event.data[2] != 0;

    // Top row
    if (command == 0xb0) {

      if (note == 104 && press) {
        // First on the top row. Play/stop
        isPaused = false;
        if (isPlaying) {
          song.stop();
          isPlaying = false;
        } else {
          song.play();
          isPlaying = true;
        }
      }

      if (note == 105 && press) {
        // First on the top row. Play.
        if (isPaused) {
          song.play();
          isPlaying = true;
          isPaused = false;
        } else {
          song.pause();
          isPlaying = false;
          isPaused = true;
        }
      }
    }

    // Button grid
    if (command == 0x90) {

      // Row/column are packed into high/low nybbles of the MIDI note
      var row = note >> 4;
      var column = note & 0x0F;

      // Is this part of the usual grid?
      if (row < numRows && column < numColumns) {
        var buttonID = column + row * numColumns;

        // On press, seek
        if (press) {
          seekToBeat(buttonID);
        }
      }
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

  function animateControllerLEDs () {
    // Update all LEDs every frame. Simple and inefficient.

    if (analysis) {

      var currentButton = convertSongPositionToButtonID(song.pos());

      for (var row = 0; row < numRows; row++) {
        for (var column = 0; column < numColumns; column++) {
          var buttonID = column + numColumns * row;

          // Update animation, step this button forward without limit
          var animationState = buttonAnimationStates[buttonID] || 0;
          animationState += ledAnimationStep;
          buttonAnimationStates[buttonID] = animationState;

          // Seek position relative to this button, in radians
          var positionRadians = Math.min(1, Math.max(-1, ledCursorScale * (buttonID - currentButton))) * Math.PI;

          // Animation state in radians, clamped
          var animationRadians = Math.min(1, Math.max(-1, animationState)) * Math.PI;

          // Cosine curve
          var red = Math.max(0, Math.min(3, 4 * Math.cos(positionRadians) + 0.5));
          var green = Math.max(0, Math.min(3, 4 * Math.cos(animationRadians) + 0.5));

          outputs.send([0x90, (row << 4) | column, red | (green << 4)]);
        }
      }
    }

    setTimeout(animateControllerLEDs, 1000 / ledFrameRate);
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

    // Start a cycle of LED updates.
    animateControllerLEDs();

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
      for (var j = 0, jl = numColumns; j < jl; j++) {

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
          seekToBeat(beat);
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
  }

  // Add event listener after all the content has loaded.
  window.addEventListener('load', function() {

    // Start asynchronously loading the song, update status when it's done
    song = new Howl({
      urls: [songURL],
      autoplay: false,
      loop: false,
      onload: function() {
        $('#musicStatus').text("Music loaded!");
        isPlaying = false;
      },
      onplay: function() {
        isPlaying = true;
      },
      onend: function() {
        isPlaying = false;
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
