import { Logger, LoggerFactory } from "../inf/Logger";
import { Bootstrap, ScriptResult } from "../inf/Bootstrap";
import { IDocument } from "../inf/Document";
import { GameData, ITribalWars } from "../inf/TribalWars";
import { ITWMap, Color, ITWMapProvider, TWMapVillage, TWMapVillageGhostVillageImg } from "../inf/ITWMap";
import { ControlOption } from "../inf/IUI";
import { IUI } from "../inf/IUI";
import { Resources } from "./XY.resources";

enum VillageCategory {
    None = 0,
    Partner = 1,
    NAP = 2,
    Enemy = 4,
    Own = 8,
    Friend = 16,
    NonAttackable = 32,
    Barbarian = 64,
    Bonus = 128,
    Other = 256,
}

export class XY {
    private document: IDocument;
    private logger: Logger;
    private game_data: GameData;
    private map: ITWMap;
    private tribalwars: ITribalWars;
    private ui: IUI;
    private map_handler_onclick_old_handler: (x: number, y: number, event: Event) => boolean;
    private village_colors: { [key: string]: Color; };
    private captured_villages: Set<number> = new Set<number>();
    private created_canvases: Map<number, HTMLCanvasElement> = new Map<number, HTMLCanvasElement>();
    private color: Color = [254, 254, 254];
    private colors_to_restore: Map<string, Color> = new Map<string, Color>();

    constructor(
        namespace: string,
        document: IDocument,
        tribalwarsProvider: ITribalWars,
        mapProvider: ITWMapProvider,
        ui: IUI
    ) {
        this.document = document;
        this.tribalwars = tribalwarsProvider;
        this.game_data = tribalwarsProvider.getGameData();
        this.map = mapProvider.get();
        this.ui = ui;
        LoggerFactory.create_instance(namespace, (logger) => this.logger = logger);
    }

    public async main(): Promise<string> {
        this.check_screen();
        if (this.ui.get_control()) {
            this.logger.log("Instance of script is already running");
            this.ui.get_control("end").click();
            return;
        }
        this.override_handlers();
        this.create_gui();
        this.village_colors = this.map.villageColors;
        return null;
    }

    private check_screen() {
        if (!this.map) {
            const map_href = this.tribalwars.buildURL("GET", "map");
            throw new ScriptResult(Resources.ERRORS.SCREEN_REDIRECT, map_href);
        }
    }

    private create_gui() {
        this.logger.entry();

        const options: ControlOption[] = [
            { inputs: [{ type: 'checkbox', id: 'include_partners' }], styles: { width: '100px' } },
            { inputs: [{ type: 'checkbox', id: 'include_naps' }], styles: { width: '100px' } },
            { inputs: [{ type: 'checkbox', id: 'include_enemies', checked: true }], styles: { width: '100px' } },
            { inputs: [{ type: 'checkbox', id: 'include_own' }], styles: { width: '100px' } },
            { inputs: [{ type: 'checkbox', id: 'include_friends' }], styles: { width: '100px' } },
            { inputs: [{ type: 'checkbox', id: 'include_non_attackable' }], styles: { width: '100px' } },
            { inputs: [{ type: 'checkbox', id: 'include_barbarians' }], styles: { width: '100px' } },
            { inputs: [{ type: 'checkbox', id: 'include_bonuses' }], styles: { width: '100px' } },
            { inputs: [{ type: 'checkbox', id: 'include_others', checked: true }], styles: { width: '100px' } },
            { inputs: [{ type: 'select', id: 'filter_type', options: ["union", "intersection"] }], styles: { width: '100px' } },
            {
                label: { type: "empty" },
                inputs: [
                    { type: 'button', id: 'scan', click: this.button_handler_scan.bind(this) },
                    { type: 'button', id: 'clear', click: this.button_handler_clear.bind(this) },
                    { type: 'button', id: 'end', click: this.button_handler_end.bind(this) }
                ]
            },
        ];

        const container = this.ui.create_container();
        container.append(this.ui.create_control_panel(options));
        container.append(this.ui.create_panel([{
            type: "div",
            id: "output",
            styles: {
                padding: "6px"
            },
        }], { height: '100px' }));
        container.append(this.ui.create_signature_panel(Resources.FORUM_THREAD_HREF));
        this.document.querySelector('#contentContainer').prepend(container);
        this.logger.exit();
    }


    private button_handler_scan() {
        try {
            this.logger.entry();
            this.scan_map();
            this.logger.exit();
        } catch (ex) {
            Bootstrap.handle_error(ex, Resources.FORUM_THREAD_HREF);
        }
    }

