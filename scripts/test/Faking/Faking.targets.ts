import { assertException, assert, TestRunner } from '../framework';
import { FakingSettings } from '../../src/Faking/Faking';
import { WorldInfoType } from '../../src/inf/MapFiles';
import { FakingMapFiles } from './mocks/MapFiles';
import { TargetSelector } from '../../src/Faking/Faking.targets';
import { DataProvider } from '../mocks/DataProvider';
import { Resources } from '../../src/Faking/Faking.resources';
import { get_default_settings } from './Faking';
import { GameData } from '../../src/inf/TribalWars';

!(async function () {
    const test_runner = TestRunner.create('Faking');
    const data_provider = new DataProvider(new Date(2021, 10, 27));

    const create_target = async function (settings: FakingSettings = null): Promise<TargetSelector> {
        const map_files = new FakingMapFiles(data_provider);
        const world_info = await map_files.get_world_info([WorldInfoType.unit_info, WorldInfoType.config]);
        const game_data: GameData = {
            screen: "place",
            units: ["spear", "sword", "axe", "spy", "light", "heavy", "ram", "catapult", "knight", "snob", "militia"],
            village: { x: 300, y: 300, id: 42, points: 9000 },
            player: { id: 2137, ally: "ally" },
            mode: "place",
            csrf: ""
        };
        return new TargetSelector(
            world_info,
            map_files,
            data_provider,
            game_data,
            settings,
        );
    };

    test_runner.test('targets snob max_distance', async function () {
        const settings = get_default_settings();
        settings.include_barbarians = true;
        const sut = await create_target(settings);
        const target = await sut.select_target({ spear: 1 });
        assert(() => target != null)
        await assertException(async () => {
            await sut.select_target({ snob: 1 });
        }, Resources.ERROR_POOL_EMPTY_SNOBS);
    });


    await test_runner.run();
})();