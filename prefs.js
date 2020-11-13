'use strict';

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Settings = Me.imports.modules.settings.Settings;

function init() {
}

function buildPrefsWidget() {
  this.settings = Settings.forExtensionSchema();
  
  // Create a parent widget that we'll return from this function
  let prefsWidget = new Gtk.Grid({
    margin: 18,
    column_spacing: 12,
    row_spacing: 12,
    visible: true
  });
  
  // Add a simple title and add it to the prefsWidget
  let title = new Gtk.Label({
    // As described in "Extension Translations", the following template
    // lit
    // prefs.js:88: warning: RegExp literal terminated too early
    //label: `<b>${Me.metadata.name} Extension Preferences</b>`,
    label: '<b>' + Me.metadata.name + ' Extension Preferences</b>',
    halign: Gtk.Align.START,
    use_markup: true,
    visible: true
  });
  prefsWidget.attach(title, 0, 0, 2, 1);
  
  // Create a label & switch for `show-indicator`
  let toggleLabel = new Gtk.Label({
    label: 'Border Gap:',
    halign: Gtk.Align.START,
    visible: true
  });
  prefsWidget.attach(toggleLabel, 0, 1, 1, 1);
  
  let border_gap_spin = new Gtk.SpinButton({
    adjustment: new Gtk.Adjustment({
      lower: 0,
      upper: 25,
      step_increment: 1
    }),
    value: this.settings.get_boolean ('border-gap'),
    numeric: true,
    digits: 0,
    "snap-to-ticks": true,
    "update-policy": Gtk.SpinButtonUpdatePolicy.IF_VALID,
    visible: true
  });
  prefsWidget.attach(border_gap_spin, 1, 1, 1, 1);
  
  // Bind the switch to the `show-indicator` key
  this.settings.bind(
    'border-gap',
    border_gap_spin,
    'value',
    Gio.SettingsBindFlags.DEFAULT
  );

  // Return our widget which will be added to the window
  return prefsWidget;
}