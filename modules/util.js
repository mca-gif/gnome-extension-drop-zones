const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Logger = Me.imports.modules.logger.Logger.getLogger("Drop Zones");

const Meta = imports.gi.Meta;
const Gdk = imports.gi.Gdk;

class Util {
  static get_default_pointer() {
        let display = Gdk.Display.get_default();
        let seat = display.get_default_seat();
        return seat.get_pointer();
  }

  static is_ctrl_pressed() {
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