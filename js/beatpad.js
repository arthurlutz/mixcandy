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

  // Ugly hardcoded list of temporary URLs for songs we're demoing with!
  var playlist = [
    {
        songURL: "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/The%20Glitch%20Mob%20-%20We%20Can%20Make%20the%20World%20Stop.mp3",
        analysisURL: "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/The%20Glitch%20Mob%20-%20We%20Can%20Make%20the%20World%20Stop.json"
    },
    {
        songURL: "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/06%20J-Louis%20-%20LA%20Watts.mp3",
        analysisURL: "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/06%20J-Louis%20-%20LA%20Watts.json"
    },
    {
        songURL: "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/lookOfLove.mp3",
        analysisURL: "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/lookOfLove.json"
    },
    {
        songURL: "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/07%20IAMNOBODI%20-%20Soulection%20Anthem.mp3",
        analysisURL: "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/07%20IAMNOBODI%20-%20Soulection%20Anthem.json"
    },
    {
        songURL: "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/Sing.mp3",
        analysisURL: "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/Sing.json"
    },
    {
        songURL: "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/Summer.mp3",
        analysisURL: "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/Summer.json"
    },
    // {
    //     songURL: "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/SuperLove.mp3",
    //     analysisURL: "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/SuperLove.json"
    // },
    {
        songURL: "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/03%20The%20Sky%20Was%20Pink%20%28Holden%20Remix%29.mp3",
        analysisURL: "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/03%20The%20Sky%20Was%20Pink%20%28Holden%20Remix%29.json"
    },
    {
        songURL: "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/Moderat%20-%20This%20Time.mp3",
        analysisURL: "https://dl.dropboxusercontent.com/u/1926728/tmp/music_hack_day/Moderat%20-%20This%20Time.json"
    },
  ];

  // Playlist state
  var currentSongIndex = 0;

  // Asynchronously loaded things
  var song, analysis, lights;

  // Song playback state; we have to keep track of this ourselves
  var isPlaying = false;
  var isPaused = false;

  // Globally scoped data shared with MIDI callbacks
  var m = null;
  var output = null;


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

    // Need to switch tracks?
    if (song != playlist[currentSongIndex].song) {
      switchToSong(currentSongIndex);
    }

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

      // Is this one of the lights on the right? We use those to select tracks.
      // Set this to the 'current' track, and switch on the next seek if we need to.
      // This lets a song keep playing while we cut between tracks.
      if (press && column == numColumns && playlist[row] && playlist[row].loaded) {
        currentSongIndex = row;
      }

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

  function updateGridLED(row, column, red, green) {
    output.send([0x90, (row << 4) | column, red | (green << 4)]);
  }

  function animateControllerLEDs () {
    // Update all LEDs every frame. Simple and inefficient.

    // Update main grid
    if (analysis) {

      var currentButton = convertSongPositionToButtonID(song.pos());

      var isViewingDifferentTrack = (song != playlist[currentSongIndex].song);

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

          if (isViewingDifferentTrack) {
            // Ready to switch tracks; indicate this isn't the current song
            updateGridLED(row, column, 0, 1);

          } else if (isPlaying) {
            // Normal playback

            // Cosine curve
            var red = Math.max(0, Math.min(3, 4 * Math.cos(positionRadians) + 0.5));
            var green = Math.max(0, Math.min(3, 4 * Math.cos(animationRadians) + 0.5));

            updateGridLED(row, column, red, green);

          } else {
            // Stopped
            updateGridLED(row, column, 1, 0);
          }

        }
      }
    }

    // Update song loading indicators
    for (var row = 0; row < numRows; row++) {
      var green = 0;

      if (playlist[row] && playlist[row].loaded) {
        // Loaded songs are dim green
        green = 1;

        // Current song is bright
        if (row == currentSongIndex) {
          green = 3;
        }
      }

      updateGridLED(row, numColumns, 0, green);
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
    var outputs = m.outputs();

    if (inputs.length == 0 || outputs.length == 0) {    
      $('#midiStatus').text("No MIDI device found");
      return;
    }

    // Assign event handler for recieved MIDI messages.
    inputs[0].onmidimessage = myMIDIMessagehandler;

    // Grabs first output device.
    output = outputs[0];

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

  function beginLoadingSong(index) {
    // Start asynchronously loading the playlist item at 'index'.
    // We should only be doing one of these at a time.

    var item = playlist[index];

    $.getJSON(item.analysisURL, function (data) {
      item.analysis = data;
    });

    item.song = new Howl({
      urls: [item.songURL],
      autoplay: false,
      loop: false,

      onplay: function() {
        if (index == currentSongIndex) {
          isPlaying = true;
        }
      },
      onend: function() {
        if (index == currentSongIndex) {
          isPlaying = false;
        }
      },

      onload: function() {
        item.loaded = true;

        var lastSongIndex = playlist.length - 1;
        if (index >= lastSongIndex) {
          $('#musicStatus').text("All tracks loaded");
        } else {
          beginLoadingSong(index + 1);
        }

        // If we loaded the first song, start running it
        if (index == 0) {
          switchToSong(index);
        }
      }
    });

    $('#musicStatus').text("Loading track " + (index + 1) + " of " + playlist.length + " ...");
  }

  function switchToSong(index) {
    // Stop the current song and place the cursor at the beginning of song number 'index' 

    if (song) {
      song.stop();
      isPlaying = false;
    }

    song = playlist[index].song;
    analysis = playlist[index].analysis;

    if (song) {
      lights.setAnalysis(playlist[index].analysis);
      lights.setSong(song);
      song.pos(0);
    }
  }

  // Keyboard grid, 8x5 subset
  var keygrid = "12345678QWERTYUIASDFGHJKLZXCVBNM,.";
  var keyhandlers = {};
  for (var i = 0; i < keygrid.length; i++) {
    (function (i) {
      keyhandlers[keygrid.charCodeAt(i)] = function (evt) { seekToBeat(i); }
    })(i);
  }

  // Prev/next song, []
  keyhandlers[219] = function (evt) {
    currentSongIndex = Math.max(currentSongIndex - 1, 0);
  }
  keyhandlers[221] = function (evt) {
    currentSongIndex = Math.min(currentSongIndex + 1, playlist.length - 1);
  }

  // Add event listener after all the content has loaded.
  window.addEventListener('load', function() {

    // Load all songs in order
    beginLoadingSong(0);

    lights = new Lights({
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

    // Keyboard UI
    $('body').keydown( function(evt) {
      var fn = keyhandlers[evt.keyCode];
      if (fn) {
        fn(evt);
      }
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
