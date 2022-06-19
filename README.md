# Drop Zones Gnome Extension

Gnome extension that allows you to configure areas of the screen onto which you can then drop windows for quick flexible tiling.


For now, clone the repo to $HOME/.local/share/gnome-shell/extensions/drop-zones@mattandersen.me
```
git clone git@github.com:mca-gif/gnome-extension-drop-zones.git drop-zones@mattandersen.me
```

and restart Gnome with Alt+F2 and type "restart"

To use, enable it in the Gnome Extensions app, and when moving a window hold down the Ctrl button. When the pointer passes over one of the drop zones, the area will highlight in blue. Let go and it will resize the window.

To view the log for debugging purposes run the following in a terminal:
```
    journalctl -xfe | grep -E -i -B 2 -A 2 "gnome-shell.*(?JS ERROR|drop-zones)"
```
