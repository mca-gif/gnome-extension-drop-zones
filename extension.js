/* extension.js */

const GETTEXT_DOMAIN = 'Drop Zones';

const { GObject, St } = imports.gi;

const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;

const Window = Me.imports.modules.window.Window;
const Logger = Me.imports.modules.logger.Logger.getLogger("Drop Zones");
const Util = Me.imports.modules.util.Util;
const Settings = Me.imports.modules.settings.Settings;
const ModKeyHelper = Me.imports.modules.modkeyhelper.ModKeyHelper;

const SETTING_ZONE_PATTERN = 'zone-pattern';
const SETTING_BORDER_GAP = 'border-gap';

// Delay in seconds
const INITIAL_ZONE_CALC_DELAY = 3;
// How often scan for zones
const ZONE_RECALC_INTERVAL = 200;

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


    constructor(uuid) {
        this._uuid = uuid;
        this._hb = null;
        this._actor_connections = [];
        this._windows = [];
        this._log = Logger.getLogger("Extension");
        this._modkey = new ModKeyHelper();

        this._settings = Settings.forExtensionSchema();

        this._gnome_shell_settings = Settings.forSchema('org.gnome.shell.overrides');
        this._gnome_mutter_settings = Settings.forSchema('org.gnome.mutter');

        this._zones = [];
        this._timer = null;
        

        this.premade_zones = [
            /* Quarter Tiles */ [
                { x: 0.00, y: 0.00, width: 0.50, height: 0.50},
                { x: 0.50, y: 0.00, width: 0.50, height: 0.50},
                { x: 0.00, y: 0.50, width: 0.50, height: 0.50},
                { x: 0.50, y: 0.50, width: 0.50, height: 0.50}
            ],
            /* 40% / 60% */ [
                { x: 0.00, y: 0.00, width: 0.40, height: 1.00},
                { x: 0.40, y: 0.00, width: 0.60, height: 1.00}
            ],
            /* Wide Screen */[
                { x: 0.00, y: 0.00, width: 0.30, height: 0.50 }, // Left - upper
                { x: 0.00, y: 0.50, width: 0.30, height: 0.50 }, // Left - lower
                { x: 0.3125, y: 0.00, width: 0.37, height: 0.50 }, // Center - upper - large
                { x: 0.30, y: 0.00, width: 0.45, height: 0.70 }, // Center - upper - large
                { x: 0.30, y: 0.70, width: 0.45, height: 0.30 }, // Center - lower
                { x: 0.75, y: 0.00, width: 0.25, height: 0.40 }, // Right - upper
                { x: 0.75, y: 0.40, width: 0.25, height: 0.60 }  // Right - lower
            ]
        ];

        this.moving_grab_ops = [
            Meta.GrabOp.MOVING,
            Meta.GrabOp.KEYBOARD_MOVING
        ];

        this._log.info(`initializing ${Me.metadata.name} version ${Me.metadata.version}`);
        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        let workspace_manager = Util.get_workspace_manager();

        this._hb = new HighlightBox('drop-zone', -10, -10, 0, 0);
        Main.uiGroup.add_actor(this._hb);

        this._connect_signal(global.display, 'window-created', this._on_window_create.bind(this));
        this._connect_signal(global.display, 'grab-op-begin', this._on_window_grab_begin.bind(this));
        this._connect_signal(global.display, 'grab-op-end', this._on_window_grab_end.bind(this));

        this._connect_signal(workspace_manager, 'workspace-added', this._on_workspace_changed.bind(this));
        this._connect_signal(workspace_manager, 'workspace-removed', this._on_workspace_changed.bind(this));

        this._pointer = Util.get_default_pointer();

        this._load_settings();

        // Delay zone calculation for a few seconds.
        // For some reason the workspace isn't the correct size yet, but the workspace-added signal above isn't called when it is right.
        GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, INITIAL_ZONE_CALC_DELAY, function() {
            if ( this._zones.length === 0 ) {
                this._calculate_zone_pixel_sizes();
            }

            return false;
        }.bind(this));
    }

    disable() {
        this._pointer = null;
        this._gnome_mutter_settings.set_boolean('edge-tiling', this._settings_edge_tiling_restore_value);

        Main.uiGroup.remove_actor(this._hb);
        this._hb = null;

        this._disconnect_signals();
    }

    _load_settings() {
        this._settings_edge_tiling_restore_value = this._gnome_mutter_settings.get_boolean('edge-tiling');
        this._gnome_mutter_settings.set_boolean('edge-tiling', false);

        this._connect_signal(this._settings, 'changed::' + SETTING_BORDER_GAP, this._on_border_gap_changed.bind(this));
        this._connect_signal(this._settings, 'changed::' + SETTING_ZONE_PATTERN, this._on_zone_pattern_changed.bind(this));
    }

    _calculate_zone_pixel_sizes() { 
        this._log.info("Recalculating zone areas.");

        let work_area = Util.get_workspace_area(0);
        let padding = Math.floor(this._settings.get_int(SETTING_BORDER_GAP));

        this._log.info(`Workarea Rect: ${work_area.x} ${work_area.y} ${work_area.width} ${work_area.height}`);
        this._log.info(`Padding: ${padding}`);

        this._zones = this._get_zone_patterns().map(zone_per => {
            let zone_rect = {
                x: Math.round((work_area.width * zone_per.x) + work_area.x + padding),
                y: Math.round((work_area.height * zone_per.y) + work_area.y + padding),
                width: Math.round(work_area.width * zone_per.width - (padding)),
                height: Math.round(work_area.height * zone_per.height - (padding))
            };

            if ( (zone_rect.x + zone_rect.width) === (work_area.x + work_area.width) ) {
                zone_rect.width -= padding;
            }
            if ( (zone_rect.y + zone_rect.height) === (work_area.y + work_area.height) ) {
                zone_rect.height -= padding;
            }

            // this._log.debug(`Zone Rect: ${zone_rect.x} ${zone_rect.y} ${zone_rect.width} ${zone_rect.height}`);

            return zone_rect;
        });
    }

    _on_workspace_changed() {
        this._calculate_zone_pixel_sizes();
    }

    _on_window_create(display, meta_win) {
        let win = new Window(meta_win);
        this._windows[meta_win.get_id()] = win;
        
        this._connect_signal(meta_win, 'unmanaged', this._on_window_unmanage.bind(this));
    }

    _on_window_unmanage(meta_win) {
        delete this._windows[Window.get_id(meta_win)];
        this._disconnect_signals(meta_win);
    }

    _on_window_grab_begin(actor, meta_display, meta_win, grab_op) {
        if (!meta_win) { return; }
        if (this.moving_grab_ops.indexOf(grab_op) === -1) { return; }

        this._log.debug(`Grab begin operation: ${grab_op}`);

        if ( !this._zones ) {
            this._calculate_zone_pixel_sizes();
        }

        this._begin_on_window_move(actor, meta_display, meta_win);
    }

    _on_window_grab_end(actor, meta_display, meta_win, grab_op) {
        if (!meta_win) { return; }
        if (this.moving_grab_ops.indexOf(grab_op) === -1) { return; }

        this._end_on_window_move(actor, meta_display, meta_win);
    }

    _begin_on_window_move(actor, meta_display, meta_win) {
        if (this._timer) { return; }

        let zone_win = this._windows[meta_win.get_id()];

        this._log.debug("Beginning window move.");
        
        this._timer = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            ZONE_RECALC_INTERVAL,
            this._on_window_move_refresh.bind(this, zone_win)
        );
    }

    _on_window_move_refresh(zone_win) {
        if (!this._timer) { return false; }

        this._log.debug("Beginning window move.");

        zone_win.restore_rect();

        if ( !this._modkey.is_pressed()) {
            this._hide_hit_box();
            return true;
        }

        let mouse_rect = this._get_mouse_rect();
        let [hit_zone_idx, hit_zone] = this._zone_hit_test(mouse_rect);

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
        this._hide_hit_box();
        if (!this._modkey.is_pressed_buffered()) { return; }

        let mouse_rect = this._get_mouse_rect();
        let [hit_zone_idx, hit_zone] = this._zone_hit_test(mouse_rect);

        if (typeof hit_zone !== 'undefined') {
            let zone_win = this._windows[meta_win.get_id()];
            zone_win.set_dropped_zone(hit_zone_idx)
            zone_win.set_restore_rect();
            zone_win.move_resize_frame(hit_zone);
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
        this._log.debug("Hit test begin");
        let hit_zone_idx = this._zones.findIndex(zone => {
            let hit_zone = this._rect_hit_test(test_rect, zone);
            this._log.debug(`Hit testing zone ${zone.x},${zone.y},${zone.width},${zone.height} ${hit_zone}`);
            return hit_zone;
        });

        let hit_zone = this._zones[hit_zone_idx];

        this._log.debug("Hit test end");

        return [hit_zone_idx, hit_zone];
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

    _on_border_gap_changed() {
        this._log.info(`Gap size changed. ${this._settings.get_int(SETTING_BORDER_GAP)}`);
        this._calculate_zone_pixel_sizes();
    }

    _on_zone_pattern_changed() {
        this._log.info(`Zone pattern selection changed. ${this._settings.get_int(SETTING_ZONE_PATTERN)}`);
        this._calculate_zone_pixel_sizes();
    }

    _get_zone_patterns() {
        let pattern_selection = this._settings.get_int(SETTING_ZONE_PATTERN);
        this._log.debug(`Selected zone pattern is ${pattern_selection}`);

        if ( pattern_selection >= this.premade_zones.length || pattern_selection < 0 ) {
            pattern_selection = 0;
        }

        return this.premade_zones[pattern_selection];
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
