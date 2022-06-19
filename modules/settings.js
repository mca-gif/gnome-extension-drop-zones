const Me = imports.misc.extensionUtils.getCurrentExtension();
const Gio = imports.gi.Gio;

var Settings = class Settings {
  static forSchema(schema) {
    let gschema;
    let schemas_dir = Me.dir.get_child('schemas');

    if ( schemas_dir.query_exists(null)) {
      gschema = Gio.SettingsSchemaSource.new_from_directory(
        Me.dir.get_child('schemas').get_path(),
        Gio.SettingsSchemaSource.get_default(),
        false
      );
    } else {
      gschema.get_default();
    }

    return  new Gio.Settings({
        settings_schema: gschema.lookup(schema, true)
    });
  }

  static forExtensionSchema() {
    return Settings.forSchema(Me.metadata.schema);
  }
}