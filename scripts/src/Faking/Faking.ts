import { Logger, LoggerFactory } from "../inf/Logger";
import { IMapFiles, WorldInfo, WorldInfoType } from "../inf/MapFiles";
import { two_digit_number } from "../inf/Helper";

// import { Settings } from "./Faking.settings";
import { Resources } from "./Faking.resources";
import { IDocument } from "../inf/Document";
import { ITribalWars, GameData } from "../inf/TribalWars";
import { TroopsSelector } from "./Faking.troops";
import { Target, TargetSelector } from "./Faking.targets";
import { IDataProvider } from "../inf/DataProvider";
import { SettingsProvider } from "./Faking.settings";
import { ScriptResult } from "../inf/Bootstrap";


export interface Troops {
    spear?: number,
    sword?: number,
    axe?: number,
    archer?: number,
    spy?: number,
    light?: number,
    marcher?: number,
    heavy?: number,
    ram?: number,
    catapult?: number,
    knight?: number,
    snob?: number,
}

export interface FakingResult {
    target: Target,
    troops: Troops,
}

export interface BoundaryCircle {
    r: number;
    x: number;
    y: number;
}

export interface BoundaryBox {
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
}

export type DateRangePart = [number, number, number, number, number];
export type DateRange = [DateRangePart, DateRangePart];
export type BlockingLocal = {
    time_s: number,
    count: number,
    block_players: boolean,
    scope?: string
};
export type BlockingGlobal = {
    time_s: number,
    count: number,
    block_players: boolean,
    name: string
};

export interface FakingSettings {
    safeguard: Troops,
    troops_templates: Troops[],
    fill_exact: boolean,             // TODO: change to fill_all (?)

    fill_troops: string, //'spear,sword,axe,archer,spy,light,marcher,heavy,ram,catapult',

    coords: string,
    players: string,
    player_ids: string,
    allies: string,
    ally_tags: string,
    ally_ids: string,

    include_barbarians: boolean,
    boundaries_circle: BoundaryCircle[],
    boundaries_box: BoundaryBox[],

    blocking_enabled: boolean,
    blocking_local: BlockingLocal,
    blocking_global: BlockingGlobal[],

    skip_night_bonus: boolean,
    date_ranges: DateRange[],

    changing_village_enabled: boolean,
}

export class Faking {
    private namespace: string;
    private map_files: IMapFiles;
    private document: IDocument;
    private tribalwars: ITribalWars;

    private logger: Logger;
    private game_data: GameData;
    private data_provider: IDataProvider;

    constructor(
        namespace: string,
        data_provider: IDataProvider,
        map_files: IMapFiles,
        document: IDocument,
        tribalwars: ITribalWars,
    ) {
        this.namespace = namespace;
        this.data_provider = data_provider;
        this.map_files = map_files;
        this.document = document;
        this.tribalwars = tribalwars;
        this.game_data = tribalwars.getGameData();
        LoggerFactory.create_instance(namespace, (logger) => this.logger = logger);
    }

    public async main(user_configuration): Promise<string> {
        this.check_screen();
        const settings = await this.get_settings(user_configuration);
        const world_info = await this.map_files.get_world_info([WorldInfoType.config, WorldInfoType.unit_info]);
        let troops: Troops = null;
        let target: Target = null;
        try {
            troops = this.get_troops(world_info, settings);
            target = await this.get_target(world_info, settings, troops);
        } catch (ex) {
            if (settings.changing_village_enabled && ex instanceof ScriptResult) {
                const anchor: HTMLAnchorElement = this.document.querySelector("#village_switch_right");
                if (anchor) {
                    ex.href = anchor.href;
                }
            }
            throw ex;
        }
        return this.input_data(troops, target);
    }

    private check_screen() {
        const jump_link: HTMLAnchorElement = this.document.querySelector(".jump_link");
        if (jump_link) {
            throw new ScriptResult(Resources.ERROR_SCREEN_VILLAGE_OUT_OF_GROUP, jump_link.href);
        }
        if (this.game_data.screen !== "place" || !this.document.querySelector("#command-data-form")) {
            const place_href = this.tribalwars.buildURL("GET", "place", { "mode": "command" });
            throw new ScriptResult(Resources.ERROR_SCREEN_REDIRECT, place_href);
        }
        // disable executing script on screen with command confirmation
        if (this.document.querySelector("#troop_confirm_go") ||
            this.document.querySelector("#troop_confirm_submit")) {
            throw new ScriptResult(Resources.ERROR_SCREEN_NO_ACTION);
        }
    }

    private async get_settings(user_configuration: object) {
        const settings_provider = new SettingsProvider(this.tribalwars, this.map_files);
        return await settings_provider.get_settings(user_configuration);
    }

    private get_troops(world_info: WorldInfo, settings: FakingSettings) {
        const troops_selector = new TroopsSelector(
            this.document,
            world_info,
            this.game_data,
            settings,
        );

        return troops_selector.select_troops();
    }

    private async get_target(world_info: WorldInfo, settings: FakingSettings, troops: Troops): Promise<Target> {
        const target_selector = new TargetSelector(
            world_info,
            this.map_files,
            this.data_provider,
            this.game_data,
            settings
        );

        return await target_selector.select_target(troops);
    }

    private input_data(troops: Troops, target: Target) {
        this.logger.entry(arguments);

        for (const unit in troops) {
            (<HTMLInputElement>this.document.querySelector(`#unit_input_${unit}`)).value = troops[unit] > 0
                ? troops[unit]
                : "";
        }

        const target_input: HTMLInputElement = this.document.querySelector(".target-input-field");

        if (target_input) {
            target_input.value = `${target.x}|${target.y}`;
        }
        else {
            (<HTMLInputElement>this.document.querySelector("#inputx")).value = `${target.x}`;
            (<HTMLInputElement>this.document.querySelector("#inputy")).value = `${target.y}`;
        }

        let player_info = "";
        if (target.player_name) {
            player_info += target.player_name;
        }
        if (target.ally_tag) {
            player_info += ` [${target.ally_tag}]`;
        }

        const notification = Resources.ATTACK_TIME
            .replace("__DAY__", two_digit_number(target.arrival_date.getDate()))
            .replace("__MONTH__", two_digit_number(target.arrival_date.getMonth() + 1))
            .replace("__HOURS__", two_digit_number(target.arrival_date.getHours()))
            .replace("__MINUTES__", two_digit_number(target.arrival_date.getMinutes()))
            .replace("__PLAYER_INFO__", player_info)
            .replace("__TARGET__", `${target.x}|${target.y}`);

        this.logger.exit(notification);

        return notification;
    }
}

