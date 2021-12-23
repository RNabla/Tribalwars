import { Resources } from "./Bootstrap.resources";
import { DIALOG_PROPERTIES } from "./TribalWars";

declare const UI: any;
declare const Dialog: {
    show(id: string, html: string);
};

export class Bootstrap {
    private static namespace = "Hermitowski.Bootstrap";

    static handle_error(error: Error, forum_thread_href: string) {
        console.error(error);
        const gui =
            `<h2>${Resources.HEADER}</h2>
            <p>
                ${Resources.DESCRIPTION}
                <textarea rows='12' cols='80'>${error}\n\n${error.stack}</textarea><br/>
                <a href='${forum_thread_href}'>${Resources.FORUM_THREAD}</a>
            </p>`;
        Dialog.show(Bootstrap.namespace, gui);
    }

    static async run(forum_thread: string, entry_point: () => Promise<any>) {
        try {
            const message = await entry_point();
            UI.SuccessMessage(message);
        }
        catch (ex) {
            if (ex instanceof ScriptResult) {
                UI.ErrorMessage(ex.message);
                if (ex.href) {
                    location.href = ex.href;
                }
            }
            else {
                this.handle_error(ex, forum_thread);
            }
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