    private button_handler_clear() {
        try {
            this.logger.entry();
            this.restore_village_dots();
            this.refresh_results();
            this.logger.exit();
        } catch (ex) {
            Bootstrap.handle_error(ex, Resources.FORUM_THREAD_HREF);
        }
    }

    private button_handler_end() {
        try {
            this.logger.entry();
            this.restore_village_dots();
            this.restore_handlers();
            this.ui.get_control().remove();
            this.logger.exit();
        } catch (ex) {
            Bootstrap.handle_error(ex, Resources.FORUM_THREAD_HREF);
        }
    }

    private restore_village_dots() {
        this.logger.entry();
        for (const xy of this.captured_villages) {
            const village = this.map.villages[xy];
            const color_to_restore = this.colors_to_restore.get(village.id);
            if (color_to_restore === undefined) {
                delete this.village_colors[village.id];
            }
            else {
                this.village_colors[village.id] = color_to_restore;
            }
            this.color_on_demand(village, false);
        }
        for (const canvas of this.created_canvases.values()) {
            canvas.remove();
        }
        this.captured_villages.clear();
        this.created_canvases.clear();
        this.logger.exit();
    }

    private map_handler_onclick(x: number, y: number, event: Event): boolean {
        try {
            this.logger.entry(arguments);
            const village = this.map.villages[x * 1000 + y];
            if (village !== undefined) {
                this.logger.log("Handling", village);
                if (this.captured_villages.has(village.xy)) {
                    this.deselect_village(village);
                } else {
                    this.select_village(village);
                }
                this.refresh_results();
            }
            this.logger.exit();
        }
        catch (ex) {
            Bootstrap.handle_error(ex, Resources.FORUM_THREAD_HREF);
        }
        finally {
            return false;
        }
    }

    private select_village(village: TWMapVillage) {
        this.logger.entry();
        this.captured_villages.add(village.xy);
        this.colors_to_restore.set(village.id, this.village_colors[village.id]);
        this.village_colors[village.id] = this.color;
        this.color_on_demand(village, true);
        this.logger.exit();
    }

    private deselect_village(village: TWMapVillage) {
        this.logger.entry();
        this.captured_villages.delete(village.xy);
        const color_to_restore = this.colors_to_restore.get(village.id);
        if (color_to_restore === undefined) {
            delete this.village_colors[village.id];
        }
        else {
            this.village_colors[village.id] = color_to_restore;
        }
        if (this.created_canvases.has(village.xy)) {
            const canvas = this.created_canvases.get(village.xy);
            canvas.remove();
            this.created_canvases.delete(village.xy);
        }
        this.colors_to_restore.delete(village.id);
        this.color_on_demand(village, false);
        this.logger.exit();
    }

