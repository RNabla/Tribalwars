import { assert, assertException, TestRunner } from '../framework';
import { FakingSettings } from '../../src/Faking/Faking';
import { Resources } from '../../src/Faking/Faking.resources';
import { FakingMapFiles } from './mocks/MapFiles';
import { PoolDateRangeFilter } from '../../src/Faking/Faking.targets.date_ranges';
import { WorldInfoType } from '../../src/inf/MapFiles';
import { DataProvider } from '../mocks/DataProvider';
import { PoolTarget } from '../../src/Faking/Faking.targets.pool';

type Configuration = {
    data_provider: DataProvider,
    settings?: FakingSettings,
    x?: number,
    y?: number,
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
            "blocking_enabled": false,
            "blocking_local": { "time_s": 5, "count": 1, "block_players": true, "scope": "instance" },
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

    const create_target = async function (cfg: Configuration): Promise<PoolDateRangeFilter> {
        const map_files = new FakingMapFiles(cfg.data_provider, cfg.config ?? "config_168");
        const world_info = await map_files.get_world_info([WorldInfoType.config, WorldInfoType.unit_info]);
        return new PoolDateRangeFilter(world_info, cfg.data_provider, {
            screen: "place",
            units: ["spear", "sword", "axe", "spy", "light", "heavy", "ram", "catapult", "knight", "snob", "militia"],
            village: { x: cfg.x ?? 500, y: cfg.y ?? 500, id: 42, points: 9000 }
        }, cfg.settings ?? get_default_settings());
    };

    test_runner.test('pool skip_night_bonus off', async function () {
        const cfg = {
            data_provider: new DataProvider(new Date(2021, 11, 27, 23, 15, 0)),
            settings: get_default_settings()
        };
        cfg.settings.skip_night_bonus = false;
        const target = await create_target(cfg);
        const pool = target.apply_filter(
            [
                [501, 500, "1", null, null],
                [502, 500, "1", null, null],
            ], { ram: 1 }
        );
        assert(() => pool.length == 2);
    });

    test_runner.test('pool skip_night_bonus 0-8 lower allow', async function () {
        const cfg = {
            data_provider: new DataProvider(new Date(2021, 11, 27, 23, 15, 0))
        };
        const target = await create_target(cfg);
        const pool = target.apply_filter(
            [
                [501, 500, "1", null, null],
            ], { ram: 1 }
        );
        assert(() => pool.length == 1);
    });

    test_runner.test('pool skip_night_bonus 0-8 lower block', async function () {
        const cfg = {
            data_provider: new DataProvider(new Date(2021, 11, 27, 23, 15, 0))
        };
        const target = await create_target(cfg);

        await assertException(async () => {
            target.apply_filter(
                [
                    [502, 500, "1", null, null]
                ], { ram: 1 }
            );
        }, Resources.ERROR_POOL_EMPTY_NIGHT_BONUS);
    });

    test_runner.test('pool skip_night_bonus 0-8 upper allow', async function () {
        const cfg = {
            data_provider: new DataProvider(new Date(2021, 11, 27, 7, 15, 0))
        };
        const target = await create_target(cfg);
        const pool = target.apply_filter(
            [
                [502, 500, "1", null, null],
            ], { ram: 1 }
        );
        assert(() => pool.length == 1);
    });

    test_runner.test('pool skip_night_bonus 0-8 upper block', async function () {
        const cfg = {
            data_provider: new DataProvider(new Date(2021, 11, 27, 7, 15, 0))
        };
        const target = await create_target(cfg);

        await assertException(async () => {
            target.apply_filter(
                [
                    [501, 500, "1", null, null]
                ], { ram: 1 }
            );
        }, Resources.ERROR_POOL_EMPTY_NIGHT_BONUS);
    });

    test_runner.test('pool skip_night_bonus 23-8 lower allow', async function () {
        const cfg = {
            data_provider: new DataProvider(new Date(2021, 11, 27, 22, 15, 0)),
            config: "config_169"
        };
        const target = await create_target(cfg);
        const pool = target.apply_filter(
            [
                [501, 500, "1", null, null],
            ], { ram: 1 }
        );
        assert(() => pool.length == 1);
    });

    test_runner.test('pool skip_night_bonus 23-8 lower block', async function () {
        const cfg = {
            data_provider: new DataProvider(new Date(2021, 11, 27, 22, 15, 0)),
            config: "config_169"
        };
        const target = await create_target(cfg);

        await assertException(async () => {
            target.apply_filter(
                [
                    [502, 500, "1", null, null]
                ], { ram: 1 }
            );
        }, Resources.ERROR_POOL_EMPTY_NIGHT_BONUS);
    });

    test_runner.test('pool skip_night_bonus 23-8 upper allow', async function () {
        const cfg = {
            data_provider: new DataProvider(new Date(2021, 11, 27, 7, 15, 0)),
            config: "config_169"
        };
        const target = await create_target(cfg);
        const pool = target.apply_filter(
            [
                [502, 500, "1", null, null],
            ], { ram: 1 }
        );
        assert(() => pool.length == 1);
    });

    test_runner.test('pool skip_night_bonus 23-8 upper block', async function () {
        const cfg = {
            data_provider: new DataProvider(new Date(2021, 11, 27, 7, 15, 0)),
            config: "config_169"
        };
        const target = await create_target(cfg);

        await assertException(async () => {
            target.apply_filter(
                [
                    [501, 500, "1", null, null]
                ], { ram: 1 }
            );
        }, Resources.ERROR_POOL_EMPTY_NIGHT_BONUS);
    });

    test_runner.test('pool skip_night_bonus skips barbarians', async function () {
        const cfg = {
            data_provider: new DataProvider(new Date(2021, 11, 27, 4, 15, 0))
        };
        const target = await create_target(cfg);
        const troops = { ram: 1 };
        let pool: PoolTarget[] = [
            [501, 500, "0", null, null],
        ]
        pool = target.apply_filter(pool, troops);
        assert(() => pool.length == 1);
    });

    test_runner.test('pool date_ranges time', async function () {
        const cfg = {
            data_provider: new DataProvider(new Date(2021, 11, 27, 9, 15, 0)),
            settings: get_default_settings()
        };
        cfg.settings.date_ranges.push(
            [[-1, -1, -1, 10, 0], [-1, -1, -1, 11, 30]]
        )
        const target = await create_target(cfg);
        const troops = { ram: 1 };
        let pool: PoolTarget[] = [
            [501, 500, "0", null, null], // 9:45
            [502, 500, "0", null, null], // 10:15
            [503, 500, "0", null, null], // 10:45
            [504, 500, "0", null, null], // 11:15
            [505, 500, "0", null, null], // 11:45
            [506, 500, "0", null, null], // 12:15
            [507, 500, "0", null, null], // 12:45
        ]
        pool = target.apply_filter(pool, troops);
        assert(() => pool.length == 3);
    });

    test_runner.test('pool date_ranges time multiple', async function () {
        const cfg = {
            data_provider: new DataProvider(new Date(2021, 11, 27, 9, 15, 0)),
            settings: get_default_settings()
        };
        cfg.settings.date_ranges.push(
            [[-1, -1, -1, 10, 0], [-1, -1, -1, 11, 30]],
            [[-1, -1, -1, 10, 0], [-1, -1, -1, 12, 30]]
        )
        const target = await create_target(cfg);
        const troops = { ram: 1 };
        let pool: PoolTarget[] = [
            [501, 500, "0", null, null], // 9:45
            [502, 500, "0", null, null], // 10:15
            [503, 500, "0", null, null], // 10:45
            [504, 500, "0", null, null], // 11:15
            [505, 500, "0", null, null], // 11:45
            [506, 500, "0", null, null], // 12:15
            [507, 500, "0", null, null], // 12:45
        ]
        pool = target.apply_filter(pool, troops);
        assert(() => pool.length == 3);
    });

    test_runner.test('pool date_ranges time priority', async function () {
        const cfg = {
            data_provider: new DataProvider(new Date(2021, 11, 27, 9, 15, 0)),
            settings: get_default_settings()
        };
        cfg.settings.date_ranges.push(
            [[-1, -1, -1, 8, 0], [-1, -1, -1, 9, 30]],
            [[-1, -1, -1, 12, 0], [-1, -1, -1, 12, 30]]
        )
        const target = await create_target(cfg);
        const troops = { ram: 1 };
        let pool: PoolTarget[] = [
            [501, 500, "0", null, null], // 9:45
            [502, 500, "0", null, null], // 10:15
            [503, 500, "0", null, null], // 10:45
            [504, 500, "0", null, null], // 11:15
            [505, 500, "0", null, null], // 11:45
            [506, 500, "0", null, null], // 12:15
            [507, 500, "0", null, null], // 12:45
        ]
        pool = target.apply_filter(pool, troops);
        assert(() => pool.length == 1);
        assert(() => pool[0][0] == 506);
    });


    test_runner.test('pool date_ranges datetime', async function () {
        const cfg = {
            data_provider: new DataProvider(new Date(2021, 10, 27, 9, 15, 0)),
            settings: get_default_settings()
        };
        cfg.settings.date_ranges.push(
            [[27, 11, 2021, 10, 0], [27, 11, 2021, 11, 30]],
        )
        const target = await create_target(cfg);
        const troops = { ram: 1 };
        let pool: PoolTarget[] = [
            [501, 500, "0", null, null], // 9:45
            [502, 500, "0", null, null], // 10:15
            [503, 500, "0", null, null], // 10:45
            [504, 500, "0", null, null], // 11:15
            [505, 500, "0", null, null], // 11:45
            [506, 500, "0", null, null], // 12:15
            [507, 500, "0", null, null], // 12:45
        ]
        pool = target.apply_filter(pool, troops);
        assert(() => pool.length == 3);
    });

    test_runner.test('pool date_ranges datetime multiple', async function () {
        const cfg = {
            data_provider: new DataProvider(new Date(2021, 10, 27, 9, 15, 0)),
            settings: get_default_settings()
        };
        cfg.settings.date_ranges.push(
            [[27, 11, 2021, 10, 0], [27, 11, 2021, 11, 30]],
            [[27, 11, 2021, 10, 0], [27, 11, 2021, 12, 30]],
        )
        const target = await create_target(cfg);
        const troops = { ram: 1 };
        let pool: PoolTarget[] = [
            [501, 500, "0", null, null], // 9:45
            [502, 500, "0", null, null], // 10:15
            [503, 500, "0", null, null], // 10:45
            [504, 500, "0", null, null], // 11:15
            [505, 500, "0", null, null], // 11:45
            [506, 500, "0", null, null], // 12:15
            [507, 500, "0", null, null], // 12:45
        ]
        pool = target.apply_filter(pool, troops);
        assert(() => pool.length == 3);
    });

    test_runner.test('pool date_ranges time priority', async function () {
        const cfg = {
            data_provider: new DataProvider(new Date(2021, 10, 27, 9, 15, 0)),
            settings: get_default_settings()
        };
        cfg.settings.date_ranges.push(
            [[27, 11, 2021, 8, 0], [27, 11, 2021, 9, 30]],
            [[27, 11, 2021, 12, 0], [27, 11, 2021, 12, 30]],
        )
        const target = await create_target(cfg);
        const troops = { ram: 1 };
        let pool: PoolTarget[] = [
            [501, 500, "0", null, null], // 9:45
            [502, 500, "0", null, null], // 10:15
            [503, 500, "0", null, null], // 10:45
            [504, 500, "0", null, null], // 11:15
            [505, 500, "0", null, null], // 11:45
            [506, 500, "0", null, null], // 12:15
            [507, 500, "0", null, null], // 12:45
        ]
        pool = target.apply_filter(pool, troops);
        assert(() => pool.length == 1);
        assert(() => pool[0][0] == 506);
    });

    await test_runner.run();
})();