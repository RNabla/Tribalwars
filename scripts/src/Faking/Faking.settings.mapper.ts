import { BlockingGlobal, BlockingLocal, BoundaryBox, BoundaryCircle, DateRange, DateRangePart, FakingSettings, Troops } from "./Faking";

export class SetttingsMapper {
    public static map_configuration(user_configuration: object): FakingSettings {
        return {
            safeguard: SetttingsMapper.as_troops(user_configuration["safeguard"], {}),
            troops_templates: SetttingsMapper.as_array(user_configuration["troops_templates"], SetttingsMapper.as_troops),
            fill_exact: SetttingsMapper.as_boolean(user_configuration["fill_exact"], false),
            fill_troops: SetttingsMapper.as_string(user_configuration["fill_troops"], "spear,sword,axe,archer,spy,light,marcher,heavy,ram,catapult"),

            coords: SetttingsMapper.as_string(user_configuration["coords"], ""),
            players: SetttingsMapper.as_string(user_configuration["players"], ""),
            player_ids: SetttingsMapper.as_string(user_configuration["player_ids"], ""),
            allies: SetttingsMapper.as_string(user_configuration["allies"], ""),
            ally_tags: SetttingsMapper.as_string(user_configuration["ally_tags"], ""),
            ally_ids: SetttingsMapper.as_string(user_configuration["ally_ids"], ""),

            exclude_players: SetttingsMapper.as_string(user_configuration["exclude_players"], ""),
            exclude_player_ids: SetttingsMapper.as_string(user_configuration["exclude_player_ids"], ""),
            exclude_allies: SetttingsMapper.as_string(user_configuration["exclude_allies"], ""),
            exclude_ally_tags: SetttingsMapper.as_string(user_configuration["exclude_ally_tags"], ""),
            exclude_ally_ids: SetttingsMapper.as_string(user_configuration["exclude_ally_ids"], ""),


            include_barbarians: SetttingsMapper.as_boolean(user_configuration["include_barbarians"], false),
            boundaries_circle: SetttingsMapper.as_array(user_configuration["boundaries"], SetttingsMapper.as_boundary_circle),
            boundaries_box: SetttingsMapper.as_array(user_configuration["boundaries"], SetttingsMapper.as_boundary_box),

            blocking_enabled: SetttingsMapper.as_boolean(user_configuration["blocking_enabled"], false),
            blocking_local: SetttingsMapper.as_blocking_local(user_configuration["blocking_local"], null),
            blocking_global: SetttingsMapper.as_array(user_configuration["blocking_global"], SetttingsMapper.as_blocking_global),

            skip_night_bonus: SetttingsMapper.as_boolean(user_configuration["skip_night_bonus"], true),
            date_ranges: SetttingsMapper.as_array(user_configuration["date_ranges"], SetttingsMapper.as_date_range),

            changing_village_enabled: SetttingsMapper.as_boolean(user_configuration["changing_village_enabled"], true),
        };
    }

    public static as_string(provided_value: object, default_value: string): string {
        if (typeof (provided_value) === "string") {
            return provided_value;
        }
        return default_value;
    }

    public static as_number(provided_value: object, default_value: number): number {
        if (typeof (provided_value) === "number") {
            return provided_value;
        }
        if (typeof (provided_value) === "string") {
            const number = Number(provided_value);
            if (!isNaN(number)) {
                return number;
            }
        }
        return default_value;
    }

    public static as_troops(provided_value: object, default_value: Troops): Troops {
        if (typeof (provided_value) === "object") {
            const troops: Troops = {};
            for (const unit_name of ["spear", "sword", "axe", "archer", "spy", "light", "marcher", "heavy", "ram", "catapult", "knight", "snob"]) {
                if (Object.prototype.hasOwnProperty.call(provided_value, unit_name)) {
                    const unit_count = SetttingsMapper.as_number(provided_value[unit_name], null);
                    if (unit_count != null) {
                        troops[unit_name] = unit_count;
                    }
                }
            }
            return troops;
        }
        return default_value;
    }

