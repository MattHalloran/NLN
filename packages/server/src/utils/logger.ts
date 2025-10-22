enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3,
}

class Logger {
    private level: LogLevel;

    constructor() {
        const env = process.env.NODE_ENV || "development";
        const logLevel = process.env.LOG_LEVEL || "info";

        this.level = this.parseLogLevel(logLevel);

        // In production, default to INFO unless explicitly set
        if (env === "production" && !process.env.LOG_LEVEL) {
            this.level = LogLevel.INFO;
        }
    }

    private parseLogLevel(level: string): LogLevel {
        switch (level.toLowerCase()) {
            case "error":
                return LogLevel.ERROR;
            case "warn":
                return LogLevel.WARN;
            case "info":
                return LogLevel.INFO;
            case "debug":
                return LogLevel.DEBUG;
            default:
                return LogLevel.INFO;
        }
    }

    private formatMessage(level: string, message: string, ...args: unknown[]): string {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : "";
        return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
    }

    error(message: string, ...args: unknown[]): void {
        if (this.level >= LogLevel.ERROR) {
            console.error(this.formatMessage("ERROR", message, ...args));
        }
    }

    warn(message: string, ...args: unknown[]): void {
        if (this.level >= LogLevel.WARN) {
            console.warn(this.formatMessage("WARN", message, ...args));
        }
    }

    info(message: string, ...args: unknown[]): void {
        if (this.level >= LogLevel.INFO) {
            // eslint-disable-next-line no-console
            console.log(this.formatMessage("INFO", message, ...args));
        }
    }

    debug(message: string, ...args: unknown[]): void {
        if (this.level >= LogLevel.DEBUG) {
            // eslint-disable-next-line no-console
            console.log(this.formatMessage("DEBUG", message, ...args));
        }
    }

    log(message: string, ...args: unknown[]): void {
        this.info(message, ...args);
    }
}

export const logger = new Logger();
export default logger;
