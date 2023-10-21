import { TestRunner } from '../framework';
import { assert } from '../framework';
import { MapFilesFactory, WorldInfoType } from '../../src/inf/MapFiles';
import { sleep } from '../../src/inf/Helper';
import { DataProvider } from '../../src/inf/DataProvider';

!(async function () {
    const test_runner = TestRunner.create('MapFiles');
    const namespace = 'Hermitowski.MapFiles.test';
    const data_provider = new DataProvider();

    const map_files = await MapFilesFactory.create_instance(namespace, data_provider);

    test_runner.test('get_world_info player', async () => {
        const world_info = await map_files.get_world_info([WorldInfoType.player]);
        assert(() => null !== world_info);
        const item = world_info.player;
        assert(() => item.length > 0);
        assert(() => item[0].id != null);
        assert(() => item[0].name != null);
        assert(() => item[0].ally_id != null);
    });

    test_runner.test('get_world_info ally', async () => {
        const world_info = await map_files.get_world_info([WorldInfoType.ally]);
        assert(() => null !== world_info);
        const item = world_info.ally;
        assert(() => item.length > 0);
        assert(() => item[0].id != null);
        assert(() => item[0].name != null);
        assert(() => item[0].tag != null);
    });

    test_runner.test('get_world_info village', async () => {
        const world_info = await map_files.get_world_info([WorldInfoType.village]);
        assert(() => null !== world_info);
        const item = world_info.village;
        assert(() => item.length > 0);
        assert(() => item[0].id != null);
        assert(() => item[0].x != null);
        assert(() => item[0].y != null);
        assert(() => item[0].player_id != null);
    });

    test_runner.test('get_world_info configs', async () => {
        const world_info = await map_files.get_world_info(
            [WorldInfoType.config, WorldInfoType.building_info, WorldInfoType.unit_info]
        );
        assert(() => null !== world_info);
        console.log(world_info);
        assert(() => world_info.config != null);
        assert(() => world_info.building_info != null);
        assert(() => world_info.unit_info != null);
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
        const world_info_entities = [
            WorldInfoType.village,
            WorldInfoType.player,
            WorldInfoType.ally,
            WorldInfoType.config,
            WorldInfoType.unit_info,
            WorldInfoType.building_info,
        ];
        const additional_args = { x: 42 };
        const item = await map_files.get_or_compute(async function (args1, args2) {
            assert(() => args1 != null);
            assert(() => args2 != null);
            assert(() => args1.village != null);
            assert(() => args1.player != null);
            assert(() => args1.ally != null);
            assert(() => args1.config != null);
            assert(() => args1.unit_info != null);
            assert(() => args1.building_info != null);
            assert(() => JSON.stringify(args2) == JSON.stringify(additional_args));
            return 42;
        }, world_info_entities, additional_args);
        assert(() => item === 42);
    });

    test_runner.test('get_or_compute caches result', async () => {
        for (let i = 0; i < 10; i++) {
            const additional_args = { x: 46 };
            const item = await map_files.get_or_compute(async function (args1, args2) {
                assert(() => args1.config != null);
                await sleep(1000);
                return args2.x;
            }, [WorldInfoType.config], additional_args);
            assert(() => item === 46);
        }
    });

    test_runner.test('get_or_compute_dynamic caches result', async () => {
        for (let i = 0; i < 10; i++) {
            const additional_args = { x: 46 };
            const item = await map_files.get_or_compute_dynamic(async function (args1) {
                await sleep(1000);
                assert(() => JSON.stringify(args1) == JSON.stringify(additional_args));
                return args1.x;
            }, additional_args, 10);
            assert(() => item === 46);
        }
    });

    await test_runner.run();
})();


