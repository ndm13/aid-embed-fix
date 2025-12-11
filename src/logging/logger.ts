import { getLogger, LogRecord, setup } from "@std/log";
import { ConsoleHandler } from "@std/log/console-handler";

import formatters from "./formatters.ts";

import config from "../config.ts";

setup({
    handlers: {
        console: new ConsoleHandler(config.logLevel, {
            formatter: (record: LogRecord) => {
                return `[${record.levelName}] ${record.msg} ${record.args.map(formatters.format).join("\n")}`
                    .replaceAll("\n", `\n[${record.levelName}] `);
            }
        })
    },
    loggers: {
        default: {
            level: config.logLevel,
            handlers: ["console"]
        }
    }
});

const log = getLogger();
export default log;
