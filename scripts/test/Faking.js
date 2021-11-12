import { assert, assertException, TestRunner } from './framework';
import { Faking } from '../src/Faking/Faking';


// console.clear();
// window['Hermitowski.Tracing'] = {}
// window['Hermitowski.Tracing'] = { 'Hermitowski.Faking': true }
// HermitowskieFejki = {
//     safeguard: { spear: 5000 },
//     troops_templates: [{}],
//     fill_troops: 'spear:2,sword:2,spear:5,spear:2,sword',
//     fill_exact: false,
//     // coords: '475|558 500|500 601|601',
//     coords: '',
//     players: '',
//     allies: 'Insomnia in Dreams',
//     // ally_tags: 'ŁPK..',
//     include_barbarians: true,
//     changing_village_enabled: false,
//     boundaries: [
//         // { min_x: 400, max_x: 500, min_y: 400, max_y: 500 }, 
//         // { r: 2, center: [476, 559] },
//         { r: 40, center: '476|559' },
//         // { r: 3, center: [508, 637] },
//         // { r: 3, center: [565, 389] },
//         // { r: 5, center: [409, 453] }
//     ],
//     // forum_config: {
//     //     thread_id: 8590,
//     //     // page: 1,
//     //     spoiler_name: "xd1",
//     // },
//     blocking_enabled: false,
//     blocking_local: {
//         time: 600,
//         count: 100,
//         block_players: false,
//         scope: 'exclusive'
//     },
//     blocking_global: [
//         { time: 600, count: 100, name: 'global_1' },
//         { time: 600, count: 100, name: 'global_2' },
//         { time: 600, count: 100, name: 'unique players', block_players: false }
//     ],
//     skip_night_bonus: true,
//     date_ranges: [
//         // '23:00 - 23:59',
//         // '5 23:00 - 6 23:59',
//         // '5 23:00 - 6 23:59'
//         // '13:43 - 13:46',
//         // '02.11.2021 13:46 - 02.11.2021 13:56',
//     ],
// };



!(async function () {
    const test_runner = TestRunner.create('Faking');
    const namespace = 'Hermitowski.Faking.test';
    const resources = require('../src/Faking/Faking.resources.json');

    test_runner.test('no config', async () => {
        await assertException(async () => {
            await Faking.main(namespace, undefined);
        }, resources.ERROR_CONFIGURATION_MISSING);
    });

    test_runner.test('full config recognised', async () => {
        await Faking.main(namespace, {
            "safeguard": { "spear": 1 },
            "troops_templates": [
                { "spy": 1, "ram": 1 },
                { "spy": 1, "catapult": 1 },
                { "ram": 1 },
                { "catapult": 1 }
            ],
            "fill_exact": false,
            "fill_troops": 'spear,sword,axe,archer,spy,light,marcher,heavy,ram,catapult',
            "changing_village_enabled": true,
            "coords": '500|500 501|501',
            "players": 'He He Hermitowski',
            "allies": 'aaaa',
            "ally_tags": 'aa',
            "include_barbarians": true,
            "boundaries": [
                { min_x: 500, max_x: 530, min_y: 470, max_y: 530 },
                { r: 30, center: [500, 500] }
            ],
            // "forum_config": {
            //     "thread_id": null,
            //     "page": 0,
            //     "spoiler_name": null,
            //     "ttl": 300
            // },
            "blocking_enabled": true,
            "blocking_local": { "time_s": 5, "count": 3, "block_players": true, "scope": "village" },
            "blocking_global": [
                { time_s: 100, count: 3, name: 'global_1', block_players: false }
            ],
            "skip_night_bonus": true,
            "date_ranges": [
                // [dd.mm.yyyy hh:ss - dd.mm.yyyy hh:ss]
                // [hh:ss - hh:ss]
            ]
        });
    });


    await test_runner.run();
})();