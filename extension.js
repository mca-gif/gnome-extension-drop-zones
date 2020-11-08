/* extension.js */

const GETTEXT_DOMAIN = 'GZones';

const { GObject, St } = imports.gi;

const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const Mainloop = imports.mainloop;

const Window = Me.imports.modules.window.Window
const Logger = Me.imports.modules.logger.Logger.getLogger("GZones");

var HighlightBox = GObject.registerClass(
class HighlightBox extends St.Widget {
    _init(name, x, y, width, height) {
        super._init({
            name: name,
            style_class: 'highlight-box',
            x: x,
            y: y,
            visible: true,
            reactive: true,
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

        this._log.info(`initializing ${Me.metadata.name} version ${Me.metadata.version}`);
        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._hb = new HighlightBox('drop-zone', -10, -10, 0,0);
        Main.uiGroup.add_actor(this._hb);

        this._connect_signal(global.display, 'window-created', this._on_window_create.bind(this));
    }

    disable() {
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

    _connect_signal(actor, signal, fn) {
        this._log.debug("Connecting to actor " + actor + " for signal " + signal);

        this._actor_connections.push({
            actor: actor,
            signal: signal,
            handler_id: actor.connect(signal, fn)
        });
    }

    _disconnect_signals(actor) {
        this._actor_connections = this._actor_connections.filter(function(sig) {
            if ( typeof actor === 'undefined' || sig.actor === actor ) {
                this._log.debug("Disconnecting signal " + sig.signal + " from actor " + sig.actor);
                actor.disconnect(sig.handler_id);
                return false;
            }
            
            return true;
        }.bind(this));
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
