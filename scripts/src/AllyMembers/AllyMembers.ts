import { Logger, LoggerFactory } from "../inf/Logger";
import { Bootstrap, ScriptResult } from "../inf/Bootstrap";
import { IDocument } from "../inf/Document";
import { GameData, ITribalWars } from "../inf/TribalWars";
import { NodeDef } from "../inf/IUI";
import { IUI } from "../inf/IUI";
import { Resources } from "./AllyMembers.resources";
import { Task, Throttler } from "../inf/Helper";

interface ExportOptions {
    members_troops: boolean
    members_buildings: boolean
    members_defense: boolean
}
interface ExportMemberInfo {
    access_granted: boolean;
    player_id: string;
    player_name: string;
}

interface ExportInfo {
    members_troops: ExportMemberInfo[];
    members_buildings: ExportMemberInfo[];
    members_defense: ExportMemberInfo[];
}

interface TaskData {
    player_id: string,
    mode: string
}

interface PlayerData {
    [player_id: string]: {
        [export_option: string]: VillageData[]
    }
}

interface VillageData {
    coords: string;
    village_name: string;
    units?: {
        [unit_name: string]: number;
    },
    buildings?: {
        [building_name: string]: number;
    },
    points?: number;
    outgoing?: number;
    incoming?: number;
    village?: {
        [unit_name: string]: number;
    };
    transit?: {
        [unit_name: string]: number;
    };
}

interface MembersData {
    [player_id: string]: {
        [coords: string]: VillageData
    }
}

interface SkippedPlayer {
    player_name: string;
    reason: string;
}

const export_option_names = ["members_troops", "members_buildings", "members_defense"];

export class AllyMembers {
    private document: IDocument;
    private logger: Logger;
    private game_data: GameData;
    private tribalwars: ITribalWars;
    private ui: IUI;
    private ally_name: string;
    private building_names: string[];

    constructor(
        namespace: string,
        document: IDocument,
        tribalwarsProvider: ITribalWars,
        ui: IUI
    ) {
        this.document = document;
        this.tribalwars = tribalwarsProvider;
        this.game_data = tribalwarsProvider.getGameData();
        this.ui = ui;
        LoggerFactory.create_instance(namespace, (logger) => this.logger = logger);
    }

    public async main(): Promise<string> {
        if (this.game_data.player.ally === "0") {
            throw new ScriptResult(Resources.ERROR.NO_ALLY);
        }
        this.create_gui();
        return null;
    }

    private create_gui() {
        this.logger.entry();

        const panel_def: NodeDef[] = [
            {
                type: "fieldset", childs: [
                    { type: "legend", text: "Opcje exportu" },
                    {
                        type: "table",
                        childs: [
                            this.create_gui_export_option("members_troops"),
                            this.create_gui_export_option("members_buildings"),
                            this.create_gui_export_option("members_defense"),
                        ]
                    }],
            },
            {
                type: "div", id: "summary", styles: { display: "flex", "justify-content": "space-between", "align-items": "center" }, childs: [
                    { type: "span", id: "status", text: "" },
                    { type: "button", id: "export", handlers: { click: this.export.bind(this) }, styles: { "margin-top": "2px" } }
                ]
            }
        ];
        this.ui.create_dialog(panel_def, {
            forum_thread_href: Resources.FORUM_THREAD_HREF,
            header_name: Resources.SCRIPT_HEADER
        });
        this.logger.exit();
    }

    private create_gui_export_option(export_option: keyof ExportOptions): NodeDef {
        return {
            type: "tr",
            childs: [
                { type: "td", childs: [{ type: "input", id: export_option, attributes: { type: "checkbox" } }] },
                { type: "td", childs: [{ type: "label", attributes: { for: export_option } }] }
            ]
        };
    }

    private async export() {
        try {
            this.ui.get_control<HTMLButtonElement>("export").disabled = true;
            const export_options = this.get_export_options();
            const export_info = await this.get_export_info(export_options);
            const player_data = await this.fetch_data(export_info);
            const member_data = this.merge_member_data(player_data, export_options);
            const [table, skipped_players] = this.generate_table(export_info, member_data, export_options);
            this.save_as_file(table.join("\n"));
            if (skipped_players.length) {
                this.print_progress(Resources.ERROR.SKIPPED_PLAYERS + "\n" + skipped_players.map(x => `${x.player_name} - ${x.reason}`).join("\n"));
            } else {
                this.print_progress("");
            }
            this.ui.get_control<HTMLButtonElement>("export").disabled = false;
        }
        catch (ex) {
            Bootstrap.handle_error(ex, Resources.FORUM_THREAD_HREF);
        }
    }

