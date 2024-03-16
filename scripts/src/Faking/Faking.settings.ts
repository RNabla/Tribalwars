import { ScriptResult } from "../inf/Bootstrap";
import { Logger, LoggerFactory } from "../inf/Logger";
import { IMapFiles } from "../inf/MapFiles";
import { ITribalWars } from "../inf/TribalWars";
import { FakingSettings } from "./Faking";
import { Resources } from "./Faking.resources";
import { SetttingsMapper } from "./Faking.settings.mapper";

export interface ForumConfiguration {
    thread_id: number,
    page: number,
    spoiler_name: string,
    time_to_live_s: number
}

export class SettingsProvider {
    private logger: Logger;
    private tribalwars: ITribalWars;
    private map_files: IMapFiles;

    constructor(
        tribalwars: ITribalWars,
        map_files: IMapFiles
    ) {
        LoggerFactory.create_instance("Hermitowski.Faking.SettingsProvider", (logger) => { this.logger = logger; });
        this.tribalwars = tribalwars;
        this.map_files = map_files;
    }

    public async get_settings(user_configuration): Promise<FakingSettings> {
        this.logger.entry(arguments);

        if (typeof (user_configuration) !== "object") {
            throw new ScriptResult(Resources.ERROR_CONFIGURATION_MISSING);
        }

        const forum_config = this.try_get_forum_config(user_configuration["forum_config"]);

        if (forum_config != null) {
            user_configuration = await this.load_config_from_forum(forum_config);
        }

        const settings = SetttingsMapper.map_configuration(user_configuration);

        this.logger.exit();
        return settings;
    }

    private try_get_forum_config(user_forum_configuration): ForumConfiguration {
        if (typeof (user_forum_configuration) === "object") {
            const thread_id = SetttingsMapper.as_number(user_forum_configuration["thread_id"], null);
            if (thread_id == null) {
                throw new ScriptResult(Resources.ERROR_FORUM_CONFIG_THREAD_ID);
            }
            const spoiler_name = SetttingsMapper.as_string(user_forum_configuration["spoiler_name"], null);
            if (spoiler_name == null) {
                throw new ScriptResult(Resources.ERROR_FORUM_CONFIG_SPOILER_NAME);
            }
            const page = SetttingsMapper.as_number(user_forum_configuration["page"], 0);
            const time_to_live_s = SetttingsMapper.as_number(user_forum_configuration["time_to_live_s"], 3600);
            return { thread_id, page, spoiler_name, time_to_live_s };
        }
        return null;
    }

    private async load_config_from_forum(forum_config: ForumConfiguration): Promise<object> {
        this.logger.entry(arguments);

        const user_configuration = await this.map_files.get_or_compute_dynamic(async (config) => {
            const document = await this.tribalwars.fetchDocument("GET", "forum", {
                "screenmode": "view_thread",
                "thread_id": config.thread_id,
                "page": config.page
            });

            const spoiler_buttons = document.querySelectorAll(`div.spoiler > input[value="${config.spoiler_name}"]`);

            if (spoiler_buttons.length == 0) {
                throw new ScriptResult(Resources.ERROR_FORUM_CONFIG_SPOILER_NONE);
            }
            if (spoiler_buttons.length > 1) {
                throw new ScriptResult(Resources.ERROR_FORUM_CONFIG_SPOILER_MULTIPLE);
            }

            const spoiler_button = spoiler_buttons[0];

            const spoiler = spoiler_button.parentElement;

            this.logger.log(spoiler);

            const code_snippets = spoiler.querySelectorAll("pre");

            if (code_snippets.length == 0) {
                throw new ScriptResult(Resources.ERROR_FORUM_CONFIG_CODE_SNIPPET_NONE);
            }
            if (code_snippets.length > 1) {
                throw new ScriptResult(Resources.ERROR_FORUM_CONFIG_CODE_SNIPPET_MULTIPLE);
            }
            const code_snippet = code_snippets[0].innerText;

            return this.parse_forum_configuration(code_snippet);

        }, forum_config, forum_config.time_to_live_s);

        this.logger.exit();

        return user_configuration;
    }

    private parse_forum_configuration(code_snippet: string): object {
        try {
            try {
                const user_configuration = JSON.parse(code_snippet);
                this.logger.log("Extracted", code_snippet, user_configuration);
                return user_configuration;
            }
            catch {
                // OK - it's not a valid JSON, but maybe we can still parse it

                // try to remove `var Hermitowskie Fejki = `
                if (code_snippet.indexOf("HermitowskieFejki") != -1) {
                    code_snippet = code_snippet.substring(code_snippet.indexOf("=") + 1);
                }

                // try to remove ; $.ajax
                if (code_snippet.indexOf(";") !== -1) {
                    code_snippet = code_snippet.substring(0, code_snippet.indexOf(";"));
                }

                // in quickbar we can use ' and " interchangeably
                code_snippet = code_snippet.replace(/'/g, "\"");
                // in quickbar we can also use comments
                code_snippet = code_snippet.replace(/\/\/.*/g, "");
                // we can also have /* */ comments
                code_snippet = code_snippet.replace(/\/\*.*?\*\//sg, "");

                this.logger.log("Trying to parse", code_snippet);
                const user_configuration = JSON.parse(code_snippet);
                this.logger.log("Extracted", code_snippet, user_configuration);
                return user_configuration;
            }
        }
        catch {
            throw new ScriptResult(Resources.ERROR_FORUM_CONFIG_CODE_SNIPPET_MALFORMED);
        }
    }
}