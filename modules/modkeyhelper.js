'use strict';

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Logger = Me.imports.modules.logger.Logger;

const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;

const MOD_RELEASE_GRACE_PERIOD=200;

var ModKeyHelper = class ModKeyHelper {
  /**
   * 
   * @param Logger logger 
   */
  constructor(logger) {
    this._log = logger;
    
    this._mod_pressed = false;
    this._buffer_timer = null;
  }

  /**
   * This function returns true/false if ctrl is being held down.
   * It provides a bit of a buffer time from when ctrl is released becasue
   * humans tend to release the mouse button and the ctrl button at the same time
   * and that leads to a race condition where sometimes the window drops in the
   * zone and sometimes it doesnt.
   */
  is_pressed_buffered() {
    this.is_pressed();
    
    return this._mod_pressed;
  }

  /**
   * This function returns true / false if the ctrl is being held down.
   * This always returns the live state of the button.
   */
  is_pressed()
  {
    this._log.debug("Testing mod key press!");
    let currently_pressed = this._check_mod_state();

    if ( currently_pressed ) {
      this._mod_pressed = true;
      this._stop_buffer_timer();

    } else if ( !currently_pressed && this._mod_pressed && !this._buffer_timer ) {
      this._log.debug("Mod key lifted, beginning buffer timer.");
      this._start_buffer_timer();
    }

    this._log.debug(`mod key state: ${this._mod_pressed}`);

    return currently_pressed;
  }

  _check_mod_state()
  {
    let mod_state = Gdk.Keymap.get_for_display(Gdk.Display.get_default()).get_modifier_state();
    return !!(mod_state & Gdk.ModifierType.CONTROL_MASK);
  }

  _start_buffer_timer()
  {
    if ( this._buffer_timer ) return;

    this._buffer_timer = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      this.MOD_RELEASE_GRACE_PERIOD,
      this._buffer_time_tick.bind(this)
    );
  }

  _stop_buffer_timer()
  {
    if ( !this._buffer_timer ) return;

    GLib.source_remove(this._buffer_timer);
    this._buffer_timer = null;
  }

  _buffer_time_tick()
  {
        if ( !this._buffer_timer ) return false;

        this._log.debug("Mod key buffer timer expired. Testing.");

        if ( !this.is_pressed()) {
          this._log.debug("Mod key is NOT pressed, clearing.");
          this._mod_pressed = false;
        }

        return false;
  }
}