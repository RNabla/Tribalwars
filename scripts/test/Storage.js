import { TestRunner } from './framework';
import { assert } from './framework';
import { Storage, SCHEMA_COLUMN_EXPIRATION_TIME_S, SCHEMA_COLUMN_VALUE, SCHEMA_COLUMN_NAME } from '../src/inf/Storage';
import { sleep, get_timestamp_s } from '../src/inf/Helper';

!(async function () {
    const test_runner = TestRunner.create('Storage');
    const namespace = 'Hermitowski.Storage.test';

    const storage = await Storage.create_instance();

    test_runner.test('getItem with no prior item returns null', async () => {
        const item = await storage.get_item(namespace, '41');
        assert(() => null === item);
    });

    test_runner.test('getItem returns inserted item', async () => {
        await storage.set_item(namespace, '42', 42, 1);
        const item = await storage.get_item(namespace, '42');
        assert(() => null !== item);
        assert(() => 42 === item[SCHEMA_COLUMN_VALUE]);
        assert(() => !isNaN(item[SCHEMA_COLUMN_EXPIRATION_TIME_S]));
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
        assert(() => item[SCHEMA_COLUMN_VALUE] === 44);
    });

    test_runner.test('get_or_add_item caches computed value', async function () {
        for (let i = 0; i < 10; i++) {
            const key = { x: 45 };
            await storage.get_or_add_item(namespace, key, async function () {
                await sleep(1000);
                return {
                    [SCHEMA_COLUMN_VALUE]: 42,
                    [SCHEMA_COLUMN_EXPIRATION_TIME_S]: get_timestamp_s() + 10
                };
            });
        }
    });

    await test_runner.run();
})();


