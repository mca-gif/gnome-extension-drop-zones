const GLib = imports.gi.GLib;

var Logger = class Logger {
    constructor(name, level) {
        this.base = name;

        if (!level) {
            level = Logger.LEVEL_WARN;
        }

        this.level = level;

        this._log("DEBUG", `Log level is ${this.level}`);
    }

    checkLevel(level)
    {
        return level === undefined || this.level === undefined || level <= this.level;
    }

    log(level_name, message, level){
        if (this.checkLevel(level)){
            this._log(level_name, message)
        }
    }

    _log(level_name, message)
    {
        global.log(`${this.base} [${level_name}] ${message}`);
    }

    debug(message)
    {
        this.log("DEBUG", message, Logger.LEVEL_DEBUG);
    }

    info(message)
    {
        this.log("INFO", message, Logger.LEVEL_INFO);
    }

    warn(message)
    {
        this.log("WARN", message, Logger.LEVEL_WARN);
    }

    error(message)
    {
        this.log("ERROR", message, Logger.LEVEL_ERROR);
    }

    getLogger(name)
    {
        return new Logger(this.base + ":" + name, this.level);
    }
}

Logger.LEVEL_EMERG = 0;
Logger.LEVEL_ALERT = 1;
Logger.LEVEL_CRIT = 2;
Logger.LEVEL_ERROR = 3;
Logger.LEVEL_WARN = 4;
Logger.LEVEL_NOTICE = 5;
Logger.LEVEL_INFO = 6;
Logger.LEVEL_DEBUG = 7;