    private color_on_demand(village: TWMapVillage, create_if_not_exist: boolean) {
        this.logger.entry();
        const element = this.document.querySelector(`#map_village_${village.id}`);
        if (element == null) {
            this.logger.exit();
            return;
        }
        let canvas = element.previousSibling as HTMLCanvasElement;
        const dx = ~~(village.xy / 1000) % 5;
        const dy = village.xy % 5;
        if (canvas.nodeName != "CANVAS" && create_if_not_exist) {
            this.logger.log("Sibling is not a canvas. Creating new one.");
            canvas = <HTMLCanvasElement>this.document.createElement('canvas');
            canvas.style.position = 'absolute';
            canvas.style.left = `${dx * 53}px`;
            canvas.style.top = `${dy * 38}px`;
            canvas.width = 18;
            canvas.height = 18;
            canvas.style.zIndex = '4';
            canvas.style.marginTop = '0px';
            canvas.style.marginLeft = '0px';
            element.parentNode.insertBefore(canvas, element);
            this.logger.log("Canvas inserted before", canvas, element);
            this.created_canvases.set(village.xy, canvas);
        }

        if (canvas.nodeName == "CANVAS") {
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            const color = this.map.getColorByPlayer(village.owner as string, Number(village.ally_id), village.id);
            context.fillStyle = 'rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ')';
            context.strokeStyle = '#000000';
            context.beginPath();
            context.arc(5, 5, 3.3, 0, 2 * Math.PI, !1);
            context.fill();
            context.stroke();
            this.logger.exit();
        }
    }

    private override_handlers() {
        this.logger.entry();
        this.map_handler_onclick_old_handler = this.map.map.handler.onClick;
        this.map.map.handler.onClick = this.map_handler_onclick.bind(this);
        this.logger.exit();
    }

    private restore_handlers() {
        this.logger.entry();
        this.map.map.handler.onClick = this.map_handler_onclick_old_handler;
        this.logger.exit();
    }

    private refresh_results() {
        this.logger.entry();
        this.ui.get_control("output").innerText = [...this.captured_villages].map(x => `${~~(x / 1000)}|${x % 1000}`).join(" ");
        this.logger.exit();
    }

    private categorize_village(village: TWMapVillage) {
        let category = VillageCategory.None;

        if (village.owner == "0") {
            category |= VillageCategory.Barbarian;
            if (village.bonus_id != null) {
                category |= VillageCategory.Bonus;
            }
        }
        else {
            if (village.owner === this.game_data.player.id.toString()) {
                category |= VillageCategory.Own;
            }
            else {
                if (this.map.non_attackable_players.includes(village.owner)) {
                    category |= VillageCategory.NonAttackable;
                }

                if (this.map.friends[village.owner]) {
                    category |= VillageCategory.Friend;
                }

                if (village.ally_id != "0") {
                    const relation = this.map.allyRelations[village.ally_id];
                    switch (relation) {
                        case "partner": category |= VillageCategory.Partner; break;
                        case "nap": category |= VillageCategory.NAP; break;
                        case "enemy": category |= VillageCategory.Enemy; break;
                    }
                }
            }
        }

        if (category == VillageCategory.None) {
            category = VillageCategory.Other;
        }

        return category;
    }

    private build_filter_mask() {
        let filter_mask = VillageCategory.None;

        if ((<HTMLInputElement>this.ui.get_control("include_partners")).checked) {
            filter_mask |= VillageCategory.Partner;
        }
        if ((<HTMLInputElement>this.ui.get_control("include_naps")).checked) {
            filter_mask |= VillageCategory.NAP;
        }
        if ((<HTMLInputElement>this.ui.get_control("include_enemies")).checked) {
            filter_mask |= VillageCategory.Enemy;
        }
        if ((<HTMLInputElement>this.ui.get_control("include_friends")).checked) {
            filter_mask |= VillageCategory.Friend;
        }
        if ((<HTMLInputElement>this.ui.get_control("include_non_attackable")).checked) {
            filter_mask |= VillageCategory.NonAttackable;
        }
        if ((<HTMLInputElement>this.ui.get_control("include_own")).checked) {
            filter_mask |= VillageCategory.Own;
        }
        if ((<HTMLInputElement>this.ui.get_control("include_barbarians")).checked) {
            filter_mask |= VillageCategory.Barbarian;
        }
        if ((<HTMLInputElement>this.ui.get_control("include_bonuses")).checked) {
            filter_mask |= VillageCategory.Bonus;
        }
        if ((<HTMLInputElement>this.ui.get_control("include_others")).checked) {
            filter_mask |= VillageCategory.Other;
        }
        return filter_mask;
    }

    private accept_village(filter_type: string, filter_mask: VillageCategory, village_category: VillageCategory): boolean {
        if (filter_mask == VillageCategory.None) {
            return false;
        }

        if (filter_type === "intersection" && (village_category & filter_mask) == filter_mask) {
            this.logger.log("Village has all required categories");
            return true;
        }

        if (filter_type === "union" && (village_category & filter_mask) != VillageCategory.None) {
            this.logger.log("Village has at least one category");
            return true;
        }

        return false;
    }

    private get_map_villages(): TWMapVillage[] {
        this.logger.entry();
        const villages: TWMapVillage[] = [];
        const min_x = this.map.map.viewport[0];
        const min_y = this.map.map.viewport[1];
        const max_x = this.map.map.viewport[2];
        const max_y = this.map.map.viewport[3];
        for (let x = min_x; x <= max_x; x++) {
            for (let y = min_y; y <= max_y; y++) {
                const xy = `${x}${y}`;
                const village = this.map.villages[xy];
                if (village !== undefined && village.img != TWMapVillageGhostVillageImg) {
                    villages.push(village);
                }
            }
        }
        this.logger.exit(villages);
        return villages;
    }

    private scan_map() {
        this.logger.entry();
        const filter_mask = this.build_filter_mask();
        const filter_type = (<HTMLSelectElement>this.ui.get_control("filter_type")).value;

        this.logger.log("Filter mask", filter_mask);
        this.logger.log("Filter type", filter_type);

        if (filter_mask != VillageCategory.None) {
            const villages = this.get_map_villages();
            for (const village of villages) {
                this.logger.log("Inspecting village", village);

                const village_category = this.categorize_village(village);
                this.logger.log("Village category", village_category);

                if (this.accept_village(filter_type, filter_mask, village_category)) {
                    if (!this.captured_villages.has(village.xy)) {
                        this.logger.log("Selecting village");
                        this.select_village(village);
                    }
                }
            }
            this.refresh_results();
        }
        this.logger.exit();
    }
}
