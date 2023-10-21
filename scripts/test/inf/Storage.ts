import { TestRunner } from '../framework';
import { assert } from '../framework';
import { StorageFactory } from '../../src/inf/Storage';
import { sleep } from '../../src/inf/Helper';
import { DataProvider } from '../../src/inf/DataProvider';

interface TestItem {
    number: number
};
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
        const test_item: TestItem = { number: 42 };
        await storage.set_item(namespace, '42', test_item, 1);
        const item = await storage.get_item<TestItem>(namespace, '42');
        assert(() => null !== item);
        assert(() => 42 === item.value.number);
        assert(() => !isNaN(item.expiration_time_s));
    });

    test_runner.test('getItem respects expired items', async () => {
        const test_item: TestItem = { number: 42 };
        await storage.set_item(namespace, '43', test_item, 1);
        await sleep(2000);
        const item = await storage.get_item<TestItem>(namespace, '43');
        assert(() => null === item);
    });

    test_runner.test('object can be used as a key', async () => {
        const test_item: TestItem = { number: 42 };
        const key1 = { x: 44 };
        const key2 = { x: 44 };
        assert(() => key1 !== key2);
        await storage.set_item(namespace, key1, test_item, 1);
        const item = await storage.get_item<TestItem>(namespace, key2);
        assert(() => item !== null);
        assert(() => item.value.number === 42);
    });

    test_runner.test('get_or_add_item caches computed value', async function () {
        const key = { x: 45 };
        const test_item: TestItem = { number: 42 };

        const factory = async function () {
            test_item.number++;
            const item = {
                name: '',
                expiration_time_s: data_provider.get_current_timestamp_s() + 1,
                value: test_item,
            };
            await sleep(700);
            return item;
        };

        var item = await storage.get_or_add_item(namespace, key, factory);

        for (var i = 0; i < 3; i++) {
            // as it takes 700 ms to compute value and ttl is 1000 ms this asserts that cached value is returned
            var item = await storage.get_or_add_item(namespace, key, factory);
            assert(() => item.value.number === 43);
        }
    });

    await test_runner.run();
})();


