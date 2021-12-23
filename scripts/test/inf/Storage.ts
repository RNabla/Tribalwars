import { TestRunner } from '../framework';
import { assert } from '../framework';
import { Storage, StorageFactory } from '../../src/inf/Storage';
import { sleep } from '../../src/inf/Helper';
import { DataProvider } from '../../src/inf/DataProvider';

!(async function () {
    const test_runner = TestRunner.create('Storage');
    const namespace = 'Hermitowski.Storage.test';

    const data_provider = new DataProvider();
    const storage = await StorageFactory.create_instance(data_provider);

    test_runner.test('getItem with no prior item returns null', async () => {
        const item = await storage.get_item(namespace, '41');
        assert(() => null === item);
    });

    test_runner.test('getItem returns inserted item', async () => {
        await storage.set_item(namespace, '42', 42, 1);
        const item = await storage.get_item(namespace, '42');
        assert(() => null !== item);
        assert(() => 42 === item.value);
        assert(() => !isNaN(item.expiration_time_s));
    });

    test_runner.test('getItem respects expired items', async () => {
        await storage.set_item(namespace, '43', 42, 1);
        await sleep(2000);
        const item = await storage.get_item(namespace, '43');
        assert(() => null === item);
    });

    test_runner.test('object can be used as a key', async () => {
        const key1 = { x: 44 };
        const key2 = { x: 44 };
        assert(() => key1 !== key2);
        await storage.set_item(namespace, key1, 44, 1);
        const item = await storage.get_item(namespace, key2);
        assert(() => item !== null);
        assert(() => item.value === 44);
    });

    test_runner.test('get_or_add_item caches computed value', async function () {
        for (let i = 0; i < 10; i++) {
            const key = { x: 45 };
            await storage.get_or_add_item(namespace, key, async function () {
                await sleep(1000);
                return {
                    name: '',
                    expiration_time_s: data_provider.get_current_timestamp_s() + 10,
                    value: 42,
                };
            });
        }
    });

    await test_runner.run();
})();


