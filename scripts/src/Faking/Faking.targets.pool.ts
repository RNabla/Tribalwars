import { Logger, LoggerFactory } from "../inf/Logger";
import { IMapFiles, Village, WorldInfo, WorldInfoType } from "../inf/MapFiles";
import { Resources } from "./Faking.resources";
import { BoundaryBox, BoundaryCircle, FakingSettings } from "./Faking";
import { ALLY_ID_NONE, PLAYER_ID_BARBARIAN } from "./Faking.targets";
import { ScriptResult } from "../inf/Bootstrap";

export const LAYOUT_TARGET_X = 0;
export const LAYOUT_TARGET_Y = 1;
export const LAYOUT_TARGET_PLAYER_ID = 2;
export const LAYOUT_TARGET_PLAYER_NAME = 3;
export const LAYOUT_TARGET_ALLY_TAG = 4;

export type PoolTarget = [number, number, string, string, string];

export interface PoolSettings {
    coords: string,
    players: string,
    player_ids: string,
    allies: string,
    ally_tags: string,
    ally_ids: string,
    include_barbarians: boolean,
    boundaries_circle: BoundaryCircle[],
    boundaries_box: BoundaryBox[],
}

export class PoolGenerator {
    private logger: Logger;
    private settings: FakingSettings;
    private map_files: IMapFiles;

    constructor(
        map_files: IMapFiles,
        settings: FakingSettings,
    ) {
        LoggerFactory.create_instance("Hermitowski.Faking.Targets.Pool", (logger) => { this.logger = logger; });
        this.settings = settings;
        this.map_files = map_files;
    }

    public async pool_get() {
        this.logger.entry(arguments);

        const args: PoolSettings = {
            allies: this.settings.allies,
            ally_tags: this.settings.ally_tags,
            ally_ids: this.settings.ally_ids,
            players: this.settings.players,
            player_ids: this.settings.player_ids,
            include_barbarians: this.settings.include_barbarians,
            boundaries_box: this.settings.boundaries_box,
            boundaries_circle: this.settings.boundaries_circle,
            coords: this.settings.coords
        };

        const pool = await this.map_files.get_or_compute(
            async (world_info, args) => {
                this.logger.entry();
                const players = args.players.split(",").map(x => x.trim().toLowerCase());
                const player_ids = args.player_ids.split(",").map(x => x.trim());
                const allies = args.allies.split(",").map(x => x.trim().toLowerCase());
                const ally_tags = args.ally_tags.split(",").map(x => x.trim().toLowerCase());
                const ally_ids = args.ally_ids.split(",").map(x => x.trim());

                this.logger.log("Players", players, "Allies", allies, "Ally tags", ally_tags);

                const target_ally_ids = new Set(world_info.ally
                    .filter(x =>
                        allies.includes(x.name.toLowerCase()) ||
                        ally_tags.includes(x.tag.toLowerCase()) ||
                        ally_ids.includes(x.id)
                    )
                    .map(x => x.id)
                );

                this.logger.log("Ally ids", target_ally_ids);

                const target_player_ids = new Set(world_info.player
                    .filter(x =>
                        players.includes(x.name.toLowerCase()) ||
                        target_ally_ids.has(x.ally_id) ||
                        player_ids.includes(x.id)
                    )
                    .map(x => x.id)
                );

                this.logger.log("Player ids", player_ids);

                const pool: PoolTarget[] = [];

                let villages = world_info.village
                    .filter(x =>
                        (args.include_barbarians && x.player_id === PLAYER_ID_BARBARIAN)
                        ||
                        target_player_ids.has(x.player_id)
                    );

                this.logger.log("Villages before applying boundaries", villages);

                if (args.boundaries_box.length) {
                    villages = villages
                        .filter(village => this.is_in_any_boundary_box(village, args.boundaries_box));
                }

                if (args.boundaries_circle.length) {
                    villages = villages
                        .filter(village => this.is_in_any_boundary_circle(village, args.boundaries_circle));
                }

                this.logger.log("Villages after applying boundaries", villages);

                for (const village of villages) {
                    const target = this.get_village_as_target(world_info, village);
                    pool.push(target);
                }

                // "500|500 501|501:42"
                const coords_def_regex = new RegExp(/\d{1,3}\|\d{1,3}(:\d+)?/g);
                const coords_def_matches = args.coords.match(coords_def_regex);
                if (coords_def_matches != null) {
                    for (const coords_def of coords_def_matches.map(x => x.split(":"))) {
                        // [ ["500|500"], ["500|500", "42"] ]
                        let count = 1;
                        if (coords_def.length == 2) {
                            count = Number(coords_def[1]);
                        }
                        const coords = coords_def[0].split("|").map(Number);
                        const village = world_info.village.find(x => x.x == coords[0] && x.y == coords[1]);
                        if (village) {
                            const target = this.get_village_as_target(world_info, village);
                            for (let i = 0; i < count; i++) {
                                pool.push(target);
                            }
                        }
                    }
                }
                this.logger.exit();
                return pool;
            },
            [WorldInfoType.ally, WorldInfoType.player, WorldInfoType.village],
            args
        );

        if (pool.length === 0) {
            throw new ScriptResult(Resources.ERROR_POOL_EMPTY);
        }

        this.logger.exit(pool);
        return pool;
    }

    private get_village_as_target(world_info: WorldInfo, village: Village): PoolTarget {
        const player_metadata = village.player_id !== PLAYER_ID_BARBARIAN
            ? world_info.player.find(player =>
                player.id == village.player_id
            )
            : null;
        const ally_metadata = player_metadata != null && player_metadata.ally_id !== ALLY_ID_NONE
            ? world_info.ally.find(ally =>
                ally.id == player_metadata.ally_id
            )
            : null;

        const player_name = player_metadata ? player_metadata.name : null;
        const ally_tag = ally_metadata ? ally_metadata.tag : null;

        return [village.x, village.y, village.player_id, player_name, ally_tag];
    }

    private is_in_any_boundary_box(village: Village, boundaries: BoundaryBox[]) {
        for (const boundary of boundaries) {
            if (boundary.min_x <= village.x && village.x <= boundary.max_x &&
                boundary.min_y <= village.y && village.y <= boundary.max_y) {
                this.logger.log("Accepting village", village, " in box");
                return true;
            }
        }
        return false;
    }

    private is_in_any_boundary_circle(village: Village, boundaries: BoundaryCircle[]) {
        for (const boundary of boundaries) {
            const dx = boundary.x - village.x;
            const dy = boundary.y - village.y;
            if (dx * dx + dy * dy <= boundary.r * boundary.r) {
                this.logger.log("Accepting village", village, " in circle");
                return true;
            }
        }
        return false;
    }
}
