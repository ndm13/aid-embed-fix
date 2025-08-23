import {getLogger, LogRecord, setup} from "log";
import {ConsoleHandler} from "log/console-handler";

import formatters from "./formatters.ts";

setup({
    handlers: {
        console: new ConsoleHandler("DEBUG", {
            formatter: (record: LogRecord) => {
                return `[${record.levelName}] ${record.msg} ${record.args.map(formatters.format).join('\n')}`
                    .replaceAll('\n', `\n[${record.levelName}] `);
            }
        })
    },
    loggers: {
        default: {
            level: "DEBUG",
            handlers: ["console"]
        }
    }
});

const log = getLogger();
export default log;