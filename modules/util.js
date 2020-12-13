const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Logger = Me.imports.modules.logger.Logger.getLogger("Drop Zones");

const Meta = imports.gi.Meta;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;

class Util {

  static MOD_RELEASE_GRACE_PERIOD=250;

  static _mod_pressed = false;
  static _mod_release_buffer_started = false;

  static get_default_pointer() {
        let display = Gdk.Display.get_default();
        let seat = display.get_default_seat();
        return seat.get_pointer();
  }

  /**
   * This function returns true/false if ctrl is being held down.
   * It provides a bit of a buffer time from when ctrl is released becasue
   * humans tend to release the mouse button and the ctrl button at the same time
   * and that leads to a race condition where sometimes the window drops in the
   * zone and sometimes it doesnt.
   */
  static is_mod_pressed_buffered() {
    this.is_mod_pressed_live();
    
    return this._mod_pressed;
  }

  /**
   * This function returns true / false if the ctrl is being held down.
   * This always returns the live state of the button.
   */
  static is_mod_pressed_live()
  {
    Logger.debug("Testing mod key press!");
    let currently_pressed = this._is_mod_pressed_actual();

    if ( currently_pressed ) {
      this._mod_pressed = true;

    } else if ( !currently_pressed && this._mod_pressed && !this._mod_release_buffer_started ) {
      Logger.debug("Mod key lifted, beginning buffer timer.");
      this._mod_release_buffer_started = true;

      GLib.timeout_add(GLib.PRIORITY_DEFAULT, this.MOD_RELEASE_GRACE_PERIOD, function() {
        Logger.debug("Mod key buffer timer expired. Testing.");
        
        if ( !this._is_mod_pressed_actual()) {
          Logger.debug("Mod key is NOT pressed, clearing.");
          this._mod_pressed = false;
        }

        this._mod_release_buffer_started = false;
        return false;
      }.bind(this));
    }

    Logger.debug(`mod key state: ${this._mod_pressed}`);

    return currently_pressed;
  }

  static _is_mod_pressed_actual()
  {
    let mod_state = Gdk.Keymap.get_for_display(Gdk.Display.get_default()).get_modifier_state();
    return !!(mod_state & Gdk.ModifierType.CONTROL_MASK);
  }

  static get_workspace_manager() {
    return global.display.get_workspace_manager();
  }

  static get_workspace_count() {
    return global.display.get_workspace_manager().get_n_workspaces();
  }

  static get_workspace_area(n) {
    return global.display.get_workspace_manager().get_workspace_by_index(n).get_work_area_all_monitors();
  }
}