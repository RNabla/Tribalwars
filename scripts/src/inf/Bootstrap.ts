import { Resources } from "./Bootstrap.resources";

declare const UI: {
    ErrorMessage(message: string): void;
    SuccessMessage(message: string): void;
};
declare const Dialog: {
    show(id: string, html: string): void;
};
declare const document: Document;

export class Bootstrap {
    private static namespace = "Hermitowski.Bootstrap";

    static handle_error(error: Error | ScriptResult, forum_thread_href: string) {
        if (error instanceof ScriptResult) {
            UI.ErrorMessage(error.message);
            if (error.href) {
                location.href = error.href;
            }
        }
        else {
            console.error(error);
            const header = document.createElement("h2");
            header.textContent = Resources.HEADER;
            const stack_trace_textarea = document.createElement("textarea");
            stack_trace_textarea.rows = 12;
            stack_trace_textarea.cols = 100;
            stack_trace_textarea.textContent = error.toString() + "\n\n" + error.stack;
            const forum_link = document.createElement("a");
            forum_link.href = forum_thread_href;
            forum_link.textContent = Resources.FORUM_THREAD;
            const container = document.createElement("div");
            container.append(header);
            container.append(document.createTextNode(Resources.DESCRIPTION));
            container.append(document.createElement("br"));
            container.append(stack_trace_textarea);
            container.append(document.createElement("br"));
            container.append(forum_link);
            Dialog.show(Bootstrap.namespace, container.innerHTML);
        }
    }

    static async run(forum_thread_href: string, entry_point: () => Promise<string>) {
        try {
            const message = await entry_point();
            if (message != null) {
                UI.SuccessMessage(message);
            }
        }
        catch (ex) {
            this.handle_error(ex, forum_thread_href);
        }
    }
}

export class ScriptResult {
    message: string;
    href?: string;

    constructor(message: string, href?: string) {
        this.message = message;
        this.href = href;
    }
}