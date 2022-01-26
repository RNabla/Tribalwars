import { Logger, LoggerFactory } from "../inf/Logger";
import { IMapFiles, WorldInfo } from "../inf/MapFiles";
import { Resources } from "./Faking.resources";
import { GameData } from "../inf/TribalWars";
import { FakingSettings, Troops } from "./Faking";
import { IDataProvider } from "../inf/DataProvider";
import { LAYOUT_TARGET_ALLY_TAG, LAYOUT_TARGET_PLAYER_NAME, LAYOUT_TARGET_X, LAYOUT_TARGET_Y, PoolGenerator, PoolTarget } from "./Faking.targets.pool";
import { PoolDateRangeFilter } from "./Faking.targets.date_ranges";
import { PoolBlocker } from "./Faking.targets.blocking";
import { TargetsHelper } from "./Faking.targets.helper";
import { ScriptResult } from "../inf/Bootstrap";

export const PLAYER_ID_BARBARIAN = "0";
export const ALLY_ID_NONE = "0";

export interface ITargetSelector {
    select_target(troops: Troops): Promise<Target>;
}

export interface Target {
    x: number;
    y: number;
    player_name: string;
    ally_tag: string;
    arrival_date: Date
}

export class TargetSelector implements ITargetSelector {
    private logger: Logger;
    private settings: FakingSettings;
    private world_info: WorldInfo;
    private game_data: GameData;
    private map_files: IMapFiles;
    data_provider: IDataProvider;

    constructor(
        world_info: WorldInfo,
        map_files: IMapFiles,
        data_provider: IDataProvider,
        game_data: GameData,
        settings: FakingSettings,
    ) {
        LoggerFactory.create_instance("Hermitowski.Faking.TargetSelector", (logger) => { this.logger = logger; });
        this.settings = settings;
        this.world_info = world_info;
        this.map_files = map_files;
        this.data_provider = data_provider;
        this.game_data = game_data;
    }

    public async select_target(troops: Troops): Promise<Target> {
        this.logger.entry(arguments);

        const pool_generator = new PoolGenerator(
            this.map_files,
            this.settings,
        );

        let pool = await pool_generator.pool_get();
        this.logger.log("Initial pool", pool);

        pool = await this.pool_apply_troops_constraints(pool, troops);
        this.logger.log("After applying troops constraints", pool);

        let pool_blocker = null;

        if (this.settings.blocking_enabled) {
            this.logger.log("Applying PoolBlocker");
            pool_blocker = new PoolBlocker(
                this.map_files,
                this.data_provider,
                this.game_data,
                this.settings
            );
            pool = await pool_blocker.apply_blocking(pool);
        }

        const pool_data_range_filter = new PoolDateRangeFilter(
            this.world_info,
            this.data_provider,
            this.game_data,
            this.settings
        );

        pool = pool_data_range_filter.apply_filter(pool, troops);

        this.logger.log("After applying date ranges ", pool);

        const idx = this.data_provider.get_random_number(0, pool.length);
        const target = pool[idx];

        const troops_speed = TargetsHelper.get_troops_speed(this.world_info, troops);

        if (this.settings.blocking_enabled) {
            pool_blocker.add_to_block_tables(target);
        }

        this.logger.log("Returning", target);
        this.logger.exit();

        return {
            x: target[LAYOUT_TARGET_X],
            y: target[LAYOUT_TARGET_Y],
            player_name: target[LAYOUT_TARGET_PLAYER_NAME],
            ally_tag: target[LAYOUT_TARGET_ALLY_TAG],
            arrival_date: TargetsHelper.calculate_arrival_time(this.game_data, target, troops_speed, this.data_provider.runtime_timestamp_s)
        };
    }


    private pool_apply_troops_constraints(pool: PoolTarget[], troops: Troops) {
        this.logger.entry(arguments);
        if (troops.snob > 0) {
            pool = pool.filter((x: PoolTarget) => TargetsHelper.calculate_distance(this.game_data, x) < Number(this.world_info.config.snob.max_dist));
            if (pool.length === 0) {
                throw new ScriptResult(Resources.ERROR_POOL_EMPTY_SNOBS);
            }
        }
        this.logger.exit(pool);
        return pool;
    }

}