    private async get_export_info(export_options: ExportOptions): Promise<ExportInfo> {
        this.logger.entry(arguments);
        this.print_progress(Resources.PROGRESS.PLAYER_LIST);
        const requests = [];
        for (const export_name in export_options) {
            if (export_options[export_name]) {
                requests.push(this.get_player_list(export_name));
            }
            else {
                requests.push([export_name, []]);
            }
        }
        const responses = await Promise.all(requests);
        const result = Object.fromEntries(responses);
        this.logger.exit(result);
        return <ExportInfo>result;
    }

    private async get_player_list(export_option: string) {
        this.logger.entry(arguments);
        const document = await this.tribalwars.fetchDocument("GET", "ally", { mode: export_option });
        const option_nodes = [...document.querySelectorAll("select option")];
        if (option_nodes.length === 0) { throw new ScriptResult(Resources.ERROR.BOT_CHECK); }
        const options = option_nodes.map((option: HTMLOptionElement) => {
            const access_granted = !option.disabled;
            const player_id = option.value;
            let player_name = option.label;
            if (player_name.endsWith(Resources.PLAYER_NO_ACCESS)) {
                player_name = player_name.slice(0, player_name.length - Resources.PLAYER_NO_ACCESS.length).trim();
            }
            return { player_id, player_name, access_granted };
        });
        this.ally_name = document.querySelector("h2").innerText;
        const result = [export_option, options.slice(1)];
        this.logger.exit(result);
        return result;
    }

    private async fetch_document(input: TaskData): Promise<VillageData[]> {
        const url = this.tribalwars.buildURL("GET", "ally", { mode: input.mode, player_id: input.player_id });
        const response = await fetch(url, { redirect: "manual" });
        if (response.type === "opaqueredirect") { return []; }
        if (response.status === 200) {
            const text = await response.text();
            const body = this.document.createElement("body");
            body.innerHTML = text;
            if (document.querySelector("#content_value").childElementCount === 0) { throw new ScriptResult(Resources.ERROR.BOT_CHECK); }
            const table = <HTMLTableElement>body.querySelector("#ally_content table.vis.w100");
            if (table == null) { return []; }

            if (input.mode === "members_troops") {
                return await this.map_members_troops(table);
            }
            if (input.mode === "members_buildings") {
                return await this.map_members_buildings(table);
            }
            if (input.mode === "members_defense") {
                return await this.map_members_defense(table);
            }
        }
        return null;
    }

    private async fetch_data(export_info: ExportInfo) {
        const players_data: PlayerData = {};

        const tasks: Task<TaskData, VillageData[]>[] = [];

        for (const member_info of export_info.members_buildings) {
            if (member_info.access_granted) {
                tasks.push({
                    input: { player_id: member_info.player_id, mode: "members_buildings" },
                    activator: this.fetch_document.bind(this),
                });
            }
        }

        for (const member_info of export_info.members_defense) {
            if (member_info.access_granted) {
                tasks.push({
                    input: { player_id: member_info.player_id, mode: "members_defense" },
                    activator: this.fetch_document.bind(this),
                });
            }
        }

        for (const member_info of export_info.members_troops) {
            if (member_info.access_granted) {
                tasks.push({
                    input: { player_id: member_info.player_id, mode: "members_troops" },
                    activator: this.fetch_document.bind(this),
                });
            }
        }

        const throttler = new Throttler(4);

        const responses = await throttler.await_all(tasks, (pending_tasks: number, total_tasks: number) => {
            this.print_progress(Resources.PROGRESS.PLAYER_TROOPS
                .replace("{0}", (total_tasks - pending_tasks).toString())
                .replace("{1}", total_tasks.toString())
            );
        });

        for (let i = 0; i < tasks.length; i++) {
            const response = responses[i];
            const input = tasks[i].input;
            if (players_data[input.player_id] === undefined) {
                players_data[input.player_id] = {};
            }
            players_data[input.player_id][input.mode] = response;
        }
        this.logger.log(responses);
        this.logger.log(players_data);
        return players_data;
    }

