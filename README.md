## What is?

Interactive Toy Concepts makes this thing called a
[Wi-Fli](http://www.interactivetoy.com/IATC1011/home/index.html). JIFASNIF,
therefore here's an increasingly less simpleminded Node.js controller for
relatively cheap toy helicopters.

## Get!

```
npm install wifli
```

## Make go!

Follow the instructions that came with the helicopter, except for the part
about installing the iOS app, because who needs their hands held, right?  We're
here to get our hands chopped off (or mildly bruised by hard plastic rotors),
not held! Make sure your computer is on the correct helicopter's 802.11 SSID
before using `wifli`.

Every helicopter is slightly different, and will require a little bit of
calibration to work with `wifli`. `examples/engine-test.js` can be used to
suss out the rotor speed at which the helicopter will hover, which can then
be passed in an options object to the controller constructor:

```javascript
var kopter = new WiFli({hoverSpeed : 32});
```

The tricky thing about the hover power is that it's a function of the battery's
charge -- the more depleted the battery, the lower the power it's pushing into
the engine, and the higher the necessary rotor speed value to keep the copter
in the air. The copter sends back its current charge periodically, so I'll take
a stab at normalizing the hover value with respect to the current charge, but
it's going to be heuristic and flaky of necessity.

Also each charge will give you about five minutes of flight time, so no
crosstown coffee deliveries for this bad boy. Probably no cross-office coffee
deliveries, for that matter (see below re: "grievous bodily hilarity").

Every helicopter will also have its own trim value, which is necessary to
calibrate to keep the helicopter from precessing (flying in circles).
Engine-test can also be used to figure out that value. Once determined, it can
also be passed to the constructor:

```javascript
var kopter = new WiFli({hoverSpeed : 32, trim : -5});
```

The trim should be more stable over time, unless and until your Wi-Fli receives
some concussive maintenance events.

## Uh-oh.

The Wi-Fli is not a precision instrument, and is made of whirling blades.  It
contains no accelerometer, altimeter, or proximity sensors. Scripting its
takeoff and landing cycles is not a precise art, and grievous bodily hilarity
can result if care is not taken. Try to test out your scripted actions in a
large, tall, carpeted (and wind-free) space, and don't get too attached to your
Wi-Fli, because bad things are probably going to happen to it.

Interactive Toy Concepts has released a newer version of the Wi-Fli,
called the Wi-Spy, which has an onboard camera. This could probably be
used as a guidance system, but somebody will have to reverse engineer the
necesary commands to get it to cough up an image, and it's highly unlikely
it's going to be streaming a realtime feed from the onboard camera.

## How do?

Here's an example using the high-level command interface (which so far
only about launching, landing, and hovering the Wi-Fli):

```javascript
var WiFli = require('wifli');

var kopter = new WiFli();

kopter.connect(function () {
  kopter.once('launch', function () {
    console.log('WiFli launched');
    kopter.land(2500);
  });

  kopter.once('land', function () {
    console.log('WiFli landed');
    kopter.end();
  });

  kopter.once('end', function () {
    console.log("all done!");
  });

  kopter.launch(2000);
});
```

New commands can be written using the scripting interface / low-level command
queue:

```javascript
function leftTurn(kopter) {
  kopter.runQueue(function (q) {
    q.once('end', function () { kopter.emit('left turn'); });

    q.enqueue({hover : true, yaw : -32}, 300);
  });
}

kopter.on('left turn', function () {
  // do whatever
});

kopter.on('launch', function () { leftTurn(kopter); });
kopter.launch(2000);
```

Finally, there's a chunk of a WritableStream API implemented, so you can emit
control events directly onto the copter once it's connected:

