import { TestRunner } from './framework';
import { assert } from './framework';
import { MapFiles } from '../src/inf/MapFiles';
import { promisify, sleep, get_timestamp_s } from '../src/inf/Helper';

!(async function () {
    const test_runner = TestRunner.create('MapFiles');
    const namespace = 'Hermitowski.MapFiles.test';

    const map_files = await MapFiles.create_instance(namespace);

    test_runner.test('get_world_info player', async () => {
        const item = await map_files.get_world_info(
            ['unit_info', 'building_info', 'config', 'player', 'village', 'ally']);
        assert(() => null !== item);
        assert(() => item.player.length > 0);
        assert(() => item.player[0].id !== null);
        assert(() => item.player[0].name !== null);
        assert(() => item.player.length > 0);
    });

    test_runner.test('get_world_info player', async () => {
        const item = await map_files.get_world_info(['player']);
        assert(() => null !== item);
        assert(() => item.player.length > 0);
        assert(() => item.player[0].id !== null);
        assert(() => item.player[0].name !== null);
        assert(() => item.player[0].ally_id !== null);
    });

    test_runner.test('get_world_info ally', async () => {
        const item = await map_files.get_world_info(['ally']);
        assert(() => null !== item);
        assert(() => item.ally.length > 0);
        assert(() => item.ally[0].id !== null);
        assert(() => item.ally[0].name !== null);
        assert(() => item.ally[0].tag !== null);
    });

    test_runner.test('get_world_info village', async () => {
        const item = await map_files.get_world_info(['village']);
        assert(() => null !== item);
        assert(() => item.village.length > 0);
        assert(() => item.village[0].id !== null);
        assert(() => item.village[0].player_id !== null);
        assert(() => item.village[0].x !== null);
        assert(() => item.village[0].y !== null);
    });

    test_runner.test('get_world_info configs', async () => {
        const item = await map_files.get_world_info(['config', 'unit_info', 'building_info']);
        assert(() => null !== item);
        assert(() => item['config'] != null);
        assert(() => item['unit_info'] != null);
        assert(() => item['building_info'] != null);
    });

    test_runner.test('getItem with no prior item returns null', async () => {
        const item = await map_files.get_item('41');
        assert(() => null === item);
    });

    test_runner.test('getItem returns inserted item', async () => {
        await map_files.set_item('42', 42, 1);
        const item = await map_files.get_item('42');
        assert(() => 42 == item);
    });

    test_runner.test('getItem respects expired items', async () => {
        await map_files.set_item('43', 42, 1);
        await sleep(2000);
        const item = await map_files.get_item('43');
        assert(() => null === item);
    });

    test_runner.test('object can be used as a key', async () => {
        const key1 = { x: 44 };
        const key2 = { x: 44 };
        assert(() => key1 !== key2);
        await map_files.set_item(key1, 44, 1);
        const item = await map_files.get_item(key2);
        assert(() => item === 44);
    });

    test_runner.test('get_or_compute passes correct args to factory method', async () => {
        const key1 = { x: 44 };
        const key2 = { x: 44 };
        assert(() => key1 !== key2);
        const world_info_entities = ['village', 'player', 'ally', 'config', 'unit_info', 'building_info']
        const additional_args = { x: 42 };
        const item = await map_files.get_or_compute(async function (args1, args2) {
            assert(() => args1 != null);
            assert(() => args2 != null);
            for (const key of world_info_entities) {
                assert(() => args1[key] != null);
            }
            assert(() => JSON.stringify(args2) == JSON.stringify(additional_args));
            return 42;
        }, world_info_entities, additional_args);
        assert(() => item === 42);
    });

    test_runner.test('get_or_compute caches result', async () => {
        for (let i = 0; i < 10; i++) {
            const additional_args = { x: 46 };
            const item = await map_files.get_or_compute(async function (args1, args2) {
                await sleep(1000);
                return args2.x;
            }, ['config'], additional_args);
            assert(() => item === 46);
        }
    });

    test_runner.test('get_or_compute_dynamic caches result', async () => {
        for (let i = 0; i < 10; i++) {
            const additional_args = { x: 46 };
            const item = await map_files.get_or_compute_dynamic(async function (args1, args2) {
                await sleep(1000);
                return args1.x;
            }, additional_args, 10);
            assert(() => item === 46);
        }
    });

    await test_runner.run();
})();


