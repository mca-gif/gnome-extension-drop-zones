const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Logger = Me.imports.modules.logger.Logger.getLogger("GZones");

class Window {

  static zoneable_window_types = [
    Meta.WindowType.NORMAL
  ];

  static blacklist_classes = [
    'Conky'
  ];

  static get_id(win) {
    return win.get_stable_sequence();
  }

  constructor(meta_window) {
    this.win = meta_window;
    this._log = Logger.getLogger("Window");
    this._signals = [];

    this._connect_signals();
  }

  window_class() {
    this.win.get_wm_class();
  }
  
  can_be_zoned() {
    if (
      !this.win.allows_resize()
      || !this.win.allows_move()
      || this.win.is_fullscreen()
      || this.win.is_shaded()
      || this.is_attached_dialog()
    ) {
      return false;
    }

    if ( Window.blacklist_classes.indexOf(this.window_class())  === -1 ) {
      return false;
    }

    if ( Window.zoneable_window_types.indexOf(this.window_type()) === -1 ) {
      return false;
    }

    return true;
  }

  _connect_signals() {
    this._log.debug("Connecting signals to " + this.win);
    this._signals.push( this.win.connect('unmanaged', this._disconnect_signals.bind(this)));
  }

  _disconnect_signals() {
    this._log.debug("Disconnecting signals on " + this.win);
    this._signals = this._signals.filter(function(handler_id) {
      this.win.disconnect(handler_id);
      return false;
    }.bind(this));
  }
}