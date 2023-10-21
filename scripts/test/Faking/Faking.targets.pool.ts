import { assert, assertException, TestRunner } from '../framework';
import { FakingSettings } from '../../src/Faking/Faking';
import { Resources } from '../../src/Faking/Faking.resources';
import { DataProvider } from '../../src/inf/DataProvider';
import { FakingMapFiles } from './mocks/MapFiles';
import { PoolGenerator } from '../../src/Faking/Faking.targets.pool';
import { get_default_settings } from './Faking';

!(async function () {
    const test_runner = TestRunner.create('Faking');
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