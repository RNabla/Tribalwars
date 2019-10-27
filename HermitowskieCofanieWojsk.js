(function (TribalWars) {
    let i18n = {
        Filters: 'Filtry',
        CoordsFilters: 'Wsp\u{F3}\u{142}rzedne',
        VillageNames: 'Nazwa',
        PlayerNames: 'Gracz',
        TribesNames: 'Plemi\u{119}',
        TroopsFound: 'Znalezione wsparcie:',
        SupportsWith: 'wspiera inne wioski przy u\u{17C}yciu',
        Other: 'Inne',
        NoMatches: 'Brak wspieranych wiosek pasuj\u{105}cych do ustawionych filtr\u{F3}w',
        Start: 'Zaznacz wioski'
    };

    let HermitowskieCofanieWojsk = {
        name: 'HermitowskieCofanieWojsk',
        filters: [i18n.CoordsFilters, i18n.VillageNames, i18n.PlayerNames, i18n.TribesNames],
        coords_filter: [],
        villages_filter: [],
        players_filter: [],
        tribes_filter: [],
        selected_units: {},
        villages_with_off_troops: new Map(),
        init: function () {
            if (HermitowskieCofanieWojsk.checkScreen()) {
                HermitowskieCofanieWojsk.createGui();
            }
        },
        checkScreen: function () {
            const url_params = new URLSearchParams(location.href);
            if (url_params.get('mode') !== 'units' || url_params.get('screen') !== 'overview_villages' || url_params.get('type') !== 'away_detail') {
                location.href = TribalWars.buildURL('GET', 'overview_villages', { mode: 'units', type: 'away_detail' });
                return false;
            }
            return true;
        },
        scanTable: function () {
            let rows = document.querySelector('#units_table').rows;
            let origin_village = undefined;
            for (const row of rows) {
                if (row.classList.contains('units_away')) {
                    origin_village = HermitowskieCofanieWojsk.getOriginVillage(row);
                    continue;
                }
                if (row.classList.contains('row_a') || row.classList.contains('row_b')) {
                    HermitowskieCofanieWojsk.validateRow(row, origin_village);
                }
            }
        },
        getOriginVillage: function (row) {
            return {
                full_name: row.cells[0].children[0].innerText,
                id: row.cells[0].children[0].getAttribute('data-id')
            }
        },
        validateRow: function (row, origin_village) {
            row.cells[0].children[0].children[0].checked = false;
            let data = HermitowskieCofanieWojsk.mapRowToData(row);
            let coordsMatches = function () {
                return HermitowskieCofanieWojsk.coords_filter.length === 0 ||
                    (data['coords'] !== undefined && HermitowskieCofanieWojsk.coords_filter.indexOf(data['coords']) !== -1);
            };
            let nameMatches = function () {
                return HermitowskieCofanieWojsk.villages_filter.length === 0 ||
                    (data['name'] !== undefined && HermitowskieCofanieWojsk.villages_filter.some(village => data['name'].indexOf(village) !== -1));
            };
            let playerMatches = function () {
                return HermitowskieCofanieWojsk.players_filter.length === 0 ||
                    (data['player'] !== undefined && HermitowskieCofanieWojsk.players_filter.some(player => data['player'].indexOf(player) !== -1));
            };
            let tribeMatches = function () {
                return HermitowskieCofanieWojsk.tribes_filter.length === 0 ||
                    (data['tribe'] !== undefined && HermitowskieCofanieWojsk.tribes_filter.some(tribe => data['tribe'].indexOf(tribe) !== -1));
            };
            if (coordsMatches() && nameMatches() && playerMatches() && tribeMatches()) {
                HermitowskieCofanieWojsk.markVillage(row, data['units']);
            }
            HermitowskieCofanieWojsk.checkForOffTroops(data['units'], origin_village);
        },
        mapRowToData: function (row) {
            let data = {
                name: undefined,
                player: undefined,
                tribe: undefined,
                is_barbarian: undefined,
                coords: undefined,
                units: {}
            };
            let root = row.cells[0].children[0];
            data['name'] = root.children[1].innerText.match(/(.*)?\(\d+\|\d+\)\s*K\d*/)[1].trim().toLowerCase();
            data['coords'] = root.children[1].innerText.match(/.*?\((\d+\|\d+)\)\s*K\d*/)[1].trim().toLowerCase();
            if (root.children[2]) {
                data['player'] = root.children[2].innerText.trim().toLowerCase();
                data['is_barbarian'] = false;
            }
            if (root.children[3]) {
                data['tribe'] = root.children[3].innerText.trim().toLowerCase();
            }
            for (let i = 0; i < game_data.units.length - 1; i++) {
                let count = Number(row.cells[i + 2].innerText);
                if (count > 0) {
                    data['units'][game_data.units[i]] = count
                }
            }
            return data;
        },
        createGui: function () {
            let fieldset = HermitowskieCofanieWojsk.createFilterFieldset();
            let button = HermitowskieCofanieWojsk.createFilterButton();
            Dialog.show(HermitowskieCofanieWojsk, `<div>${fieldset}<br/>${button}</div>`);
            document.querySelector(`#${HermitowskieCofanieWojsk.name}_start_button`)
                .addEventListener('click', HermitowskieCofanieWojsk.start_button_handler);
        },
        createFilterFieldset: function () {
            let fieldset = `<fieldset><legend>${i18n.Filters}</legend><table>`;
            for (const filter of HermitowskieCofanieWojsk.filters) {
                let id = `${HermitowskieCofanieWojsk.name}_${filter}`;
                fieldset += '<tr>';
                fieldset += `<td><label for="${id}">${filter}</label></td>`;
                fieldset += `<td><input id="${id}" value=""/></td>`;
                fieldset += '</tr>';
            }
            fieldset += `</table></fieldset>`;
            return fieldset;
        },
        createFilterButton: function () {
            return `<button id='${HermitowskieCofanieWojsk.name}_start_button' class='btn'>${i18n.Start}</button>`;
        },
        getSettings: function () {
            HermitowskieCofanieWojsk.coords_filter = HermitowskieCofanieWojsk.mapCoords();
            HermitowskieCofanieWojsk.villages_filter = HermitowskieCofanieWojsk.mapNames(i18n.VillageNames);
            HermitowskieCofanieWojsk.players_filter = HermitowskieCofanieWojsk.mapNames(i18n.PlayerNames);
            HermitowskieCofanieWojsk.tribes_filter = HermitowskieCofanieWojsk.mapNames(i18n.TribesNames);
        },
        mapCoords: function () {
            let user_input = document.querySelector(`#${HermitowskieCofanieWojsk.name}_${i18n.CoordsFilters}`).value;
            let matches = user_input.match(/\d{1,3}\|\d{1,3}/g);
            return matches == null
                ? []
                : [...new Set(matches)];
        },
        mapNames: function (filterName) {
            let user_input = document.querySelector(`#${HermitowskieCofanieWojsk.name}_${filterName}`).value;
            return user_input.split('&').map(x => x.trim().toLowerCase()).filter(x => x.length !== 0);
        },
        markVillage: function (row, units) {
            row.cells[0].children[0].children[0].checked = true;
            HermitowskieCofanieWojsk.accumulateUnits(units, HermitowskieCofanieWojsk.selected_units);
        },
        checkForOffTroops: function (units, origin_village) {
            let off_units = ['axe', 'light', 'marcher', 'ram', 'catapult', 'snob'];

            if (Object.keys(units).some(unit => off_units.indexOf(unit) !== -1)) {
                let off_troops = {};
                for (const unit of off_units) {
                    if (units[unit] && units[unit] > 0) {
                        off_troops[unit] = units[unit];
                    }
                }
                let unitsFromVillage = HermitowskieCofanieWojsk.villages_with_off_troops.get(origin_village);
                if (unitsFromVillage == null) {
                    HermitowskieCofanieWojsk.villages_with_off_troops.set(origin_village, JSON.parse(JSON.stringify(off_troops)));
                } else {
                    HermitowskieCofanieWojsk.accumulateUnits(off_troops, unitsFromVillage);
                }
            }
        },
        accumulateUnits: function (units, pool) {
            for (const unit in units) {
                if (pool[unit]) {
                    pool[unit] += units[unit];
                } else {
                    pool[unit] = units[unit];
                }
            }
        },
        displaySummary: function () {
            let get_image = function (unit) {
                return `<img src='${image_base}/unit/unit_${unit}.png' title='[unit]${unit}[/unit]'/>`;
            };
            let map_units_to_images = function (troops) {
                return Object.keys(troops).map(unit => `${get_image(unit)}${troops[unit]}`);
            };
            let selected_troops = map_units_to_images(HermitowskieCofanieWojsk.selected_units).join('<br/>');
            if (selected_troops === '') {
                selected_troops = i18n.NoMatches;
            }
            let summary = `<h2>${i18n.TroopsFound}</h2><div>${selected_troops}</div>`
            if (HermitowskieCofanieWojsk.villages_with_off_troops.size !== 0) {
                let supporting_with_off_troops = [...HermitowskieCofanieWojsk.villages_with_off_troops].map(pair => {
                    let origin = pair[0].full_name;
                    let href = TribalWars.buildURL('GET', 'place', { village: pair[0].id, mode: 'units' });
                    return `<a href='${href}'>${origin}</a> ${i18n.SupportsWith} ${map_units_to_images(pair[1])}`
                }).join('<br/>');
                summary += `<h2>${i18n.Other}</h2><div>${supporting_with_off_troops}</div>`
            }
            Dialog.show(HermitowskieCofanieWojsk, summary);
        },
        start_button_handler: function () {
            try {
                HermitowskieCofanieWojsk.getSettings();
                HermitowskieCofanieWojsk.scanTable();
                HermitowskieCofanieWojsk.displaySummary();
            } catch (e) {
                if (typeof (e) === 'string') {
                    UI.ErrorMessage(e);
                } else {
                    Dialog.show(HermitowskieCofanieWojsk, `${e}\n${e.stack}`);
                }
            }
        }

    };
    HermitowskieCofanieWojsk.init();
})(TribalWars);