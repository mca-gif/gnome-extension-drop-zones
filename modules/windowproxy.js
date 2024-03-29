const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const zoneable_window_types = [
  Meta.WindowType.NORMAL
];

const blacklist_classes = [
  'Conky'
];

var WindowProxy = class WindowProxy {
  static get_id(win) {
    return win.get_stable_sequence();
  }

  constructor(meta_window) {
    this.win = meta_window;
    this._signals = [];
    
    this._restore_rect = null;
  }

  set_restore_rect() {
    this._restore_rect = this.win.get_frame_rect();
  }

  clear_restore_rect() {
    this._restore_rect = null;
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

    if ( blacklist_classes.indexOf(this.window_class())  === -1 ) {
      return false;
    }

    if ( zoneable_window_types.indexOf(this.window_type()) === -1 ) {
      return false;
    }

    return true;
  }
}