import { assert, assertException, TestRunner } from '../framework';
import { FakingSettings } from '../../src/Faking/Faking';
import { Resources } from '../../src/Faking/Faking.resources';
import { DataProvider } from '../../src/inf/DataProvider';
import { FakingMapFiles } from './mocks/MapFiles';
import { PoolGenerator } from '../../src/Faking/Faking.targets.pool';

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
            "allies": '',
            "ally_tags": '',
            "include_barbarians": false,
            "boundaries_box": [
                // { min_x: 400, max_x: 500, min_y: 400, max_y: 500 },
            ],
            "boundaries_circle": [
                // { r: 30, center: [500, 500] }
            ],
            "blocking_enabled": false,
            "blocking_local": { "time_s": 5, "count": 1, "block_players": true, "scope": "village" },
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

    const create_target = function (settings: FakingSettings = null): PoolGenerator {
        const map_files = new FakingMapFiles(data_provider);
        return new PoolGenerator(map_files, settings);
    };

    test_runner.test('pool empty', async function () {
        const settings = get_default_settings();
        const target = create_target(settings);
        await assertException(async () => {
            const pool = await target.pool_get();
        }, Resources.ERROR_POOL_EMPTY);
    });

    test_runner.test('pool coords', async function () {
        const settings = get_default_settings();
        settings.coords = '503|486 500|507 503|510'
        const target = create_target(settings);
        const pool = await target.pool_get();
        assert(() => pool.length === 3);
    });

    test_runner.test('pool players', async function () {
        const settings = get_default_settings();
        settings.players = '*Skatek*';
        const target = create_target(settings);
        const pool = await target.pool_get();
        assert(() => pool.length > 0);
    });

    test_runner.test('pool allies', async function () {
        const settings = get_default_settings();
        settings.allies = '*Forever*';
        const target = create_target(settings);
        const pool = await target.pool_get();
        assert(() => pool.length > 0);
    });

    test_runner.test('pool ally_tags', async function () {
        const settings = get_default_settings();
        settings.ally_tags = '*F*';
        const target = create_target(settings);
        const pool = await target.pool_get();
        assert(() => pool.length > 0);
    });

    test_runner.test('pool include_barbarians', async function () {
        const settings = get_default_settings();
        settings.include_barbarians = true;
        const target = create_target(settings);
        const pool = await target.pool_get();
        assert(() => pool.length === 271);
        console.log(pool);
    });

    test_runner.test('pool boundaries_box', async function () {
        const settings = get_default_settings();
        settings.include_barbarians = true;
        settings.boundaries_box = [
            { min_x: 495, max_x: 500, min_y: 495, max_y: 500 },
            { min_x: 500, max_x: 505, min_y: 500, max_y: 505 }
        ];
        const target = create_target(settings);
        const pool = await target.pool_get();
        assert(() => pool.length > 0 && pool.length < 100);
    });

    test_runner.test('pool boundaries_circle', async function () {
        const settings = get_default_settings();
        settings.include_barbarians = true;
        settings.boundaries_circle = [
            { x: 495, y: 495, r: 5 },
            { x: 505, y: 505, r: 5 }
        ];
        const target = create_target(settings);
        const pool = await target.pool_get();
        assert(() => pool.length > 0 && pool.length < 100);
    });

    await test_runner.run();
})();