import { assert, assertException, TestRunner } from '../framework';
import { FakingSettings } from '../../src/Faking/Faking';
import { TroopsSelector } from '../../src/Faking/Faking.troops';
import { Resources } from '../../src/Faking/Faking.resources';
import { WorldInfoType } from '../../src/inf/MapFiles';
import { DataProvider } from '../../src/inf/DataProvider';
import { FakingDocumentProvider } from './mocks/Document';
import { FakingMapFiles } from './mocks/MapFiles';
import { get_default_settings, get_default_tribalwars_provider } from './Faking';

!(async function () {
    const test_runner = TestRunner.create('Faking');
    const data_provider = new DataProvider();

    const create_target = async function (settings: FakingSettings = null): Promise<TroopsSelector> {
        const map_files = new FakingMapFiles(data_provider, 'config_169');
        const document = new FakingDocumentProvider('place');
        const world_info = await map_files.get_world_info([WorldInfoType.unit_info, WorldInfoType.config]);
        return new TroopsSelector(
            document,
            world_info,
            get_default_tribalwars_provider().game_data,
            settings
        );
    };

    test_runner.test('default settings', async function () {
        const settings = get_default_settings();
        const target = await create_target(settings);
        const troops = target.select_troops();
        assert(() => troops.spy === 1)
        assert(() => troops.catapult === 1)
        assert(() => troops.spear === 80);
    });

    test_runner.test('fill_exact', async function () {
        const settings = get_default_settings();
        settings.fill_exact = true;
        const target = await create_target(settings);
        const troops = target.select_troops();
        assert(() => troops.spear === 10307, "spear")
        assert(() => troops.sword === 10307, "sword")
        assert(() => troops.axe === 0, "axe")
        assert(() => troops.spy === 368, "spy");
        assert(() => troops.light === 0, "light");
        assert(() => troops.heavy === 0, "heavy");
        assert(() => troops.ram === 0, "ram");
        assert(() => troops.catapult === 77, "catapult");
        assert(() => troops.knight === 0, "knight"); // by default not selected
        assert(() => troops.snob === 0, "snob"); // by default not selected
    });

    test_runner.test('fill_troops respects snobs, knights', async function () {
        const settings = get_default_settings();
        settings.fill_troops = 'knight,snob';
        const target = await create_target(settings);
        const troops = target.select_troops();
        assert(() => troops.spear === 0, "spear")
        assert(() => troops.sword === 0, "sword")
        assert(() => troops.axe === 0, "axe")
        assert(() => troops.spy === 1, "spy");
        assert(() => troops.light === 0, "light");
        assert(() => troops.heavy === 0, "heavy");
        assert(() => troops.ram === 0, "ram");
        assert(() => troops.catapult === 1, "catapult");
        assert(() => troops.knight === 1, "knight");
        assert(() => troops.snob === 1, "snob");
    });

    test_runner.test('fill_troops limit', async function () {
        const settings = get_default_settings();
        settings.fill_troops = 'spear:50,sword';
        const target = await create_target(settings);
        const troops = target.select_troops();
        assert(() => troops.spear === 50, "spear")
        assert(() => troops.sword === 30, "sword")
        assert(() => troops.axe === 0, "axe")
        assert(() => troops.spy === 1, "spy");
        assert(() => troops.light === 0, "light");
        assert(() => troops.heavy === 0, "heavy");
        assert(() => troops.ram === 0, "ram");
        assert(() => troops.catapult === 1, "catapult");
        assert(() => troops.knight === 0, "knight");
        assert(() => troops.snob === 0, "snob");
    });

    test_runner.test('fill_troops limit2', async function () {
        const settings = get_default_settings();
        settings.fill_troops = 'spear:50000,spear';
        settings.fill_exact = true;
        const target = await create_target(settings);
        const troops = target.select_troops();
        assert(() => troops.spear === 10307, "spear")
        assert(() => troops.sword === 0, "sword")
        assert(() => troops.axe === 0, "axe")
        assert(() => troops.spy === 1, "spy");
        assert(() => troops.light === 0, "light");
        assert(() => troops.heavy === 0, "heavy");
        assert(() => troops.ram === 0, "ram");
        assert(() => troops.catapult === 1, "catapult");
        assert(() => troops.knight === 0, "knight");
        assert(() => troops.snob === 0, "snob");
    });

    test_runner.test('fill_troops unit duplicated', async function () {
        const settings = get_default_settings();
        settings.fill_troops = 'spear:5000,spear:5000';
        settings.fill_exact = true;
        const target = await create_target(settings);
        const troops = target.select_troops();
        assert(() => troops.spear === 10000, "spear")
        assert(() => troops.spy === 1, "spy");
        assert(() => troops.catapult === 1, "catapult");
    });

    test_runner.test('fill_troops unit unbounded, limited', async function () {
        const settings = get_default_settings();
        settings.fill_troops = 'spear,spear:5000';
        settings.fill_exact = true;
        const target = await create_target(settings);
        const troops = target.select_troops();
        assert(() => troops.spear === 10307, "spear")
        assert(() => troops.spy === 1, "spy");
        assert(() => troops.catapult === 1, "catapult");
    });

    test_runner.test('troops_templates []', async function () {
        const settings = get_default_settings();
        settings.troops_templates = [];
        const target = await create_target(settings);
        await assertException(async () => {
            target.select_troops();
        }, Resources.ERROR_TROOPS_EMPTY_TEMPLATES);
    });

    test_runner.test('troops_templates [{empty}]', async function () {
        const settings = get_default_settings();
        settings.troops_templates = [{}];
        const target = await create_target(settings);
        await assertException(async () => {
            target.select_troops();
        }, Resources.ERROR_TROOPS_EMPTY_SELECTION);
    });

    test_runner.test('troops_templates not enough base troops', async function () {
        const settings = get_default_settings();
        settings.troops_templates = [{ light: 42 }];
        const target = await create_target(settings);
        await assertException(async () => {
            target.select_troops();
        }, Resources.ERROR_TROOPS_NOT_ENOUGH);
    });

    test_runner.test('troops_templates redefined base troops', async function () {
        const settings = get_default_settings();
        settings.troops_templates = [{ spear: 42 }];
        const target = await create_target(settings);
        const troops = target.select_troops();
        assert(() => troops.spear === 90, "spear")
    });

    test_runner.test('troops_templates spy:5', async function () {
        const settings = get_default_settings();
        settings.troops_templates = [{ spy: 5 }];
        const target = await create_target(settings);
        const troops = target.select_troops();
        assert(() => troops.spy === 5, "spy")
    });

    test_runner.test('troops_templates spy:1', async function () {
        const settings = get_default_settings();
        settings.troops_templates = [{ spy: 1 }];
        const target = await create_target(settings);
        const troops = target.select_troops();
        assert(() => troops.spear === 88, "spear")
        assert(() => troops.spy === 1, "spy")
    });

    test_runner.test('safeguard', async function () {
        const settings = get_default_settings();
        settings.safeguard = { spear: 5000, sword: 5000 };
        settings.fill_exact = true;
        const target = await create_target(settings);
        const troops = target.select_troops();
        assert(() => troops.spear === 5307, "spear")
        assert(() => troops.sword === 5307, "sword")
    });

    await test_runner.run();
})();