const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const Gdk = imports.gi.Gdk;

class Util {
  static get_default_pointer() {
        let display = Gdk.Display.get_default();
        let seat = display.get_default_seat();
        return seat.get_pointer();
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