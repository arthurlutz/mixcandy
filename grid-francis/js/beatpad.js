// beatpad.js

var launchPad = null;

// A Launchpad S has a 64-button grid.
var numRows = 8,
    numCols = 8;

// Launchpad Programmer's Reference
// "Because there are 80 LED addresses (one for each bi-colour LED),
// it will take 200 milliseconds to update a Launchpad completely."
var offset = 200;

// Instantiate a new Howl instance with the given `.mp3` file.
var song = new Howl({
	urls: ['../songs/geo.mp3']
})

// Add event listener after all the content has loaded.
window.addEventListener('load', function() {

  // Globally scoped variable will get the launchpad
	launchPad = document.getElementById("launchpad");

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
 * @function - onMIDISuccess
 * Callback for successful MIDI access.
 * @param event
 * @api
 * @return
 */

var outputs = null;

function onMIDISuccess (access) {
  m = access;

  var inputs = m.inputs();

  inputs[0].onmidimessage = myMIDIMessagehandler;

  // grab first output device
  outputs = m.outputs()[0];

  /**********************************************
    Velocity controls the color.
   **********************************************/

  // Launchpad Midi Message API
  // o.send( [{ on, off, change}, {key, controller}, {velocity, data }] )

  // Note Off (0x80)
  // full velocity A4 note off in one second.
  outputs.send( [ 0x80, 0x25, 0x7f ], window.performance.now() + 1000 );

  // Note On (0x90)
  // Rapid (0x92)
  // full velocity note on A4 on channel zero
  outputs.send( [ 0x90, 0x25, 0x7f ] );
};

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
 * @function - myMidiMessageHandler
 * @param event
 * @api public
 * @return
 */

// Handles MIDI input.
function myMIDIMessagehandler (event) {
	if (event.data[2] == 0) {
		beat = event.data[1];

    // Log out the button pressed on Launchpad.
		console.log(beat);
		song.pos(BEATS[offset + beat]);

    // Send a light signal too!
    outputs.send( [ 0x90, beat, 0x30 ] );

    // Press and release.
    outputs.send( [ 0x90, beat, 0x00 ], window.performance.now() + 100);

	}
}