    public static as_array<T>(provided_value: object, row_mapper: (provided_value: object, default_value: T) => T) {
        const array: T[] = [];
        if (Array.isArray(provided_value)) {
            for (let i = 0; i < provided_value.length; i++) {
                const row = row_mapper(provided_value[i], null);
                if (row != null) {
                    array.push(row);
                }
            }
        }
        return array;
    }

    public static as_boolean(provided_value: object, default_value: boolean): boolean {
        if (typeof (provided_value) === "boolean") {
            return provided_value;
        }
        if (typeof (provided_value) === "string") {
            if ((<string>provided_value).trim().toLowerCase() === "true") {
                return true;
            }
            return false;
        }
        return default_value;
    }

    public static as_boundary_circle(provided_value: object, default_value: BoundaryCircle): BoundaryCircle {
        if (typeof (provided_value) === "object") {
            const x = SetttingsMapper.as_number(provided_value["x"], null);
            const y = SetttingsMapper.as_number(provided_value["y"], null);
            const r = SetttingsMapper.as_number(provided_value["r"], null);
            if (x != null && y != null && r != null) {
                return { x, y, r };
            }
        }
        return default_value;
    }

    public static as_boundary_box(provided_value: object, default_value: BoundaryBox): BoundaryBox {
        if (typeof (provided_value) === "object") {
            const min_x = SetttingsMapper.as_number(provided_value["min_x"], null);
            const max_x = SetttingsMapper.as_number(provided_value["max_x"], null);
            const min_y = SetttingsMapper.as_number(provided_value["min_y"], null);
            const max_y = SetttingsMapper.as_number(provided_value["max_y"], null);
            if (min_x != null && max_x != null && min_y != null && max_y != null) {
                return { min_x, max_x, min_y, max_y };
            }
        }
        return default_value;
    }

    public static as_date_range_part(provided_value: object | string, default_value: DateRangePart): DateRangePart {
        if (typeof (provided_value) === "string") {
            const matches = (<string>provided_value).match(/\d+/g);
            if (matches != null && (matches.length === 2 || matches.length === 5)) {
                return (<DateRangePart>[-1, -1, -1, ...matches.map(Number)].slice(-5));
            }
        }
        return default_value;
    }

    public static as_date_range(provided_value: object, default_value: DateRange): DateRange {
        if (typeof (provided_value) === "string") {
            const parts = (<string>provided_value).split("-");
            if (parts.length === 2) {
                const result = [
                    SetttingsMapper.as_date_range_part(parts[0], null),
                    SetttingsMapper.as_date_range_part(parts[1], null),
                ];
                if (result[0] != null && result[1] != null) {
                    return (<DateRange>result);
                }
            }
        }
        return default_value;
    }

    public static as_blocking_local(provided_value: object, default_value: BlockingLocal): BlockingLocal {
        if (typeof (provided_value) === "object") {
            const time_s = SetttingsMapper.as_number(provided_value["time_s"], null);
            const count = SetttingsMapper.as_number(provided_value["count"], null);
            const block_players = SetttingsMapper.as_boolean(provided_value["block_players"], null);
            const scope = SetttingsMapper.as_string(provided_value["scope"], null) === "instance"
                ? "instance"
                : null;
            if (time_s != null && count != null && block_players != null) {
                return { time_s, count, block_players, scope };
            }
        }
        return default_value;
    }

    public static as_blocking_global(provided_value: object, default_value: BlockingGlobal): BlockingGlobal {
        if (typeof (provided_value) === "object") {
            const time_s = SetttingsMapper.as_number(provided_value["time_s"], null);
            const count = SetttingsMapper.as_number(provided_value["count"], null);
            const block_players = SetttingsMapper.as_boolean(provided_value["block_players"], null);
            const name = SetttingsMapper.as_string(provided_value["name"], null);
            if (time_s != null && count != null && block_players != null && name != null) {
                return { time_s, count, block_players, name };
            }
        }
        return default_value;
    }
}