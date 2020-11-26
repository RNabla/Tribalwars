// ==UserScript==
// @name         Hermitowskie Burzenie Wiosek
// @namespace    https://hermitowski.com/
// @version      1.
// @description  try to take over the world!
// @author       Hermitowski
// @match        https://*.plemiona.pl/game.php?*&screen=report*&view=*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    const building_data_input = document.querySelector('#attack_spy_building_data');
    let first_send = false;

    if (!building_data_input) { return; }

    const village_id = document.querySelector('#attack_info_def .village_anchor').dataset['id'];

    const building_data = Object.fromEntries(JSON.parse(building_data_input.value).map(x => [x.id, x]));

    const ram_lookup = {
        1: 2,
        2: 4,
        3: 8,
        4: 11,
    };

    const light_lookup = {
        0: 1,
        1: 4,
        2: 4,
        3: 6,
        4: 15
    }

    const catapult_lookup = {
        1: 2,
        2: 2,
        3: 2,
        4: 3,
        5: 3,
        6: 3,
        7: 3,
        8: 3,
        9: 4,
        10: 4,
        11: 4,
        12: 5,
        13: 5,
        14: 6,
        15: 6,
        16: 6,
        17: 7,
        18: 8,
        19: 8,
        20: 9,
    };

    const min_building_level = {
        'main': 1,
        'storage': 1,
        'farm': 1,
    };

    const get_building_name = function (cell) {
        const child = cell.children[0];
        if (child.tagName === "IMG") {
            return child.src.split('/').pop().split('.')[0];
        }
        return null;
    };

    const handler = function (event) {
        const anchor = event.target;
        const building_name = get_building_name(event.target.parentNode.parentNode.children[0]);

        const min_level = building_name in min_building_level
            ? min_building_level[building_name]
            : 0;

        if (building_data[building_name].level <= min_level) { return; }

        setTimeout(function (anchor, building_name, min_level) {
            if (building_data['wall'] && building_data['wall'].level > 0) {
                building_data['wall'].level = 0;
                building_data['wall'].text.innerText = '0';
            }

            building_data[building_name].level -= 1;
            anchor.innerText = building_data[building_name].level;
            console.log(building_name, min_level);

            if (building_data[building_name].level == min_level) {
                building_data[building_name].anchor.remove();
                building_data[building_name].text.innerText = min_level;
                building_data[building_name].text.style.cursor = '';
            }

            for (const building of Object.values(building_data)) {
                building['anchor'].href = get_link(building.id);
            }

        }, 0, anchor, building_name, min_level);
    };

    const get_link = function (building_name) {
        const params = { target: village_id, spy: 1 };


        if (building_name !== 'wall') {
            params['catapult'] = catapult_lookup[building_data[building_name].level];
        }

        if (building_data['wall'] && building_data['wall'].level > 0) {
            params['ram'] = ram_lookup[building_data['wall'].level];
            params['light'] = light_lookup[building_data['wall'].level];
            first_send = true;
        } else {
            if (!first_send) {
                first_send = true;
                params['ram'] = 2;
            }
            params['light'] = 1;
        }

        params['building_name'] = building_name;

        return TribalWars.buildURL('GET', 'place', params);
    };

    for (const selector of ['#attack_spy_buildings_left', '#attack_spy_buildings_right']) {
        const table = document.querySelector(selector);
        for (let i = 1; i < table.rows.length; i++) {
            const building_name = get_building_name(table.rows[i].cells[0]);
            if (!building_name) { continue; }
            const min_level = building_name in min_building_level
                ? min_building_level[building_name]
                : 0;
            if (building_data[building_name].level <= min_level) { continue; }
            table.rows[i].cells[1].innerText = '';
            const anchor = document.createElement('a');
            anchor.innerText = building_data[building_name]['level'];
            anchor.href = get_link(building_name);
            anchor.onclick = handler;
            building_data[building_name]['target'] = table.rows[i].cells[0];
            building_data[building_name]['text'] = table.rows[i].cells[1];
            building_data[building_name]['anchor'] = anchor;
            table.rows[i].cells[1].append(anchor);
            table.rows[i].cells[1].style.cursor = 'pointer';
        }
    }
})();

