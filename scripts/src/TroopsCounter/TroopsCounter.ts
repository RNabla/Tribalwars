import { Logger, LoggerFactory } from "../inf/Logger";
import { Bootstrap } from "../inf/Bootstrap";
import { GameData, ITribalWars } from "../inf/TribalWars";
import { NodeDef, SelectOptions } from "../inf/IUI";
import { IUI } from "../inf/IUI";
import { Resources } from "./TroopsCounter.resources";

interface GroupMenuResponse {
    result: [{
        type: string;
        name: string;
        group_id: string;
    }],
    group_id: string;
}

interface UnitsTableSummary {
    own: number[]
    in_village: number[]
    outwards: number[]
    in_transit: number[]
}

interface UnitsSummary {
    own: number[]
    in_village: number[]
    outwards: number[]
    in_transit: number[]
    defense: number[]
    total_own: number[]
    villages_count: number
}

export class TroopsCounter {
    private logger: Logger;
    private game_data: GameData;
    private tribalwars: ITribalWars;
    private ui: IUI;
    private units: Map<string, UnitsSummary> = new Map<string, UnitsSummary>();

    constructor(
        namespace: string,
        tribalwarsProvider: ITribalWars,
        ui: IUI
    ) {
        this.tribalwars = tribalwarsProvider;
        this.game_data = tribalwarsProvider.getGameData();
        this.ui = ui;
        LoggerFactory.create_instance(namespace, (logger) => this.logger = logger);
    }

    public async main(): Promise<string> {
        this.logger.entry();
        await this.create_gui();
        this.init_gui();
        this.logger.exit();
        return null;
    }

    private count_units_in_row(row: HTMLTableRowElement, start: number): number[] {
        const units = [];
        for (let i = 0; i < this.game_data.units.length; i++) {
            units.push(Number(row.cells[i + start].innerText.match(/\d+/).pop()));
        }
        return units;
    }

    private add_rows(row1: number[], row2: number[]): number[] {
        const result = Array(this.game_data.units.length).fill(0);
        for (let j = 0; j < this.game_data.units.length; j++) {
            result[j] = row1[j] + row2[j];
        }
        return result;
    }

    private subtract_rows(row1: number[], row2: number[]): number[] {
        const result = Array(this.game_data.units.length).fill(0);
        for (let j = 0; j < this.game_data.units.length; j++) {
            result[j] = row1[j] - row2[j];
        }
        return result;
    }

    private sum_rows(rows: UnitsTableSummary[], type: keyof UnitsTableSummary): number[] {
        const sum = Array(this.game_data.units.length).fill(0);
        for (let i = 0; i < rows.length; i++) {
            for (let j = 0; j < this.game_data.units.length; j++) {
                sum[j] += rows[i][type][j];
            }
        }
        return sum;
    }

    private async fetch_units(group_id: string): Promise<UnitsSummary> {
        this.logger.entry(arguments);
        if (this.units.has(group_id)) {
            this.logger.exit("Returning result from the cache");
            return this.units.get(group_id);
        }

        const document = await this.tribalwars.fetchDocument("GET", "overview_villages", { mode: "units", group: group_id, page: -1 });
        const units_table: HTMLTableElement = document.querySelector("#units_table");
        const rows = [];
        if (units_table !== null) {
            for (let i = 1; i < units_table.rows.length; i += 5) {
                rows.push({
                    own: this.count_units_in_row(units_table.rows[i + 0], 2),
                    in_village: this.count_units_in_row(units_table.rows[i + 1], 1),
                    outwards: this.count_units_in_row(units_table.rows[i + 2], 1),
                    in_transit: this.count_units_in_row(units_table.rows[i + 3], 1),
                });
            }
        }
        const own = this.sum_rows(rows, "own");
        const in_village = this.sum_rows(rows, "in_village");
        const outwards = this.sum_rows(rows, "outwards");
        const in_transit = this.sum_rows(rows, "in_transit");
        const defense = this.subtract_rows(in_village, own);
        const total_own = this.add_rows(this.add_rows(own, outwards), in_transit);
        const result = { own, in_transit, in_village, outwards, defense, total_own, villages_count: rows.length };
        this.units.set(group_id, result);
        this.logger.exit(result);
        return result;
    }

    private init_gui() {
        this.ui.get_control("group").dispatchEvent(new Event("change"));
    }