    private async map_members_troops(table: HTMLTableElement): Promise<VillageData[]> {
        this.logger.entry();
        const village_data: VillageData[] = [];
        const commands_info = { "incoming": -1, "outgoing": -1 };

        for (let i = this.game_data.units.length + 1; i < table.rows[0].cells.length; i++) {
            switch ((<HTMLImageElement>table.rows[0].cells[i].children[0]).src.split("/").pop()) {
                case "commands_outgoing.png":
                    commands_info["outgoing"] = i;
                    break;
                case "att.png":
                    commands_info["incoming"] = i;
                    break;
            }
        }

        for (let i = 1; i < table.rows.length; i++) {
            const row_data: VillageData = {
                units: {},
                coords: null,
                village_name: null,
                outgoing: null,
                incoming: null
            };
            const row = table.rows[i];

            row_data.coords = row.cells[0].innerText.match(/\d+\|\d+/).pop();
            row_data.village_name = row.cells[0].innerText.trim();

            for (let j = 0; j < this.game_data.units.length; j++) {
                row_data.units[this.game_data.units[j]] = row.cells[j + 1].innerText.trim() === "?"
                    ? null
                    : Number(row.cells[j + 1].innerText);
            }

            row_data.outgoing = commands_info["outgoing"] === -1
                ? null
                : Number(row.cells[commands_info["outgoing"]].innerText);
            row_data.incoming = commands_info["incoming"] === -1
                ? null
                : Number(row.cells[commands_info["incoming"]].innerText);
            village_data.push(row_data);
        }
        this.logger.exit(village_data);
        return village_data;
    }

    private async map_members_buildings(table: HTMLTableElement): Promise<VillageData[]> {
        this.logger.entry();
        const village_data: VillageData[] = [];
        const building_info = {};
        for (let i = 2; i < table.rows[0].cells.length; i++) {
            building_info[i] = (<HTMLImageElement>table.rows[0].cells[i].children[0]).src.split("/").pop().split(".png")[0];
        }

        if (!this.building_names) {
            this.building_names = Object.values(building_info);
        }

        for (let i = 1; i < table.rows.length; i++) {
            const row_data = { buildings: {}, village_name: null, coords: null, points: null };
            const row = table.rows[i];

            row_data.village_name = row.cells[0].innerText.trim();
            row_data.coords = row.cells[0].innerText.match(/\d+\|\d+/).pop();
            row_data.points = Number(row.cells[1].innerText.replace(".", ""));

            for (const building_index in building_info) {
                row_data.buildings[building_info[building_index]] = Number(row.cells[building_index].innerText);
            }

            village_data.push(row_data);
        }
        this.logger.exit(village_data);
        return village_data;
    }

    private async map_members_defense(table: HTMLTableElement): Promise<VillageData[]> {
        this.logger.entry();
        const village_data = [];
        const has_incomings = table.rows[0].cells.length > (this.game_data.units.length + 2);

        for (let i = 1; i < table.rows.length; i += 2) {
            const row_data: VillageData = { coords: null, village_name: null };
            const row_1 = table.rows[i];
            const row_2 = table.rows[i + 1];

            row_data.village_name = row_1.cells[0].innerText.trim();
            row_data.coords = row_1.cells[0].innerText.match(/\d+\|\d+/).pop();

            row_data.incoming = has_incomings
                ? Number(row_1.cells[this.game_data.units.length + 2].innerText)
                : null;

            row_data.village = {};
            row_data.transit = {};
            for (let j = 0; j < this.game_data.units.length; j++) {
                row_data.village[this.game_data.units[j]] = row_1.cells[j + 2].innerText.trim() === "?"
                    ? null
                    : Number(row_1.cells[j + 2].innerText);
                row_data.transit[this.game_data.units[j]] = row_2.cells[j + 1].innerText.trim() === "?"
                    ? null
                    : Number(row_2.cells[j + 1].innerText);
            }
            village_data.push(row_data);
        }
        this.logger.exit(village_data);
        return village_data;
    }

    private merge_member_data(player_data: PlayerData, export_options: ExportOptions): MembersData {
        this.logger.entry("player_data", player_data, "export_options", export_options);
        const members_data = {};
        for (const player_id in player_data) {
            const response_data = player_data[player_id];
            const member_data = {};
            for (const export_name in export_options) {
                if (!export_options[export_name]) {
                    continue;
                }
                const villages = response_data[export_name];
                for (const village of villages) {
                    if (village.coords in member_data) {
                        Object.assign(member_data[village.coords], village);
                    }
                    else {
                        member_data[village.coords] = JSON.parse(JSON.stringify(village));
                    }
                }
            }
            members_data[player_id] = member_data;
        }
        this.logger.exit(members_data);
        return members_data;
    }

    private print_progress(message: string) {
        this.ui.get_control("status").innerText = message;
    }

    private get_export_options(): ExportOptions {
        this.logger.entry();
        const result = {};
        for (const export_option of export_option_names) {
            result[export_option] = this.ui.get_control<HTMLInputElement>(export_option).checked;
        }
        this.logger.exit(result);
        return <ExportOptions>result;
    }

