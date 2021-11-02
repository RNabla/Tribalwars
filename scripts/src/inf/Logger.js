export const Logger = {
    create_instance: function (namespace) {
        // return empty instance if Tracing is configured and given namespace is not mentioned
        if (!window['Hermitowski.Tracing'] || !window['Hermitowski.Tracing'][namespace]) {
            return {
                log: function () { },
                entry: function () { },
                exit: function () { },
            }
        }

        const base_stack = new Error().stack.split('\n').slice(1);
        const style = "color: green;";
        const get_stack_trace = function () {
            var stack_frames = new Error().stack.split('\n').slice(2);
            const stack_trace = [`%c${namespace}`];
            for (var i = 1; i <= stack_frames.length; i++) {
                if ((base_stack.length - i < 0) ||
                    (base_stack.length - i >= 0 && stack_frames[stack_frames.length - i] != base_stack[base_stack.length - i])) {
                    const frame_name = get_frame_name(stack_frames[stack_frames.length - i]);
                    if (frame_name.length > 0) {
                        stack_trace.push(frame_name);
                    }
                }
            }
            stack_trace.push("");
            return stack_trace;
        };
        const get_frame_name = function (stack_frame) {
            let frame_name = stack_frame.split("@")[0];
            const decorators = frame_name.split('async*');
            if (decorators.length > 1) {
                frame_name = decorators[1];
            }
            frame_name = frame_name.trim();
            return frame_name;
        };
        const timers = {};
        return {
            log: function () {
                const stack_trace = get_stack_trace();
                console.log.apply(undefined, [stack_trace.join(" | "), style, ...arguments]);
            },
            entry: function () {
                const stack_trace = get_stack_trace();
                const frame_name = get_frame_name(stack_trace[0]);
                timers[frame_name] = Date.now();
                console.group.apply(undefined, [stack_trace.join(" | "), style, "Entry", ...arguments]);
            },
            exit: function () {
                const stack_trace = get_stack_trace();
                const frame_name = get_frame_name(stack_trace[0]);
                const start = timers[frame_name];
                const items = [stack_trace.join(" | "), style, `Exit | Elapsed time: ${Date.now() - start} [ms]`];
                if (arguments.length > 0) {
                    items.push(` Returning: ${arguments[0]}`);
                }
                console.log.apply(undefined, items);
                console.groupEnd();
            }
        }
    }
};