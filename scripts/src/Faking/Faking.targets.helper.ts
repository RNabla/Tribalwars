import { UnitInfo, WorldInfo } from "../inf/MapFiles";
import { Resources } from "./Faking.resources";
import { GameData } from "../inf/TribalWars";
import { Troops } from "./Faking";
import { LAYOUT_TARGET_X, LAYOUT_TARGET_Y, PoolTarget } from "./Faking.targets.pool";
import { ScriptResult } from "../inf/Bootstrap";

export class TargetsHelper {
    static calculate_distance(game_data: GameData, target: PoolTarget) {
        return Math.hypot(
            game_data.village.x - target[LAYOUT_TARGET_X],
            game_data.village.y - target[LAYOUT_TARGET_Y]
        );
    }

    static calculate_arrival_time(game_data: GameData, target: PoolTarget, troops_speed: number, current_timestamp_s: number) {
        const distance = TargetsHelper.calculate_distance(game_data, target);
        return new Date((current_timestamp_s + distance * troops_speed * 60) * 1000);
    }

    static get_troops_speed(world_info: WorldInfo, troops: Troops) {
        let speed = 0;
        for (const unit in troops) {
            if (Object.prototype.hasOwnProperty.call(troops, unit) && troops[unit] !== 0) {
                speed = Math.max(Number((<UnitInfo>world_info.unit_info[unit]).speed), speed);
            }
        }
        if (speed === 0) {
            throw new ScriptResult(Resources.ERROR_TROOPS_EMPTY);
        }
        return speed;
    }
}