import { assertException, TestRunner } from '../framework';
import { Faking, FakingSettings } from '../../src/Faking/Faking';
import { Resources } from '../../src/Faking/Faking.resources';
import { DocumentProvider } from '../mocks/Document';
import { TribalWarsProvider } from '../TribalWars';
import { WorldInfoType } from '../../src/inf/MapFiles';
import { DataProvider } from '../../src/inf/DataProvider';
import { FakingDocumentProvider } from './mocks/Document';
import { FakingMapFiles } from './mocks/MapFiles';

!(async function () {
    const test_runner = TestRunner.create('Faking');
    const namespace = 'Hermitowski.Faking.test';

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
            "allies": '',
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

    const get_default_tribalwars_provider = function (): TribalWarsProvider {
        return new TribalWarsProvider({
            screen: "place",
            // units: ["spear", "sword", "axe", "archer", "spy", "light", "marcher", "heavy", "ram", "catapult", "knight", "snob", "militia"],
            units: ["spear", "sword", "axe", "spy", "light", "heavy", "ram", "catapult", "knight", "snob", "militia"],
            village: { x: 500, y: 500, id: 42, points: 9000 }
        });
    }

    const data_provider = new DataProvider();

    test_runner.test('default settings', async function () {
        const map_files = new FakingMapFiles(data_provider);
        const document = new FakingDocumentProvider('place');
        const tribalwars = get_default_tribalwars_provider();
        const faking = new Faking(namespace, data_provider, map_files, document, tribalwars);
        const settings = get_default_settings();
        settings.players = 'He He Hermitowski';
        await assertException(async () => {
            await faking.main(settings);
        }, Resources.ERROR_POOL_EMPTY);
    });

    await test_runner.run();
})();