import { Logger, LoggerFactory } from "../inf/Logger";
import { WorldInfo } from "../inf/MapFiles";
import { Resources } from "./Faking.resources";
import { GameData } from "../inf/TribalWars";
import { DateRangePart, FakingSettings, Troops } from "./Faking";
import { IDataProvider } from "../inf/DataProvider";
import { LAYOUT_TARGET_PLAYER_ID, PoolTarget } from "./Faking.targets.pool";
import { TargetsHelper } from "./Faking.targets.helper";
import { PLAYER_ID_BARBARIAN } from "./Faking.targets";
import { ScriptResult } from "../inf/Bootstrap";

const LAYOUT_DATE_RANGE_FROM = 0;
const LAYOUT_DATE_RANGE_TO = 1;
const LAYOUT_DATE_RANGE_PART_DAY = 0;
const LAYOUT_DATE_RANGE_PART_MONTH = 1;
const LAYOUT_DATE_RANGE_PART_YEAR = 2;
const LAYOUT_DATE_RANGE_PART_HOUR = 3;
const LAYOUT_DATE_RANGE_PART_MINUTE = 4;

export class PoolDateRangeFilter {
    logger: Logger;
    world_info: WorldInfo;
    settings: FakingSettings;
    current_timestamp_s: number;
    game_data: GameData;
    data_provider: IDataProvider;
    timestamp_s: number;
    constructor(
        world_info: WorldInfo,
        data_provider: IDataProvider,
        game_data: GameData,
        settings: FakingSettings,
    ) {
        LoggerFactory.create_instance("Hermitowski.Faking.Targets.DateRangeFilter", (logger) => { this.logger = logger; });
        this.world_info = world_info;
        this.game_data = game_data;
        this.data_provider = data_provider;
        this.settings = settings;
        this.timestamp_s = this.data_provider.get_current_timestamp_s();
    }

    apply_filter(pool: PoolTarget[], troops: Troops): PoolTarget[] {
        this.logger.entry(arguments);
        const troops_speed = TargetsHelper.get_troops_speed(this.world_info, troops);
        this.logger.log("troops_speed", troops_speed);

        pool = this.apply_night_bonus(pool, troops, troops_speed);
        pool = this.apply_date_ranges(pool, troops_speed);

        this.logger.exit(pool);
        return pool;
    }

    private apply_night_bonus(pool: PoolTarget[], troops: Troops, troops_speed: number): PoolTarget[] {
        const only_spies = Object.keys(troops).filter(unit => unit !== "spy").every(unit => troops[unit] == 0);

        if (this.world_info.config.night.active === "1" && this.settings.skip_night_bonus && !only_spies) {
            const start_hour = Number(this.world_info.config.night.start_hour);
            const end_hour = Number(this.world_info.config.night.end_hour);
            this.logger.log("start_hour", start_hour, "end_hour", end_hour);
            pool = pool.filter(target => {
                if (target[LAYOUT_TARGET_PLAYER_ID] === PLAYER_ID_BARBARIAN) {
                    return true;
                }
                const arrival_time = TargetsHelper.calculate_arrival_time(this.game_data, target, troops_speed, this.timestamp_s);
                const arrival_hour = arrival_time.getHours();
                this.logger.log("arrival_hour", arrival_hour);
                if (start_hour < end_hour && start_hour == 0) { // 0-8
                    return arrival_hour >= end_hour;
                }
                if (start_hour < end_hour) { // 2-8
                    return arrival_hour > end_hour && arrival_hour < start_hour;
                }
                if (start_hour > end_hour && end_hour == 0) { // 23-0
                    return arrival_hour < start_hour;
                }
                // 23-8
                return arrival_hour < start_hour && arrival_hour >= end_hour;
            });
            if (pool.length === 0) {
                throw new ScriptResult(Resources.ERROR_POOL_EMPTY_NIGHT_BONUS);
            }
        }

        return pool;
    }

    private apply_date_ranges(pool: PoolTarget[], troops_speed: number): PoolTarget[] {
        if (this.settings.date_ranges.length > 0) {
            const snapshot = pool;

            for (const date_range of this.settings.date_ranges) {
                this.logger.log("date_range", date_range);

                let filter_function = null;

                if (date_range[LAYOUT_DATE_RANGE_FROM][LAYOUT_DATE_RANGE_PART_DAY] != -1 &&
                    date_range[LAYOUT_DATE_RANGE_TO][LAYOUT_DATE_RANGE_PART_DAY] != -1) {

                    const lower_bound = new Date(
                        date_range[LAYOUT_DATE_RANGE_FROM][LAYOUT_DATE_RANGE_PART_YEAR],
                        date_range[LAYOUT_DATE_RANGE_FROM][LAYOUT_DATE_RANGE_PART_MONTH] - 1,
                        date_range[LAYOUT_DATE_RANGE_FROM][LAYOUT_DATE_RANGE_PART_DAY],
                        date_range[LAYOUT_DATE_RANGE_FROM][LAYOUT_DATE_RANGE_PART_HOUR],
                        date_range[LAYOUT_DATE_RANGE_FROM][LAYOUT_DATE_RANGE_PART_MINUTE],
                    );

                    const upper_bound = new Date(
                        date_range[LAYOUT_DATE_RANGE_TO][LAYOUT_DATE_RANGE_PART_YEAR],
                        date_range[LAYOUT_DATE_RANGE_TO][LAYOUT_DATE_RANGE_PART_MONTH] - 1,
                        date_range[LAYOUT_DATE_RANGE_TO][LAYOUT_DATE_RANGE_PART_DAY],
                        date_range[LAYOUT_DATE_RANGE_TO][LAYOUT_DATE_RANGE_PART_HOUR],
                        date_range[LAYOUT_DATE_RANGE_TO][LAYOUT_DATE_RANGE_PART_MINUTE],
                    );

                    this.logger.log("lower_bound", lower_bound, "upper_bound", upper_bound);

                    filter_function = (target: PoolTarget) => {
                        const arrival_time = TargetsHelper.calculate_arrival_time(this.game_data, target, troops_speed, this.timestamp_s);
                        this.logger.log(target, lower_bound <= arrival_time && arrival_time <= upper_bound, arrival_time);
                        return lower_bound <= arrival_time && arrival_time <= upper_bound;
                    };
                }
                else {
                    const minutes_from = this.get_minutes(date_range[LAYOUT_DATE_RANGE_FROM]);
                    const minutes_to = this.get_minutes(date_range[LAYOUT_DATE_RANGE_TO]);

                    this.logger.log("minutes_from", minutes_from, "minutes_to", minutes_to);

                    filter_function = (target: PoolTarget) => {
                        const arrival_time = TargetsHelper.calculate_arrival_time(this.game_data, target, troops_speed, this.timestamp_s);
                        const minutes_arrival = this.get_minutes([-1, -1, -1, arrival_time.getHours(), arrival_time.getMinutes()]);
                        this.logger.log(target, minutes_arrival, minutes_from <= minutes_arrival && minutes_arrival <= minutes_to, arrival_time);
                        return minutes_from <= minutes_arrival && minutes_arrival <= minutes_to;
                    };
                }

                pool = snapshot.filter(filter_function);

                if (pool.length > 0) {
                    break;
                }
            }

            if (pool.length == 0) {
                throw new ScriptResult(Resources.ERROR_POOL_EMPTY_DATE_RANGES);
            }
        }
        return pool;
    }

    private get_minutes(day_parts: DateRangePart) {
        return day_parts[LAYOUT_DATE_RANGE_PART_HOUR] * 60 + day_parts[LAYOUT_DATE_RANGE_PART_MINUTE];
    }
}