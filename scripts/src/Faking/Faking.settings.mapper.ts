import { BlockingGlobal, BlockingLocal, BoundaryBox, BoundaryCircle, DateRange, DateRangePart, FakingSettings, Troops } from "./Faking";

export class SetttingsMapper {
    public static map_configuration(user_configuration: object): FakingSettings {
        return {
            safeguard: this.as_troops(user_configuration["safeguard"], {}),
            troops_templates: this.as_array(user_configuration["troops_templates"], this.as_troops),
            fill_exact: this.as_boolean(user_configuration["fill_exact"], false),
            fill_troops: this.as_string(user_configuration["fill_troops"], "spear,sword,axe,archer,spy,light,marcher,heavy,ram,catapult"),

            coords: this.as_string(user_configuration["coords"], ""),
            players: this.as_string(user_configuration["players"], ""),
            allies: this.as_string(user_configuration["allies"], ""),
            ally_tags: this.as_string(user_configuration["ally_tags"], ""),
            include_barbarians: this.as_boolean(user_configuration["include_barbarians"], false),

            boundaries_circle: this.as_array(user_configuration["boundaries"], this.as_boundary_circle),
            boundaries_box: this.as_array(user_configuration["boundaries"], this.as_boundary_box),

            blocking_enabled: this.as_boolean(user_configuration["blocking_enabled"], false),
            blocking_local: this.as_blocking_local(user_configuration["blocking_local"], null),
            blocking_global: this.as_array(user_configuration["blocking_global"], this.as_blocking_global),

            skip_night_bonus: this.as_boolean(user_configuration["skip_night_bonus"], true),
            date_ranges: this.as_array(user_configuration["date_ranges"], this.as_date_range),

            changing_village_enabled: this.as_boolean(user_configuration["changing_village_enabled"], true),
        };
    }

    public static as_string(provided_value: any, default_value: string): string {
        if (typeof (provided_value) === "string") return provided_value;
        return default_value;
    }

    public static as_number(provided_value: any, default_value: number): number {
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

    public static as_troops(provided_value: any, default_value: Troops): Troops {
        if (typeof (provided_value) === "object") {
            const troops: Troops = {};
            for (const unit_name of ["spear", "sword", "axe", "archer", "spy", "light", "marcher", "heavy", "ram", "catapult", "knight", "snob"]) {
                if (Object.prototype.hasOwnProperty.call(provided_value, unit_name)) {
                    const unit_count = this.as_number(provided_value[unit_name], null);
                    if (unit_count != null) {
                        troops[unit_name] = unit_count;
                    }
                }
            }
            return troops;
        }
        return default_value;
    }

    public static as_array<T>(provided_value: any, row_mapper: (provided_value: any, default_value: T) => T) {
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

    public static as_boolean(provided_value: any, default_value: boolean): boolean {
        if (typeof (provided_value) === "boolean") {
            return provided_value;
        }
        if (typeof (provided_value) === "string") {
            if (provided_value.trim().toLowerCase() == "true") {
                return true;
            }
            return false;
        }
        return default_value;
    }

    public static as_boundary_circle(provided_value: any, default_value: BoundaryCircle): BoundaryCircle {
        if (typeof (provided_value) === "object") {
            const x = this.as_number(provided_value["x"], null);
            const y = this.as_number(provided_value["y"], null);
            const r = this.as_number(provided_value["r"], null);
            if (x != null && y != null && r != null) {
                return { x, y, r };
            }
        }
        return default_value;
    }

    public static as_boundary_box(provided_value: any, default_value: BoundaryBox): BoundaryBox {
        if (typeof (provided_value) === "object") {
            const min_x = this.as_number(provided_value["min_x"], null);
            const max_x = this.as_number(provided_value["max_x"], null);
            const min_y = this.as_number(provided_value["min_y"], null);
            const max_y = this.as_number(provided_value["max_y"], null);
            if (min_x != null && max_x != null && min_y != null && max_y != null) {
                return { min_x, max_x, min_y, max_y };
            }
        }
        return default_value;
    }

    public static as_date_range_part(provided_value: any, default_value: DateRangePart): DateRangePart {
        if (typeof (provided_value) == "string") {
            const matches = provided_value.match(/\d+/g);
            if (matches != null && (matches.length == 2 || matches.length == 5)) {
                return (<DateRangePart>[-1, -1, -1, ...matches.map(Number)].slice(-5));
            }
        }
        return default_value;
    }

    public static as_date_range(provided_value: any, default_value: DateRange): DateRange {
        if (typeof (provided_value) == "string") {
            const parts = provided_value.split("-");
            if (parts.length == 2) {
                const result = [
                    this.as_date_range_part(parts[0], null),
                    this.as_date_range_part(parts[1], null),
                ];
                if (result[0] != null && result[1] != null) {
                    return (<DateRange>result);
                }
            }
        }
    }

    public static as_blocking_local(provided_value: any, default_value: BlockingLocal): BlockingLocal {
        if (typeof (provided_value) === "object") {
            const time_s = this.as_number(provided_value["time_s"], null);
            const count = this.as_number(provided_value["count"], null);
            const block_players = this.as_boolean(provided_value["block_players"], null);
            const scope = this.as_string(provided_value["scope"], null) === "village"
                ? "village"
                : null;
            if (time_s != null && count != null && block_players != null) {
                return { time_s, count, block_players, scope };
            }
        }
        return default_value;
    }

    public static as_blocking_global(provided_value: any, default_value: BlockingGlobal): BlockingGlobal {
        if (typeof (provided_value) === "object") {
            const time_s = this.as_number(provided_value["time_s"], null);
            const count = this.as_number(provided_value["count"], null);
            const block_players = this.as_boolean(provided_value["block_players"], null);
            const name = this.as_string(provided_value["name"], null);
            if (time_s != null && count != null && block_players != null && name != null) {
                return { time_s, count, block_players, name };
            }
        }
        return default_value;
    }
}