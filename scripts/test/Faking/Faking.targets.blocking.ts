import { assert, assertException, TestRunner } from '../framework';
import { FakingSettings } from '../../src/Faking/Faking';
import { Resources } from '../../src/Faking/Faking.resources';
import { FakingMapFiles } from './mocks/MapFiles';
import { PoolTarget } from '../../src/Faking/Faking.targets.pool';
import { PoolBlocker } from '../../src/Faking/Faking.targets.blocking';
import { IMapFiles } from '../../src/inf/MapFiles';
import { DataProvider } from '../../src/inf/DataProvider';
import { sleep } from '../../src/inf/Helper';
import { get_default_settings, get_default_tribalwars_provider } from './Faking';

type Configuration = {
    settings?: FakingSettings,
    map_files: IMapFiles,
    config?: string
};

!(async function () {
    const test_runner = TestRunner.create('Faking');
    const data_provider = new DataProvider();

    const create_target = function (cfg: Configuration = null): PoolBlocker {
        return new PoolBlocker(
            cfg.map_files ?? new FakingMapFiles(data_provider),
            data_provider,
            get_default_tribalwars_provider().game_data,
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
        // 4th
        pool = await target.apply_blocking([pool_target]);
        assert(() => pool.length === 1);
    });

    await test_runner.run();
})();