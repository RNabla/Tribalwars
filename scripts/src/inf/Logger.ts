declare const LOGGING_ENABLED: boolean;
declare const window: Window;

export class LoggerFactory {
    static create_instance(namespace: string, property_assigner: (logger: Logger) => void): void {
        let logger = null;
        if (LOGGING_ENABLED) {
            logger = new Logger(namespace);
        }
        property_assigner(logger);
    }
};

export class Logger {
    logging_enabled: any;
    base_stack: string[];
    style: string;
    namespace: string;
    timers: Map<string, number>;
    constructor(namespace: string) {
        this.namespace = namespace;
        this.logging_enabled = window["Hermitowski.Tracing"]?.[namespace] != null;
        this.logging_enabled = false;
        this.logging_enabled = true;
        this.base_stack = new Error().stack.split("\n").slice(1);
        this.style = "color: green;";
        this.timers = new Map();
    }

    private get_stack_trace() {
        const stack_frames = new Error().stack.split("\n").slice(2);
        const stack_trace = [`%c${this.namespace}`];
        for (let i = 1; i <= stack_frames.length; i++) {
            if ((this.base_stack.length - i < 0) ||
                (this.base_stack.length - i >= 0 && stack_frames[stack_frames.length - i] != this.base_stack[this.base_stack.length - i])) {
                const frame_name = this.get_frame_name(stack_frames[stack_frames.length - i]);
                if (frame_name.length > 0) {
                    stack_trace.push(frame_name);
                }
            }
        }
        stack_trace.push("");
        return stack_trace;
    }

    private get_frame_name(stack_frame: string) {
        let frame_name = stack_frame.split("@")[0];
        const decorators = frame_name.split("async*");
        if (decorators.length > 1) {
            frame_name = decorators[1];
        }
        frame_name = frame_name.trim();
        return frame_name;
    }


    entry(...args: Array<any>) {
        if (this.logging_enabled) {
            const stack_trace = this.get_stack_trace();
            const frame_name = this.get_frame_name(stack_trace[0]);
            this.timers.set(frame_name, Date.now());
            console.group.apply(undefined, [stack_trace.join(" | "), this.style, "Entry", ...args]);
        }
    }


    log(...args: Array<any>) {
        if (this.logging_enabled) {
            const stack_trace = this.get_stack_trace();
            console.log.apply(undefined, [stack_trace.join(" | "), this.style, ...args]);
        }
    }

    exit(...args: Array<any>) {
        if (this.logging_enabled) {
            const stack_trace = this.get_stack_trace();
            const frame_name = this.get_frame_name(stack_trace[0]);
            const start = this.timers.get(frame_name);
            const items = [stack_trace.join(" | "), this.style, `Exit | Elapsed time: ${Date.now() - start} [ms]`];
            if (args.length > 0) {
                items.push(` Returning: ${args[0]}`);
            }
            console.log.apply(undefined, items);
            console.groupEnd();
        }
    }
}
