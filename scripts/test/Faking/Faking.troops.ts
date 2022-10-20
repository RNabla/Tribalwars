import { assert, assertException, TestRunner } from '../framework';
import { FakingSettings } from '../../src/Faking/Faking';
import { TroopsSelector } from '../../src/Faking/Faking.troops';
import { Resources } from '../../src/Faking/Faking.resources';
import { WorldInfoType } from '../../src/inf/MapFiles';
import { DataProvider } from '../../src/inf/DataProvider';
import { FakingDocumentProvider } from './mocks/Document';
import { FakingMapFiles } from './mocks/MapFiles';

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
            "player_ids": "",
            "allies": '',
            "ally_ids": "",
            "ally_tags": '',
            "include_barbarians": false,
            "boundaries_box": [
                // { min_x: 400, max_x: 500, min_y: 400, max_y: 500 },
            ],
            "boundaries_circle": [
                // { r: 30, center: [500, 500] }
            ],
            "blocking_enabled": false,
            "blocking_local": { "time_s": 5, "count": 1, "block_players": true, "scope": "instance" },
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

    const get_default_instance = async function (settings: FakingSettings = null): Promise<TroopsSelector> {
        const map_files = new FakingMapFiles(data_provider, 'config_169');
        const document = new FakingDocumentProvider('place');
        const world_info = await map_files.get_world_info([WorldInfoType.unit_info, WorldInfoType.config]);
        return new TroopsSelector(
            document,
            world_info,
            {
                screen: "place",
                units: ["spear", "sword", "axe", "spy", "light", "heavy", "ram", "catapult", "knight", "snob", "militia"],
                village: { x: 500, y: 500, id: 42, points: 9000 }
            },
            settings
        );
    };

    test_runner.test('default settings', async function () {
        const settings = get_default_settings();
        const target = await get_default_instance(settings);
        const troops = target.select_troops();
        assert(() => troops.spy === 1)
        assert(() => troops.catapult === 1)
        assert(() => troops.spear === 80);
    });

    test_runner.test('fill_exact', async function () {
        const settings = get_default_settings();
        settings.fill_exact = true;
        const target = await get_default_instance(settings);
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
        const target = await get_default_instance(settings);
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
        const target = await get_default_instance(settings);
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
        const target = await get_default_instance(settings);
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
        const target = await get_default_instance(settings);
        const troops = target.select_troops();
        assert(() => troops.spear === 10000, "spear")
        assert(() => troops.spy === 1, "spy");
        assert(() => troops.catapult === 1, "catapult");
    });

    test_runner.test('fill_troops unit unbounded, limited', async function () {
        const settings = get_default_settings();
        settings.fill_troops = 'spear,spear:5000';
        settings.fill_exact = true;
        const target = await get_default_instance(settings);
        const troops = target.select_troops();
        assert(() => troops.spear === 10307, "spear")
        assert(() => troops.spy === 1, "spy");
        assert(() => troops.catapult === 1, "catapult");
    });

    test_runner.test('troops_templates []', async function () {
        const settings = get_default_settings();
        settings.troops_templates = [];
        const target = await get_default_instance(settings);
        await assertException(async () => {
            target.select_troops();
        }, Resources.ERROR_TROOPS_EMPTY);
    });

    test_runner.test('troops_templates not enough base troops', async function () {
        const settings = get_default_settings();
        settings.troops_templates = [{ light: 42 }];
        const target = await get_default_instance(settings);
        await assertException(async () => {
            target.select_troops();
        }, Resources.ERROR_TROOPS_NOT_ENOUGH);
    });

    test_runner.test('troops_templates redefined base troops', async function () {
        const settings = get_default_settings();
        settings.troops_templates = [{ spear: 42 }];
        const target = await get_default_instance(settings);
        const troops = target.select_troops();
        assert(() => troops.spear === 90, "spear")
    });

    test_runner.test('troops_templates spy:5', async function () {
        const settings = get_default_settings();
        settings.troops_templates = [{ spy: 5 }];
        const target = await get_default_instance(settings);
        const troops = target.select_troops();
        assert(() => troops.spy === 5, "spy")
    });

    test_runner.test('troops_templates spy:1', async function () {
        const settings = get_default_settings();
        settings.troops_templates = [{ spy: 1 }];
        const target = await get_default_instance(settings);
        const troops = target.select_troops();
        assert(() => troops.spear === 88, "spear")
        assert(() => troops.spy === 1, "spy")
    });

    test_runner.test('safeguard', async function () {
        const settings = get_default_settings();
        settings.safeguard = { spear: 5000, sword: 5000 };
        settings.fill_exact = true;
        const target = await get_default_instance(settings);
        const troops = target.select_troops();
        assert(() => troops.spear === 5307, "spear")
        assert(() => troops.sword === 5307, "sword")
    });

    await test_runner.run();
})();