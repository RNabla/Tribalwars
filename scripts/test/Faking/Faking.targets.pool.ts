import { assert, assertException, TestRunner } from '../framework';
import { FakingSettings } from '../../src/Faking/Faking';
import { Resources } from '../../src/Faking/Faking.resources';
import { DataProvider } from '../../src/inf/DataProvider';
import { FakingMapFiles } from './mocks/MapFiles';
import { LAYOUT_TARGET_X, LAYOUT_TARGET_Y, PoolGenerator } from '../../src/Faking/Faking.targets.pool';
import { get_default_settings } from './Faking';

!(async function () {
    const test_runner = TestRunner.create('Faking');
    const data_provider = new DataProvider();

    const create_target = function (settings: FakingSettings = null): PoolGenerator {
        const map_files = new FakingMapFiles(data_provider);
        return new PoolGenerator(map_files, settings);
    };

    const assertEmptyPool = async function (target: PoolGenerator) {
        await assertException(async () => {
            await target.pool_get();
        }, Resources.ERROR_POOL_EMPTY);
    }

    test_runner.test('pool empty', async function () {
        const settings = get_default_settings();
        const target = create_target(settings);
        const pool = await target.pool_get();
        assert(() => pool.length === 0);
    });

    test_runner.test('pool coords', async function () {
        const settings = get_default_settings();
        settings.coords = '503|486 500|507 503|510'
        const target = create_target(settings);
        const pool = await target.pool_get();
        assert(() => pool.length === 3);
    });

    test_runner.test('pool coords duplicates are kept', async function () {
        const settings = get_default_settings();
        settings.coords = '503|486 503|486 500|507 503|510'
        const target = create_target(settings);
        const pool = await target.pool_get();
        assert(() => pool.length === 4);
    });

    test_runner.test('pool coords duplicates can be specified with :', async function () {
        const settings = get_default_settings();
        settings.coords = '503|486:4 500|507 503|510 503|486:2'
        const target = create_target(settings);
        const pool = await target.pool_get();
        assert(() => pool.length === 8);
    });

    test_runner.test('pool [ players | player_ids ]', async function () {
        const override = { "players": "*Skatek*", "player_ids": "699559694" };
        for (const key in override) {
            const settings = get_default_settings();
            settings[key] = override[key];
            const target = create_target(settings);
            const pool = await target.pool_get();
            assert(() => pool.length > 0);
        }
    });

    test_runner.test('pool [ allies | ally_tags | ally_ids ]', async function () {
        const override = { "allies": "*Forever*", "ally_tags": "*F*", "ally_ids": "3" };
        for (const key in override) {
            const settings = get_default_settings();
            settings[key] = override[key];
            const target = create_target(settings);
            const pool = await target.pool_get();
            assert(() => pool.length == 1);
            assert(() => pool[0][LAYOUT_TARGET_X] == 505);
            assert(() => pool[0][LAYOUT_TARGET_Y] == 509);
        }
    });

    test_runner.test('pool [ exclude_players | exclude_player_ids ] x [ coords ]', async function () {
        const left = { "exclude_players": "jans665", "exclude_player_ids": "8594320" };
        const right = { "coords": "505|509" };

        for (const key2 in right) {
            const settings = get_default_settings();
            settings[key2] = right[key2];
            const target = create_target(settings);
            const pool = await target.pool_get();
            assert(() => pool.length > 0, "Pool should be non empty before testing exclusion");
        }

        for (const key1 in left) {
            for (const key2 in right) {
                const settings = get_default_settings();
                settings[key1] = left[key1];
                settings[key2] = right[key2];
                const target = create_target(settings);
                await assertEmptyPool(target);
            }
        }
    });

    test_runner.test('pool [ exclude_players | exclude_player_ids ] x [ allies | ally_tags | ally_ids ]', async function () {
        const left = { "exclude_players": "jans665", "exclude_player_ids": "8594320" };
        const right = { "allies": "*Forever*", "ally_tags": "*F*", "ally_ids": "3" };

        for (const key2 in right) {
            const settings = get_default_settings();
            settings[key2] = right[key2];
            const target = create_target(settings);
            const pool = await target.pool_get();
            assert(() => pool.length > 0, "Pool should be non empty before testing exclusion");
        }

        for (const key1 in left) {
            for (const key2 in right) {
                const settings = get_default_settings();
                settings[key1] = left[key1];
                settings[key2] = right[key2];
                const target = create_target(settings);
                await assertEmptyPool(target);
            }
        }
    });

    test_runner.test('pool [ exclude_allies | exclude_ally_tags | exclude_ally_ids ] x [ coords ]', async function () {
        const left = { "exclude_allies": "*Forever*", "exclude_ally_tags": "*F*", "exclude_ally_ids": "3" };
        const right = { "coords": "505|509" };

        for (const key2 in right) {
            const settings = get_default_settings();
            settings[key2] = right[key2];
            const target = create_target(settings);
            const pool = await target.pool_get();
            assert(() => pool.length > 0, "Pool should be non empty before testing exclusion");
        }

        for (const key1 in left) {
            for (const key2 in right) {
                const settings = get_default_settings();
                settings[key1] = left[key1];
                settings[key2] = right[key2];
                const target = create_target(settings);
                await assertEmptyPool(target);
            }
        }
    });

    test_runner.test('pool [ exclude_allies | exclude_ally_tags | exclude_ally_ids ] x [ players | player_ids ]', async function () {
        const left = { "exclude_allies": "*Forever*", "exclude_ally_tags": "*F*", "exclude_ally_ids": "3" };
        const right = { "players": "jans665", "player_ids": "8594320" };

        for (const key2 in right) {
            const settings = get_default_settings();
            settings[key2] = right[key2];
            const target = create_target(settings);
            const pool = await target.pool_get();
            assert(() => pool.length > 0, "Pool should be non empty before testing exclusion");
        }

        for (const key1 in left) {
            for (const key2 in right) {
                const settings = get_default_settings();
                settings[key1] = left[key1];
                settings[key2] = right[key2];
                const target = create_target(settings);
                await assertEmptyPool(target);
            }
        }
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

    test_runner.test('pool boundaries_box + boundaries_circle => union', async function () {
        const settings = get_default_settings();
        settings.include_barbarians = true;
        settings.boundaries_circle = [
            { x: 505, y: 505, r: 5 }
        ];
        settings.boundaries_box = [
            { min_x: 495, max_x: 500, min_y: 495, max_y: 500 },
        ];
        const target = create_target(settings);
        const pool = await target.pool_get();
        assert(() => pool.length > 0 && pool.length < 100);
    });

    await test_runner.run();
})();