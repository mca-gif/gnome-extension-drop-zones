/* extension.js */

const GETTEXT_DOMAIN = 'GZones';

const { GObject, St } = imports.gi;

const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Gdk = imports.gi.Gdk;
const Clutter = imports.gi.Clutter;
const Mainloop = imports.mainloop;

const Window = Me.imports.modules.window.Window;
const Logger = Me.imports.modules.logger.Logger.getLogger("GZones");

var HighlightBox = GObject.registerClass(
class HighlightBox extends St.Widget {
    _init(name, x, y, width, height) {
        super._init({
            name: name,
            style_class: 'tile-preview',
            x: x,
            y: y,
            visible: true,
            reactive: false,
            width: width,
            height: height
        });
    }
});

class Extension {
    static zones = [
        { x: 0, y: 0, width: 1600, height: 1080 },
        { x: 0, y: 1080, width: 1600, height: 1080 },
        { x: 1600, y: 0, width: 1920, height: 2160 },
        { x: 3520, y: 0, width: 1600, height: 1080 },
        { x: 3520, y: 1080, width: 1600, height: 1080 }
    ];

    static moving_grab_ops = [
        Meta.GrabOp.MOVING,
        Meta.GrabOp.KEYBOARD_MOVING
    ];

    constructor(uuid) {      
        this._uuid = uuid;
        this._hb = null;
        this._actor_connections = [];
        this._windows = [];
        this._log = Logger.getLogger("Extension");

        this._timer = null;

        this._log.info(`initializing ${Me.metadata.name} version ${Me.metadata.version}`);
        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._hb = new HighlightBox('drop-zone', -10, -10, 0, 0);
        Main.uiGroup.add_actor(this._hb);

        // this._connect_signal(global.display, 'window-created', this._on_window_create.bind(this));
        this._connect_signal(global.display, 'grab-op-begin', this._on_window_grab_begin.bind(this));
        this._connect_signal(global.display, 'grab-op-end', this._on_window_grab_end.bind(this));

        let display = Gdk.Display.get_default();
        let seat = display.get_default_seat();
        this._pointer = seat.get_pointer();
    }

    disable() {
        this._pointer = null;

        Main.uiGroup.remove_actor(this._hb);

        this._disconnect_signals();
    }

    _on_window_create(display, meta_win) {
        let win = new Window(meta_win);
        this._windows[Window.get_id(meta_win)] = win;
        
        this._connect_signal(meta_win, 'unmanaged', this._on_window_unmanage.bind(this));
    }

    _on_window_unmanage(meta_win) {
        delete this._windows[Window.get_id(meta_win)];
        this._disconnect_signals(meta_win);
    }

    _on_window_grab_begin(actor, meta_display, meta_win, grab_op) {
        if (!meta_win) { return; }
        if (Extension.moving_grab_ops.indexOf(grab_op) === -1) { return; }

        this._begin_on_window_move(actor, meta_display, meta_win);
    }

    _on_window_grab_end(actor, meta_display, meta_win, grab_op) {
        if (!meta_win) { return; }
        if (Extension.moving_grab_ops.indexOf(grab_op) === -1) { return; }

        this._end_on_window_move(actor, meta_display, meta_win);
    }

    _begin_on_window_move(actor, meta_display, meta_win) {
        if (this._timer) { return; }

        this._timer = Mainloop.timeout_add(200, this._on_window_move_refresh.bind(this, meta_win));

        // let ct = Meta.CursorTracker.get_for_display(global.display);
        // this._connect_signal(ct, "cursor-moved", this._on_window_move.bind(this));
    }

    _on_window_move(x, y) {
    }

    _on_window_move_refresh(meta_win) {
        if (!this._timer) { return false; }
        if (!this._is_ctrl_pressed()) {
            this._hide_hit_box();
            return true;
        }

        let mouse_rect = this._get_mouse_rect();
        let hit_zone = this._zone_hit_test(mouse_rect);

        if ( hit_zone ) {
            this._update_hit_box(hit_zone);
        } else {
            this._hide_hit_box();
        }


        if (!this._timer) { return false; }
        return true;
    }

    _end_on_window_move(actor, meta_display, meta_win) {
        this._timer = null;
        if (!this._is_ctrl_pressed()) { return; }

        let mouse_rect = this._get_mouse_rect();
        let hit_zone = this._zone_hit_test(mouse_rect);

        this._hide_hit_box();

        if (typeof hit_zone !== 'undefined') {
            meta_win.move_resize_frame(true, hit_zone.x, hit_zone.y, hit_zone.width, hit_zone.height);
        }
    }

    _connect_signal(actor, signal, fn, alternative_target) {
        let connection_target = (typeof alternative_target === 'undefined' || !alternative_target) ? actor : alternative_target;

        this._log.debug("Connecting to target " + connection_target + " for signal " + signal + ' on behalf of actor ' + actor);

        this._actor_connections.push({
            actor: actor,
            signal: signal,
            handler_id: connection_target.connect(signal, fn),
            connection_target: connection_target
        });
    }

    _disconnect_signals(actor) {
        this._actor_connections = this._actor_connections.filter(function(sig) {
            if ( typeof actor === 'undefined' || sig.actor === actor ) {
                this._log.debug("Disconnecting signal " + sig.signal + " from actor " + sig.actor);
                sig.connection_target.disconnect(sig.handler_id);
                return false;
            }
            
            return true;
        }.bind(this));
    }

    _zone_hit_test(test_rect) {
        const hit_zone = Extension.zones.find(zone => {
            return this._rect_hit_test(test_rect, zone);
        });

        return hit_zone;
    }

    _rect_hit_test(r1, r2) {
        return (r1.x + r1.width >= r2.x)
        && (r1.x <= r2.x + r2.width)
        && (r1.y + r1.height >= r2.y)
        && (r1.y <= r2.y + r2.height)
    }

    _update_hit_box(rect) {
        this._hb.set_x(rect.x);
        this._hb.set_y(rect.y);
        this._hb.set_width(rect.width);
        this._hb.set_height(rect.height);
    }

    _hide_hit_box() {
        this._update_hit_box({
            x: -10,
            y: -10,
            width: 0,
            height: 0
        });
    }

    _get_mouse_rect() {
        let [screen, x, y] = this._pointer.get_position();
        return {
            x: x,
            y: y,
            width: 4,
            height: 4
        }
    }

    _is_ctrl_pressed() {
        let mod_state = Gdk.Keymap.get_for_display(Gdk.Display.get_default()).get_modifier_state();
        return !!(mod_state & Gdk.ModifierType.CONTROL_MASK);
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
