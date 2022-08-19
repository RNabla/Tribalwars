import { assert, assertException, TestRunner } from '../framework';
import { FakingSettings } from '../../src/Faking/Faking';
import { WorldInfoType } from '../../src/inf/MapFiles';
import { FakingMapFiles } from './mocks/MapFiles';
import { TargetSelector } from '../../src/Faking/Faking.targets';
import { DataProvider } from '../mocks/DataProvider';
import { Resources } from '../../src/Faking/Faking.resources';

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
            "player_ids": '',
            "allies": '',
            "ally_tags": '',
            "ally_ids": '',
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

    const data_provider = new DataProvider(new Date(2021, 10, 27));

    const get_default_instance = async function (settings: FakingSettings = null): Promise<TargetSelector> {
        const map_files = new FakingMapFiles(data_provider);
        const world_info = await map_files.get_world_info([WorldInfoType.unit_info, WorldInfoType.config]);
        return new TargetSelector(
            world_info,
            map_files,
            data_provider,
            {
                screen: "place",
                units: ["spear", "sword", "axe", "spy", "light", "heavy", "ram", "catapult", "knight", "snob", "militia"],
                village: { x: 400, y: 400, id: 42, points: 9000 }
            },
            settings,
        );
    };

    test_runner.test('targets snob max_distance', async function () {
        const settings = get_default_settings();
        settings.include_barbarians = true;
        const target = await get_default_instance(settings);
        await assertException(async () => {
            await target.select_target({ snob: 1 });
        }, Resources.ERROR_POOL_EMPTY_SNOBS);
    });


    await test_runner.run();
})();