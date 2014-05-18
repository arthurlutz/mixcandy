/**
 * beatpad.js
 *
 * (LPR) LaunchPad Programmer's Reference
 * http://d19ulaff0trnck.cloudfront.net/sites/default/files/novation/downloads/4080/launchpad-programmers-reference.pdf
 */

// LaunchPad S Configuration (8x8 Grid)
var numRows = 8,
    numCols = 8,
    offset = 200; // Compensates for 200ms lag (LPR:2)

// Instantiate a new Howl instance with a particular `.mp3`.
var songLocation = '../songs/geo.mp3';
var song = new Howl({ urls: [songLocation] });

// Add event listener after all the content has loaded.
window.addEventListener('load', function() {

  // Globally scoped variable will get the launchpad
	var launchPad = document.getElementById("launchpad");

  // Create the Grid.

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
        console.log(BEATS[offset + beat]);

        // song#pos: get/set the position of playback.
        song.pos(BEATS[offset + beat]);
      };
		}

    // Attach entire row to launchPad.
		launchPad.appendChild(rowElem);
	}

  // when invoked, `.requestMIDIAccess` returns a
  // Promise object representing a request for access
  // to MIDI devices on the user's system.
	window.navigator
    .requestMIDIAccess()
    .then(onMIDISuccess, onMIDIFailure);
});

/**
 * @function - onMIDIFailure
 * Callback for failed MIDI access.
 * @param event
 * @api public
 * @return console.log('err message') {String}
 */
function onMIDIFailure (err) {
  console.log("uh-oh! Something went wrong!  Error code: " + err.code );
}

/**
 * @function - onMIDISuccess
 * Callback for successful MIDI access.
 * @param event
 * @api public
 */

// Globally scope `m` (MidiAccess instance) and `outputs`.
var m = null;
var outputs = null;

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
   *    => @sp2 event.data[1] {Number}
   *    => @sp3 velocity {Number (hex)} // (LPR:3)
   * @param optionalDelay {Number}
   */

  // LaunchPad S will either light up at start or every time browser refreshes.
  outputs.send([0x80, 0x25, 0x7f], window.performance.now() + 1000);
  outputs.send([0x90, 0x25, 0x7f]);
}

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

    // Set the song position accordingly.
		song.pos(BEATS[offset + currentButton]);

    // Creates a press-and-release effect.
    outputs.send([0x90, currentButton, 0x30]);
    outputs.send([0x90, currentButton, 0x00], window.performance.now() + 100);

	}
}
