import { Bootstrap, ScriptResult } from "../inf/Bootstrap";
import { IDocument } from "../inf/Document";
import { GameData, ITribalWars } from "../inf/TribalWars";
import { Resources } from "./PlaceWithdrawUnits.resources";

interface WithdrawPayload {
    unit_id: string;
    unit_count: number;
    away_id: string;
    village_id: string
}

export class PlaceWithdrawUnits {
    private document: IDocument;
    private game_data: GameData;
    private tribalwars: ITribalWars;
    private namespace: string;
    private cell_handler: (event: Event) => void;

    constructor(
        namespace: string,
        document: IDocument,
        tribalwarsProvider: ITribalWars,
    ) {
        this.namespace = namespace;
        this.document = document;
        this.tribalwars = tribalwarsProvider;
        this.game_data = tribalwarsProvider.getGameData();
        this.cell_handler = this.handler.bind(this);
    }

    public async main(): Promise<string> {
        if (this.game_data.screen !== "place" || this.game_data.mode !== "units") {
            const place_href = this.tribalwars.buildURL("GET", "place", { "mode": "units" });
            throw new ScriptResult(Resources.SCREEN_REDIRECT, place_href);
        }

        const defense_attached = this.scan_defense_table();
        const support_attached = this.scan_support_table();

        if (defense_attached || support_attached) {
            return Resources.ATTACHED;
        }

        throw new ScriptResult(Resources.NO_OWN_TROOPS);
    }

    private scan_defense_table(): boolean {
        const defense: HTMLTableElement = this.document.querySelector("form[action*=\"command_other\"] > table");

        if (defense == null) {
            return false;
        }

        let attached = false;

        for (let i = 2; i < defense.rows.length - 2; i++) {
            const row = defense.rows[i];
            const player_id = row.querySelector("[data-player]").getAttribute("data-player");
            const village_id = row.querySelector("[data-id]").getAttribute("data-id");
            const away_id = row.querySelector("input[name^=\"id_\"").getAttribute("name").substring(3);

            if (player_id != this.game_data.player.id.toString()) {
                continue;
            }

            for (let j = 0; j < this.game_data.units.length; j++) {
                const cell = row.cells[j + 3];

                const payload: WithdrawPayload = {
                    unit_id: this.game_data.units[j],
                    unit_count: Number(cell.innerText),
                    away_id,
                    village_id: village_id
                };

                if (this.add_handler(cell, payload)) {
                    attached = true;
                }
            }
        }

        return attached;
    }

    private scan_support_table(): boolean {
        const support: HTMLTableElement = this.document.querySelector("form[action*=\"withdraw_selected_unit_counts\"] > table");

        if (support == null) {
            return false;
        }

        for (let i = 1; i < support.rows.length - 1; i++) {
            const row = support.rows[i];
            const away_id = row.querySelector("[data-away-id]").getAttribute("data-away-id");

            for (let j = 0; j < row.cells.length; j++) {
                const cell = row.cells[j];
                const payload: WithdrawPayload = {
                    unit_id: cell.getAttribute("id"),
                    unit_count: Number(cell.innerText),
                    away_id,
                    village_id: this.game_data.village.id.toString()
                };
                this.add_handler(cell, payload);
            }
        }

        return true;
    }

    private add_handler(cell: HTMLTableCellElement, payload: WithdrawPayload): boolean {
        if (payload.unit_id && payload.unit_count != 0) {
            cell.style.cursor = "pointer";
            cell.style.textDecoration = "underline";
            cell.dataset[this.namespace] = JSON.stringify(payload);
            cell.addEventListener("click", this.cell_handler);
            return true;
        }
        return false;
    }

    private async handler(event: Event) {
        try {
            const cell = <HTMLTableCellElement>event.target;
            cell.removeEventListener("click", this.cell_handler);

            const payload: WithdrawPayload = JSON.parse(cell.dataset[this.namespace]);

            const endpoint = this.tribalwars.buildURL("POST", "place", {
                action: "withdraw_selected_unit_counts",
                mode: "units",
                village: payload.village_id,
                h: this.game_data.csrf
            });

            await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: encodeURI(`withdraw_unit[${payload.away_id}][${payload.unit_id}]=${payload.unit_count}`)
            });

            cell.style.cursor = null;
            cell.style.textDecoration = null;
            cell.innerText = "0";
            cell.classList.add("hidden");
        }
        catch (ex) {
            Bootstrap.handle_error(ex, Resources.FORUM_THREAD_HREF);
        }
    }
}
