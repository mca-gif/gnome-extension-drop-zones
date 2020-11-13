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

    this._dropped_zone = -1;
    this._restore_rect = null;22
  }

  set_dropped_zone(n) {
    this._log.debug(`Window ${this.win.get_id()} has been dropped in zone ${n}`);
    this._dropped_zone = n;
  }

  get_dropped_zone_index() {
    return this._dropped_zone;
  }

  set_restore_rect() {
    this._restore_rect = this.win.get_frame_rect();
  }

  restore_rect() {
    if ( !this._restore_rect ) { return; }

    let cur_rect = this.win.get_frame_rect();
    let new_rect = {
      x: cur_rect.x + (cur_rect.width - this._restore_rect.width),
      y: cur_rect.y + (cur_rect.height - this._restore_rect.height),
      width: this._restore_rect.width,
      height: this._restore_rect.height
    }

    this.move_resize_frame(new_rect);
    this._restore_rect = null;
  }

  move_resize_frame(rect) {
    this.win.move_resize_frame(true, rect.x, rect.y, rect.width, rect.height);
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
}