    private async export() {
        this.logger.entry();
        const group = (<HTMLInputElement>this.ui.get_control("group")).value;
        const type = (<HTMLInputElement>this.ui.get_control("type")).value;
        const units = await this.fetch_units(group);
        const clipboard_text = [
            `[b]${Resources.UI["group"].label}[/b] ${this.ui.get_selected_label("group")}`,
            `[b]${Resources.UI["type"].label}[/b] ${this.ui.get_selected_label("type")}`
            , ...units[type]
                .map((x: number, i: number) => `[unit]${this.game_data.units[i]}[/unit]${x}`)
                .filter((x: string) => x.indexOf("militia") === -1)
        ].join(" ");
        prompt("CTRL + C", clipboard_text);
        this.logger.exit();
    }

    private async handler_on_change() {
        try {
            const group = (<HTMLInputElement>this.ui.get_control("group")).value;
            const type = (<HTMLInputElement>this.ui.get_control("type")).value;
            this.toggle_ui(true);
            this.update_results(Array(this.game_data.units.length).fill(0), 0);
            const units = await this.fetch_units(group);
            this.update_results(units[type], units.villages_count);
            this.toggle_ui(false);
        }
        catch (ex) {
            Bootstrap.handle_error(ex, Resources.FORUM_THREAD_HREF);
        }
    }

    private toggle_ui(disable: boolean) {
        (<HTMLInputElement>this.ui.get_control("group")).disabled = disable;
        (<HTMLInputElement>this.ui.get_control("type")).disabled = disable;
        (<HTMLInputElement>this.ui.get_control("export")).disabled = disable;
        this.ui.get_control("results").style.opacity = disable ? "0.5" : "1.0";
    }


    private update_results(units: number[], village_count: number) {
        for (let i = 0; i < this.game_data.units.length; i++) {
            if (this.game_data.units[i] !== "militia") {
                this.ui.get_control(this.game_data.units[i]).textContent = units[i].toString();
            }
        }
        this.ui.get_control("village_count").textContent = Resources.CONTENT.VILLAGES_COUNT.replace("{0}", village_count.toString());
    }

    private async fetch_groups(): Promise<SelectOptions> {
        this.logger.entry();
        const response = await this.tribalwars.fetchJSON<GroupMenuResponse>("GET", "groups", { mode: "overview", ajax: "load_group_menu" });
        const result = {
            options: response.result
                .filter(x => x.type !== "separator")
                .map(x => ({ label: x.name, value: x.group_id })),
            selected_value: response.group_id
        };
        this.logger.exit();
        return result;
    }

    private async create_gui() {
        const groups = await this.fetch_groups();
        const panel_def: NodeDef[] = [
            {
                type: "table",
                styles: { width: "100%" },
                childs: [{
                    type: "thead",
                    childs: [
                        this.create_header_row("group", groups),
                        this.create_header_row("type", ["own", "defense", "in_village", "outwards", "in_transit", "total_own"])
                    ]
                },
                {
                    type: "tbody", childs: [
                        this.create_body_row()
                    ]
                },
                {
                    type: "tfoot",
                    childs: [{
                        type: "tr", childs: [{
                            type: "th", attributes: { colspan: "2" }, childs: [{
                                type: "div", id: "summary", styles: { display: "flex", "justify-content": "space-between", "align-items": "center" }, childs: [
                                    { type: "span", id: "village_count", text: Resources.CONTENT.VILLAGES_COUNT },
                                    { type: "button", id: "export", handlers: { click: this.export.bind(this) } }
                                ]
                            }]
                        }]
                    }]
                }]
            }
        ];
        this.ui.create_dialog(panel_def, {
            forum_thread_href: Resources.FORUM_THREAD_HREF,
            header_name: Resources.SCRIPT_HEADER
        });
    }

    private create_header_row(control_id: string, options: string[] | SelectOptions): NodeDef {
        return {
            type: "tr", childs: [
                { type: "th", styles: { width: "50%" }, childs: [{ type: "label", attributes: { for: control_id }, styles: { width: "100%", display: "block" } }] },
                { type: "th", childs: [{ type: "select", id: control_id, options: options, handlers: { change: this.handler_on_change.bind(this) }, styles: { width: "100%" } }] }
            ]
        };
    }

    private create_unit_cell(unit_name: string): NodeDef {
        return {
            type: "div", styles: { flex: "0 0 50%", "max-width": "50%" },
            childs: [
                { type: "img", attributes: { src: `unit/unit_${unit_name}.png`, alt: unit_name, title: unit_name } },
                { type: "span", id: unit_name, text: "0" },
            ]
        };
    }

    private create_body_row(): NodeDef {
        const units = this.game_data.units
            .filter(x => x !== "militia")
            .map(this.create_unit_cell);

        return {
            type: "tr", childs: [{
                type: "td", attributes: { colspan: "2" },
                childs: [{ type: "div", id: "results", styles: { display: "flex", "flex-wrap": "wrap" }, childs: units }]
            }]
        };
    }
}
