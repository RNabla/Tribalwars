import { assert, assertException, TestRunner } from '../framework';
import { FakingSettings } from '../../src/Faking/Faking';
import { Resources } from '../../src/Faking/Faking.resources';
import { FakingMapFiles } from './mocks/MapFiles';
import { PoolTarget } from '../../src/Faking/Faking.targets.pool';
import { PoolBlocker } from '../../src/Faking/Faking.targets.blocking';
import { IMapFiles } from '../../src/inf/MapFiles';
import { DataProvider } from '../../src/inf/DataProvider';
import { sleep } from '../../src/inf/Helper';

type Configuration = {
    settings?: FakingSettings,
    map_files: IMapFiles,
    config?: string
};

!(async function () {
    const test_runner = TestRunner.create('Faking');

    const get_default_settings = function (): FakingSettings {
        return {
            "safeguard": {},
            "troops_templates": [
                { "spy": 1, "ram": 1 },
                { "spy": 1, "catapult": 1 },
                { "ram": 1 },
                { "catapult": 1 }
            ],
            "fill_exact": false,
            "fill_troops": 'spear,sword,axe,archer,spy,light,marcher,heavy,ram,catapult',
            "coords": '',
            "players": '',
            "player_ids": "",
            "allies": '',
            "ally_ids": "",
            "ally_tags": '',
            "include_barbarians": false,
            "boundaries_box": [
                // { min_x: 400, max_x: 500, min_y: 400, max_y: 500 },
            ],
            "boundaries_circle": [
                // { r: 30, center: [500, 500] }
            ],
            "blocking_enabled": true,
            "blocking_local": null,
            "blocking_global": [
                // { time_s: 10, count: 1, name: 'global_1', block_players: false }
            ],
            "skip_night_bonus": true,
            "date_ranges": [
                // [dd.mm.yyyy hh:ss - dd.mm.yyyy hh:ss]
                // [hh:ss - hh:ss]
            ],
            "changing_village_enabled": true
        };
    }

    const data_provider = new DataProvider();

    const create_target = function (cfg: Configuration = null): PoolBlocker {
        return new PoolBlocker(
            cfg.map_files ?? new FakingMapFiles(data_provider),
            data_provider,
            {
                screen: "place",
                units: [],
                village: { x: 500, y: 500, id: 42, points: 9000 }
            },
            cfg.settings ?? get_default_settings()
        );
    };

    test_runner.test('pool empty', async function () {
        const map_files = new FakingMapFiles(data_provider);
        const cfg = {
            map_files: map_files
        }
        const target = create_target(cfg);
        const pool = await target.apply_blocking([
            [500, 500, "0", null, null]
        ]);
        assert(() => pool.length === 1);
    });

    test_runner.test('blocking_local time_s', async function () {
        const map_files = new FakingMapFiles(data_provider);
        const settings = get_default_settings();
        settings.blocking_local = {
            block_players: false,
            count: 1,
            time_s: 2
        };
        const cfg = {
            map_files: map_files,
            settings: settings
        }
        const target = create_target(cfg);
        const pool_target: PoolTarget = [500, 500, "1", null, null];
        let pool = await target.apply_blocking([pool_target]);
        assert(() => pool.length === 1);
        await target.add_to_block_tables(pool_target);
        await assertException(async () => {
            await target.apply_blocking([pool_target]);
        }, Resources.ERROR_POOL_EMPTY_BLOCKED_VILLAGES);
        await sleep(2500);
        pool = await target.apply_blocking([pool_target]);
        assert(() => pool.length === 1);
    });

    test_runner.test('blocking_local count', async function () {
        const map_files = new FakingMapFiles(data_provider);
        const settings = get_default_settings();
        settings.blocking_local = {
            block_players: false,
            count: 2,
            time_s: 3
        };
        const cfg = {
            map_files: map_files,
            settings: settings
        }
        const target = create_target(cfg);
        const pool_target: PoolTarget = [500, 500, "1", null, null];
        // 1st
        let pool = await target.apply_blocking([pool_target]);
        assert(() => pool.length === 1);
        await target.add_to_block_tables(pool_target);
        // 2nd
        await sleep(1500);
        pool = await target.apply_blocking([pool_target]);
        assert(() => pool.length === 1);
        await target.add_to_block_tables(pool_target);
        // 3rd
        await assertException(async () => {
            await target.apply_blocking([pool_target]);
        }, Resources.ERROR_POOL_EMPTY_BLOCKED_VILLAGES);
        await sleep(2000);
        pool = await target.apply_blocking([pool_target]);
        assert(() => pool.length === 1);
    });

    await test_runner.run();
})();