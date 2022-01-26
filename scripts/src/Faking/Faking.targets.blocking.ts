import { Logger, LoggerFactory } from "../inf/Logger";
import { IMapFiles } from "../inf/MapFiles";
import { Resources } from "./Faking.resources";
import { GameData } from "../inf/TribalWars";
import { FakingSettings } from "./Faking";
import { IDataProvider } from "../inf/DataProvider";
import { LAYOUT_TARGET_PLAYER_ID, LAYOUT_TARGET_X, LAYOUT_TARGET_Y, PoolTarget } from "./Faking.targets.pool";
import { PLAYER_ID_BARBARIAN } from "./Faking.targets";
import { ScriptResult } from "../inf/Bootstrap";

const LAYOUT_BLOCK_ENTRY_EXPIRATION_TIME = 0;
const LAYOUT_BLOCK_ENTRY_TARGET = 1;

type BlockTarget = [number, number, string]
type BlockEntry = [number, BlockTarget]

export class PoolBlocker {
    private logger: Logger;
    private map_files: IMapFiles;
    private settings: FakingSettings;
    private game_data: GameData;
    private data_provider: IDataProvider;
    constructor(
        map_files: IMapFiles,
        data_provider: IDataProvider,
        game_data: GameData,
        settings: FakingSettings,
    ) {
        LoggerFactory.create_instance("Hermitowski.Faking.Targets.PoolBlocker", (logger) => { this.logger = logger; });
        this.map_files = map_files;
        this.game_data = game_data;
        this.data_provider = data_provider;
        this.settings = settings;
    }

    public async apply_blocking(pool: PoolTarget[]): Promise<PoolTarget[]> {
        this.logger.entry(arguments);
        pool = await this.pool_apply_blocking_local(pool);
        pool = await this.pool_apply_blocking_global(pool);
        this.logger.exit(pool);
        return pool;
    }

    public async add_to_block_tables(target: PoolTarget) {
        if (this.settings.blocking_local) {
            await this.block_table_add_entry(
                target,
                this.blocking_local_get_key(),
                this.settings.blocking_local.time_s
            );
        }
        for (const global_entry of this.settings.blocking_global) {
            await this.block_table_add_entry(
                target,
                this.blocking_global_get_key(global_entry.name),
                global_entry.time_s
            );
        }
    }

    private async pool_apply_blocking_local(pool: PoolTarget[]): Promise<PoolTarget[]> {
        this.logger.entry(arguments);

        if (this.settings.blocking_local) {
            pool = await this.pool_apply_block_table(
                pool,
                this.blocking_local_get_key(),
                this.settings.blocking_local.count,
                this.settings.blocking_local.block_players
            );
        }

        this.logger.exit(pool);
        return pool;
    }

    private async pool_apply_blocking_global(pool: PoolTarget[]): Promise<PoolTarget[]> {
        this.logger.entry(arguments);

        for (const blocking of this.settings.blocking_global) {
            pool = await this.pool_apply_block_table(
                pool,
                this.blocking_global_get_key(blocking.name),
                blocking.count,
                blocking.block_players
            );
        }
        this.logger.exit(pool);
        return pool;
    }

    private blocking_local_get_key(): string | object {
        if (this.settings.blocking_local.scope === "village") {
            return `blocking.l.${this.game_data.village.id}`;
        }
        return {
            village_id: this.game_data.village.id,
            settings: this.settings
        };
    }

    private blocking_global_get_key(name: string): string {
        return `blocking.g.${name}`;
    }

    private async pool_apply_block_table(pool: PoolTarget[], key: string | object, count: number, block_players: boolean) {
        this.logger.entry(arguments);

        const block_table = await this.block_table_get(key);
        this.logger.log("block_table", block_table);
        const village_map = new Map<number, number>();
        const player_map = new Map<string, number>();

        const map_function = function (target) {
            return target[LAYOUT_TARGET_X] * 1000 + target[LAYOUT_TARGET_Y];
        };

        for (const block_entry of block_table) {
            const map_key = map_function(block_entry[LAYOUT_BLOCK_ENTRY_TARGET]);
            if (village_map.has(map_key)) {
                village_map.set(map_key, village_map.get(map_key) + 1);
            } else {
                village_map.set(map_key, 1);
            }
            if (block_players) {
                const player_id = block_entry[LAYOUT_BLOCK_ENTRY_TARGET][LAYOUT_TARGET_PLAYER_ID];
                if (player_id != PLAYER_ID_BARBARIAN) {
                    if (player_map.has(player_id)) {
                        player_map.set(player_id, player_map.get(player_id) + 1);
                    } else {
                        player_map.set(player_id, 1);
                    }
                }
            }
        }

        this.logger.log(village_map, player_map);
        this.logger.log("Block table", block_table);

        pool = pool.filter(target => {
            const map_key = map_function(target);
            return (village_map.get(map_key) || 0) < count;
        });

        if (pool.length === 0) {
            throw new ScriptResult(Resources.ERROR_POOL_EMPTY_BLOCKED_VILLAGES);
        }

        if (block_players) {
            pool = pool.filter(target => {
                const player_id = (<string>target[LAYOUT_TARGET_PLAYER_ID]);
                return (player_map.get(player_id) || 0) < count;
            });
            if (pool.length === 0) {
                throw new ScriptResult(Resources.ERROR_POOL_EMPTY_BLOCKED_PLAYERS);
            }
        }

        this.logger.log("After applying block table", key, pool);

        this.logger.exit(pool);

        return pool;
    }

    private async block_table_get(key: string | object): Promise<BlockEntry[]> {
        this.logger.entry(arguments);

        let block_table: BlockEntry[] = await this.map_files.get_item(key) || [];

        const current_timestamp_s = this.data_provider.get_current_timestamp_s();

        this.logger.log('Got block table: ', block_table, 'current (cutoff) timestamp_s: ', current_timestamp_s);

        let i = 0;
        for (; i < block_table.length; i++) {
            if (block_table[i][LAYOUT_BLOCK_ENTRY_EXPIRATION_TIME] >= current_timestamp_s) {
                break;
            }
        }

        if (i == block_table.length) {
            this.logger.log("All entries has expired");
            block_table = [];
        }
        else if (i > 0) {
            this.logger.log("Trimming", key, "block table by", i, "entries");
            block_table = block_table.slice(i);
        }

        this.logger.exit(block_table);
        return block_table;
    }

    private async block_table_add_entry(target: PoolTarget, key: string | object, time_to_live_s: number) {
        this.logger.entry(arguments);
        const block_table = await this.block_table_get(key);
        const expiration_time = this.data_provider.get_current_timestamp_s() + time_to_live_s;
        const entry: BlockEntry = [
            expiration_time,
            [target[LAYOUT_TARGET_X], target[LAYOUT_TARGET_Y], target[LAYOUT_TARGET_PLAYER_ID]]
        ];
        this.logger.log("Adding block entry", entry);
        block_table.push(entry);
        await this.map_files.set_item(key, block_table, time_to_live_s);
        this.logger.exit();
    }

}