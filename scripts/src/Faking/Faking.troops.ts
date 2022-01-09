import { Logger, LoggerFactory } from "../inf/Logger";
import { UnitInfo, WorldInfo } from "../inf/MapFiles";
import { Resources } from "./Faking.resources";
import { IDocument } from "../inf/Document";
import { GameData } from "../inf/TribalWars";
import { FakingSettings, Troops } from "./Faking";
import { ScriptResult } from "../inf/Bootstrap";

const LAYOUT_FILL_EXACT = { UNIT_NAME: 0, UNIT_COUNT_LIMIT: 1 };

export interface ITroopsSelector {
    select_troops(): Troops;
}

export class TroopsSelector implements ITroopsSelector {
    private logger: Logger;
    private document: IDocument;
    private settings: FakingSettings;
    private world_info: WorldInfo;
    private game_data: GameData;
    private selectable_unit_names: string[];

    constructor(
        document: IDocument,
        world_info: WorldInfo,
        game_data: GameData,
        settings: FakingSettings,
    ) {
        LoggerFactory.create_instance("Hermitowski.Faking.TroopsSelector", (logger) => { this.logger = logger; });
        this.document = document;
        this.settings = settings;
        this.world_info = world_info;
        this.game_data = game_data;
        this.selectable_unit_names = game_data.units.filter(unit => unit !== "militia");
    }

    public select_troops(): Troops {
        this.logger.entry(arguments);

        if (this.settings.troops_templates.length == 0) {
            throw new ScriptResult(Resources.ERROR_TROOPS_EMPTY);
        }

        const available_troops = this.get_available_troops();

        for (const base_troops of this.settings.troops_templates) {
            const troops = this.try_fill_troops(available_troops, base_troops);
            if (troops) {
                this.logger.log("Selecting", troops);
                this.logger.exit();
                return troops;
            }
        }

        throw new ScriptResult(Resources.ERROR_TROOPS_NOT_ENOUGH);
    }

    private try_fill_troops(available_troops: Troops, base_troops: Troops) {
        this.logger.entry(arguments);
        this.logger.log("Available troops", available_troops);
        this.logger.log("Base toops", base_troops);

        const troops: Troops = JSON.parse(JSON.stringify(base_troops));

        for (const unit_name in troops) {
            if (available_troops[unit_name] < troops[unit_name]) {
                this.logger.log("Skipping troops. Required ", unit_name, ":", troops[unit_name], " got only", available_troops[unit_name]);
                this.logger.exit();
                return null;
            }
        }

        console.log(this.world_info.config);
        const fake_limit = Number(this.world_info.config.game.fake_limit);

        if (fake_limit == 0) {
            this.logger.log("There is no fake limit");
            this.logger.exit();
            return troops;
        }

        if (troops.spy == 5 && Object.keys(troops).filter(unit_name => unit_name !== "spy").every(unit_name => troops[unit_name] == 0)) {
            this.logger.log("Special case. Only 5 spies");
            this.logger.exit();
            return troops;
        }

        const population_required = Math.floor(this.game_data.village.points * fake_limit * 0.01);
        const troops_population = this.count_population(troops);

        this.logger.log("Population required", population_required);
        this.logger.log("Base troops population", troops_population);

        for (const unit_name of this.selectable_unit_names) {
            if (!Object.prototype.hasOwnProperty.call(troops, unit_name)) {
                troops[unit_name] = 0;
            }
        }

        const fill_troops = this.settings.fill_troops.split(",");
        let population_left = population_required - troops_population;

        this.logger.log("fill_troops", fill_troops);

        for (const fill_entry of fill_troops) {
            this.logger.log("Population left", population_left, "fill_entry", fill_entry);

            const parts = fill_entry.split(":"); // configuration syntax: unit_name[:max_count]
            const unit_name = parts[LAYOUT_FILL_EXACT.UNIT_NAME];

            if (!this.selectable_unit_names.includes(unit_name)) {
                this.logger.log("Skipping fill entry - non selectable unit", fill_entry);
                continue;
            }

            const unit_population = Number((<UnitInfo>this.world_info.unit_info[unit_name]).pop);

            const counts = [
                available_troops[unit_name] - troops[unit_name]
            ];

            if (parts.length > 1) {
                counts.push(Number(parts[LAYOUT_FILL_EXACT.UNIT_COUNT_LIMIT]));
            }

            if (!this.settings.fill_exact) {
                counts.push(Math.ceil(population_left / unit_population));
            }

            const unit_count = Math.min(...counts);
            troops[unit_name] += unit_count;
            population_left -= unit_population * unit_count;
        }

        this.logger.exit();
        return population_left <= 0
            ? troops
            : null;
    }

    private get_available_troops(): Troops {
        const available_troops: Troops = {};
        for (const unit_name of this.selectable_unit_names) {
            available_troops[unit_name] = Number((<HTMLElement>this.document.querySelector(`#unit_input_${unit_name}`)).dataset["allCount"]);
            if (Object.prototype.hasOwnProperty.call(this.settings.safeguard, unit_name)) {
                available_troops[unit_name] = Math.max(0, available_troops[unit_name] - this.settings.safeguard[unit_name]);
            }
        }
        return available_troops;
    }

    private count_population(troops: Troops): number {
        return Object.keys(troops)
            .map(unit_name => troops[unit_name] * Number((<UnitInfo>this.world_info.unit_info[unit_name].pop)))
            .reduce((a, b) => a + b, 0);
    }
}