```javascript
var kopter = new WiFli();

function e(k, r, p, y) {
  k.emit({rotorSpeed : r, pitch : p, yaw : y});
}

kopter.on('ready', function () {
  // assumes joystick driver will normalize inputs to values expected by
  // wifli
  setupJoystick(function (j) {
    var speed = 0, pitch = 0, yaw = 0;

    j.on('vertical', function (value) {
      pitch += value;
      e(k, speed, pitch, yaw);
    });

    j.on('horizontal', function (value) {
      yaw += value;
      e(k, speed, pitch, yaw);
    });

    j.on('throttle', function (value) {
      rotorSpeed += value;
      e(kopter, speed, pitch, yaw);
    });
  });
});
```

### high-level commands

All durations are in `setTimeout` units, which is to say milliseconds.

* `launch(duration)`: get the copter in the air. Requires a recent
  calibration of hover speed to work well. Make the duration longer to
  end up with the copter higher after launch completes. Defaults to a second.
* `hover()`: hover. Keep in mind that the helicopter has no way to correct
  for relative acceleration, unlike all those fancy quadcopter videos
  you've seen, so if you go straight from a rapid rise to hover, the copter
  is likely to go up a ways further.
* `land(duration)`: Make a decent effort to (reasonably) softly land. Make
  the duration for this longer if you think the helicopter is going to be
  higher in the air. Defaults to a second.

### low-level commands

When using `runQueue()` or kopter.emit('data'), the following commands are
available. All out-of-range values will be normalized, and multiple options
can be included in a single command, except for reset:

* `hover : true`: keep the helicopter's rotor power set at what the controller
  believes to be the current hover power. Unless you're explicitly setting the
  rotor speed (either as part of a script as part of going up or down) or are
  streaming control events from a hardware controller, you'll want to have this
  set, as the defaults for all values are 0 and your helicopter will shut down
  if rotorSpeed goes to 0.
* `rotorSpeed : integer`: set the rotor's speed / power to the provided value.
  The rotor will spin up at a value of 8 and can go all the way up to 256,
  but I'm pretty sure the power level is scaled by the onboard controller.
  The step value is somewhere around 8, but may not be exactly that. The
  control is not as fine as one might hope.
* `pitch : integer`: set the helicopter's pitch, which is its forward or
  backwards attitude. You are not going to set a Wi-Fly to hurtling,
  death-defying values, which is probably better for you, your furniture,
  and your Wi-Fli. Valid values are -32 (sorta middling backwards) to 31
  (sorta middling forwards).
* `yaw : integer`: yaw (flat spin) the helicopter left or right. Any and
  all precision in the guidance of most toy helicopters is in the yaw,
  and this is no exception. Valid values range from -32 (smartly turn
  counterclockwise) to 31 (smartly turn clockwise).
* `trim : integer`: Override the calibrated trim value, which will cause the
  copter to slew as it flies. Valid values are -32 (hard left) to 31 (hard
  right).
* `reset : true`: Shut down the copter's engines. Probably a good thing to
  have bound to a failsafe command / event somewhere, although experience
  has shown that this can have deleterious effects on the helicopter's
  landing gear.

## other stuff

I've included a few sample scripts in `examples` and some rudimentary tests
in `test`. There's a mock controller class in `lib` that you can use to
watch the output of scripts before you actually run them on a real toy
helicopter. The examples show you how this is done, and I highly recommend
using it to root out whether you're likely to nuke your copter, or to learn
about the details of the (incredibly simple-minded) control protocol used by
Wi-Flis.

I got most of the protocol details for this from [Myrhev's blog](http://myrhev.net/?page_id=256)
and from referring to the Python script he wrote after his own reverse-engineering
efforts. [Jason Snell](http://syne.net) graciously provided the Wi-Fli used for
the development of this module and didn't complain when I got the hover power
totally wrong for our demo at Voxer Hard Hack the 0th and totally cracked
one of the landing gear struts. Someday we may actually get the OpenCV
remote control interface he worked on up and running against the Wi-Fli as well.

## license

This is BSD-licensed, so go nuts. I'd love pull requests if you've got 'em,
and if you do anything fun with this, I'd [love to hear about it](mailto:ogd@aoaioxxysz.net).
None of the trademarks mentioned above are mine, and all names probably belong
to Interactive Toy Concepts, Inc.