    private merge_member_metadata(export_info: ExportInfo, export_options: ExportOptions) {
        const members_info = {};

        for (const export_name of export_option_names) {
            if (!export_options[export_name]) { continue; }
            const members_list = export_info[export_name];
            for (const member of members_list) {
                if (!(member.player_id in members_info)) {
                    const member_info = {
                        player_id: member.player_id,
                        player_name: member.player_name,
                        access_granted: {}
                    };
                    for (const export_name of export_option_names) {
                        member_info.access_granted[export_name] = false;
                    }
                    members_info[member.player_id] = member_info;
                }
                members_info[member.player_id].access_granted[export_name] = member.access_granted;
            }
        }

        return members_info;
    }

    private generate_table_header(export_options: ExportOptions) {
        const header = ["player_name", "village_name", "coords"];

        if (export_options["members_troops"] || export_options["members_defense"]) {
            header.push("incoming");
        }

        if (export_options["members_troops"]) {
            header.push("outgoing");
            header.push(...this.game_data.units);
        }

        if (export_options["members_buildings"]) {
            header.push("points", ...this.building_names);
        }

        if (export_options["members_defense"]) {
            header.push(...this.game_data.units.map(unit_name => "village_" + unit_name));
            header.push(...this.game_data.units.map(unit_name => "transit_" + unit_name));
        }

        return header;
    }

    private generate_table(export_info: ExportInfo, members_data: MembersData, export_options: ExportOptions) {
        this.print_progress(Resources.PROGRESS.TABLE);

        const header = this.generate_table_header(export_options);
        const members_info = this.merge_member_metadata(export_info, export_options);

        const table = [header.join(",")];

        const skipped_players: SkippedPlayer[] = [];

        for (const player_id in members_info) {
            const member_metadata_info = members_info[player_id];
            const member_data = members_data[player_id];

            if (!export_option_names
                .filter(export_option_name => export_options[export_option_name])
                .map(export_name => member_metadata_info.access_granted[export_name])
                .reduce((pv, cv) => cv || pv, false)) {
                skipped_players.push({
                    player_name: member_metadata_info.player_name,
                    reason: Resources.ERROR.NO_PERMISSIONS
                });
                continue;
            }

            if (Object.keys(member_data).length === 0) {
                skipped_players.push({
                    player_name: member_metadata_info.player_name,
                    reason: Resources.ERROR.NO_VILLAGES
                });
                continue;
            }

            for (const village_coords in member_data) {
                const row = [];
                const village_data = member_data[village_coords];
                row.push(`"${member_metadata_info.player_name}"`, `"${village_data.village_name}"`, village_data.coords);
                if (export_options["members_troops"] || export_options["members_defense"]) {
                    row.push(village_data.incoming !== null
                        ? village_data.incoming
                        : ""
                    );
                }
                if (export_options["members_troops"]) {
                    row.push(village_data.outgoing !== null
                        ? village_data.outgoing
                        : ""
                    );
                    if (member_metadata_info.access_granted["members_troops"]) {
                        for (const unit_name of this.game_data.units) {
                            row.push(village_data.units[unit_name] !== null
                                ? village_data.units[unit_name]
                                : ""
                            );
                        }
                    } else {
                        row.push(...new Array(this.game_data.units.length).fill(""));
                    }
                }
                if (export_options["members_buildings"]) {
                    if (member_metadata_info.access_granted["members_buildings"]) {
                        row.push(village_data.points);
                        for (const building_name of this.building_names) {
                            row.push(village_data.buildings[building_name]);
                        }
                    } else {
                        row.push("");
                        row.push(...new Array(this.building_names.length).fill(""));
                    }
                }
                if (export_options["members_defense"]) {
                    if (member_metadata_info.access_granted["members_defense"]) {
                        for (const troops_type of ["village", "transit"]) {
                            for (const unit_name of this.game_data.units) {
                                row.push(village_data[troops_type][unit_name] !== null
                                    ? village_data[troops_type][unit_name]
                                    : ""
                                );
                            }
                        }
                    } else {
                        row.push(...new Array(2 * this.game_data.units.length).fill(""));
                    }
                }
                table.push(row.join(","));
            }
        }
        return [table, skipped_players];
    }

    private save_as_file(content: string) {
        const a = <HTMLAnchorElement>this.document.createElement("a");
        const timestamp = (new Date())
            .toISOString()
            .replace("T", "_")
            .replace(":", "-")
            .slice(0, 16);
        a.download = `${this.ally_name}_${timestamp}.csv`;
        a.href = window.URL.createObjectURL(new Blob([content], { type: "text/csv" }));
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}
