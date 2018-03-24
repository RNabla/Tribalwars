/**
 * Created by: Hermitowski
 * Based on old deff supplier
 *
 */

(function (TribalWars) {
    let Info = {
        SETTINGS_SAVED: 'Zapisano pomyślnie',
        LEGEND: {
            ratio: 'Przeliczniki',
            safeguard: 'Rezerwa',
            initial: 'Domyślne wartości'
        },
        DESCRIPTION: {
            initial: {
                deffCount: 'Ilość deffa',
                spyCount: 'Ilość zwiadu',
                villageCount: 'Ilość wiosek',
                minimumCount: 'Ilość minimalna'
            },
            BUTTONS: {
                SAVE_SETTINGS: 'Zapisz',
                CALCULATE: 'Oblicz'
            },
            HEADERS: {
                TARGET: 'Cel',
                GROUP: 'Grupa',
                PROCESS: 'Oblicz',
                SELECTED: 'Wybrano'
            }

        }
    };

    let Guard = {


        addToResults: function (obj, x, y) {
            let misc = {
                x: x,
                y: y,
                from: 'simulator'
            };
            for (const unit in obj.units) {
                if (obj.units[unit] !== 0) {
                    misc[unit] = obj.units[unit];
                }
            }

            let row = $('<tr>');

            let villageLink = TribalWars.buildURL('GET', 'info_village', {id: obj.id});


            let placeLink = TribalWars.buildURL('GET', 'place', misc);


            let villageCell = $('<td>', {
                html: `<a href="${villageLink}">${obj.name}</a>`
            });
            row.append(villageCell);

            for (const unit in obj.units) {
                let unitCell = $('<td>');
                unitCell.text(obj.units[unit]);
                if (obj.units[unit] === 0)
                    unitCell.addClass('hidden');
                row.append(unitCell);
            }

            let placeCell = $('<td>');

            let placeA = $('<a>', {
                href: placeLink,
                text: 'Wykonaj'
            });
            placeCell.attr('href', placeLink);
            let deleteRow = function () {
                $(this).closest('tr').remove();
            };
            placeA.click(deleteRow);
            placeCell.append(placeA);
            row.append(placeCell);
            $('#GuardResultList').append(row);
        },
        addDummy: function () {

            let obj = {
                name: 'dummy',
                id: 8537,
                units: {
                    spear: 1,
                    sword: 0,
                    archer: 0,
                    spy: 0,
                    heavy: 0
                }
            };

            Guard.addToResults(obj, 575, 450);
        },

        createGui: function () {
            let div = $('<div>', {
                id: 'HermitianGuard',
                class: 'vis vis_item'
            });
            let mainTable = $('<table>', {
                width: '100%'
            });
            let thead = $('<thead>');
            let tbody = $('<tbody>');
            let header = $('<tr>', {
                html:
                `<th><label for="Guard_target">${Info.DESCRIPTION.HEADERS.TARGET}</label></th>` +
                `<th><label for="Guard_group">${Info.DESCRIPTION.HEADERS.GROUP}</label></th>` +
                `<th><label for="Guard_deffCount">${Info.DESCRIPTION.initial.deffCount}</label></th>` +
                `<th><label for="Guard_spyCount">${Info.DESCRIPTION.initial.spyCount}</label></th>` +
                `<th><label for="Guard_villageCount">${Info.DESCRIPTION.initial.villageCount}</label></th>` +
                `<th><label for="Guard_minimumCount">${Info.DESCRIPTION.initial.minimumCount}</label></th>` +
                `<th></th>` + // padding for buttton
                `<th><img id="Guard_settings" src="${image_base}icons/settings.png" alt="settings"/></th>`
            });
            let inputRow = $('<tr>', {
                html:
                `<td><input id='Guard_target' type='text' size='9' pattern="\\d{1,3}\\|\\d{1,3}"/></td>` +
                `<td><select id='Guard_group'></select></td>` +
                `<td><input id='Guard_deffCount' type="text" pattern="\\d+"></td>` +
                `<td><input id='Guard_spyCount' type="text" pattern="\\d+"></td>` +
                `<td><input id='Guard_villageCount' type="text" pattern="\\d+"></td>` +
                `<td><input id='Guard_minimumCount' type="text" pattern="\\d+"></td>` +
                `<td><input id='Guard_calculate' class="btn" type="button" disabled="disabled" value="${Info.DESCRIPTION.BUTTONS.CALCULATE}"/></td>` +
                `<td></td>` // padding for settings icon
            });
            thead.append(header);
            thead.append(inputRow);

            let createResultTable = function () {

                let table = $('<table>', {
                    width: '100%'
                });
                let thead = $('<thead>');
                let tbody = $('<tbody>', {
                    id: 'GuardResultList'
                });

                let addCell = function(unit_name) {
                    let html = `<th>`;
                    html += `<img src="${image_base}unit/unit_${unit_name}.png" alt="${unit_name}"/>`;
                    html += `(<span id="Guard_selected_${unit_name}">0</span>`;
                    html += `/`;
                    html += `<span id="Guard_max_${unit_name}">0</span>)`;
                    html += `</th>`;
                    return html;
                };

                let header = `<th><img src="${image_base}face.png" alt="all"/>`;
                header += `(<span id="Guard_selected_all">0</span>/<span id="Guard_max_all">0</span>)</th>`;
                for (const unit in Guard._defaultSettings.ratio) {
                    header += addCell(unit);
                }
                header += '<th>Rozkaz</th>'
                thead.append(header);
                table.append(thead);
                table.append(tbody);
                return table;
            };

            let resultTable = createResultTable();

            let resultRow = $('<tr>');
            let resultCell = $('<td colspan="8">');
            let resultDiv = $('<div class="vis vis_item" style="overflow-y:auto;height:200px">');
            resultDiv.append(resultTable);
            resultCell.append(resultDiv);
            resultRow.append(resultCell);

            tbody.append(resultRow);

            mainTable.append(thead);
            mainTable.append(tbody);
            div.append(mainTable);

            $('#contentContainer').prepend(div);

        },
        initGui: function () {
            // target
            let input = $('#Guard_target');
            input.val(`${game_data.village.x}|${game_data.village.y}`);
            if (game_data.screen === 'info_village') {
                input.val(`${TWMap.pos[0]}|${TWMap.pos[1]}`);
            }
            for (const key in Guard._defaultSettings.initial){
                if (!Guard._defaultSettings.initial.hasOwnProperty(key)) continue;
                $(`#Guard_${key}`).val(Guard._settings.initial[key]);
            }
            // handlers
            let button = $('#Guard_calculate');
            button.click(Guard.Calculate);
            $('#Guard_settings').click(Guard.EditSettings);


            for (let i = 0; i < 12; i++)
                setTimeout(Guard.addDummy);

            let getGroupsInfo = function () {
                let url = TribalWars.buildURL('GET', 'groups', {mode: 'overview', ajax: 'load_group_menu'});
                return fetch(url, {credentials: 'include'}).then(t => t.text()).then(response => {
                    return JSON.parse(response);
                });
            };

            getGroupsInfo().then(groupInfo => {
                let select = $("#Guard_group");
                for (const group of groupInfo.result) {
                    let option = $('<option>');
                    option.val(group.group_id);
                    option.text(group.name);
                    select.append(option);
                }
                select.val(groupInfo.group_id);
                button.attr('disabled', false);
            });

        },

        Log: function () {
            let debugMode = true;
            if (debugMode)
                console.log('Guard: ', ...arguments)
        },
        Calculate: function () {

            let checkInput = function() {

                UI.ErrorMessage('sample');
                return false;
            };


            if (!checkInput())
                return;
            let button = $('#HermitianGuardCalculate');
            button.attr('disabled', true);
            let selectedGroupId = $('#GuardGroups').val();
            Guard.getUnitsForGroup(selectedGroupId).then(villages => {
                let normalized = [];
                let coords = $('#GuardCoordinates').val().split('|');
                let x = coords[0];
                let y = coords[1];

                let all_deff = 0;
                let all_spy = 0;
                for (const village of villages) {
                    let normalized_units = {};
                    let village_deff = 0;
                    let village_spy = 0;
                    for (const unit of Guard._deffUnits) {
                        if (village.units[unit] === undefined)
                            normalized_units[unit] = 0;
                        else
                            normalized_units[unit] = village.units[unit];
                        if (unit === 'spy')
                            village_spy += Number(normalized_units['spy']);
                        else
                            village_deff += Number(Guard._settings[unit]) * Number(normalized_units[unit]);
                    }
                    normalized.push({
                        id: village.id,
                        name: village.name,
                        deff: village_deff,
                        spy: normalized_units.spy,
                        units: normalized_units
                    });
                    all_spy += normalized_units.spy;
                    all_deff += village_deff;
                }


                console.log('All spy: ', all_spy);
                console.log('All deff: ', all_deff);
                for (const village of normalized) {
                    Guard.addToResults(village, x, y);
                }

                button.attr('disabled', false);
            })
        },
        getUnitsForGroup: function (group_id) {
            console.log('Requested: ', group_id);
            console.log('Map: ', Guard._unitsPerGroup);
            if (this._unitsPerGroup.has(group_id)) {
                let villages = Guard._unitsPerGroup.get(group_id);
                return new Promise(resolve => resolve(villages));
            }
            let url = TribalWars.buildURL('GET', 'overview_villages', {
                mode: 'units',
                type: 'own_home',
                group: group_id
            });
            return fetch(url, {credentials: "same-origin"}).then(t => t.text()).then(response => {
                let requestedBody = $('<body>', {
                    html: response
                });
                let unitsTable = requestedBody.find('#units_table').get(0);
                let villages = [];
                if (unitsTable !== undefined) {
                    for (let i = 1; i < unitsTable.rows.length; i++) {
                        let row = unitsTable.rows[i];
                        // scan for units
                        let units = {};
                        const offset = 2;
                        for (let j = 0; j < game_data.units.length; j++) {
                            let unit_name = game_data.units[j];
                            units[unit_name] = Number(row.cells[offset + j].textContent);
                        }
                        // general info
                        let mainCell = row.cells[0];
                        let villageInfo = {
                            name: mainCell.textContent.trim(),
                            id: mainCell.children[0].getAttribute('data-id'),
                            units: units
                        };
                        villages.push(villageInfo);
                    }
                }
                this._unitsPerGroup.set(group_id, villages);
                return villages;
            });
        },
        EditSettings: function () {

            let addUnitFieldset = function (branch) {
                let fieldset = `<fieldset><legend>${Info.LEGEND[branch]}</legend><table>`;
                for (const unit_name in Guard._defaultSettings[branch]) {
                    if (!Guard._defaultSettings[branch].hasOwnProperty(unit_name)) continue;
                    let id = `Guard_default_${branch}_${unit_name}`;
                    let value = Guard._settings[branch][unit_name];
                    fieldset += '<tr>';
                    fieldset += `<td><label for="${id}"><image src="${image_base}unit/unit_${unit_name}.png" alt="${unit_name}"></image></label></td>`;
                    fieldset += `<td><input id="${id}" value="${value}"/></td>`;
                    fieldset += '</tr>';
                }
                fieldset += '</table></fieldset>';
                return fieldset;
            };

            let addInfoFieldset = function (branch) {
                let fieldset = `<fieldset><legend>${Info.LEGEND[branch]}</legend><table>`;
                for (const key in Guard._defaultSettings[branch]) {
                    if (!Guard._defaultSettings[branch].hasOwnProperty(key)) continue;
                    let id = `Guard_default_${branch}_${key}`;
                    let value = Guard._settings[branch][key];
                    fieldset += '<tr>';
                    fieldset += `<td><label for="${id}">${Info.DESCRIPTION[branch][key]}:</label></td>`;
                    fieldset += `<td><input id="${id}" value="${value}"/></td>`;
                    fieldset += '</tr>';
                }
                fieldset += '</table></fieldset>';
                return fieldset;
            };

            let saveSettings = function () {
                let settings = {};
                for (const branch in Guard._defaultSettings) {
                    if (!Guard._defaultSettings.hasOwnProperty(branch)) continue;
                    settings[branch] = {};
                    for (const key in Guard._defaultSettings[branch]) {
                        if (!Guard._defaultSettings[branch].hasOwnProperty(key)) continue;
                        settings[branch][key] = $(`#Guard_default_${branch}_${key}`).val();
                        // save changes to current setttings, but don't change user's input
                        if (branch !== 'initial') {
                            Guard._settings[branch][key] = settings[branch][key];
                        }
                    }
                }
                localStorage[Guard._storageKey] = JSON.stringify(settings);
                UI.SuccessMessage(Info.SETTINGS_SAVED);
            };

            let gui = '<div>';
            gui += addUnitFieldset('ratio');
            gui += addUnitFieldset('safeguard');
            gui += addInfoFieldset('initial');
            gui += `<button id="GuardSaveSettings" class="btn">${Info.DESCRIPTION.BUTTONS.SAVE_SETTINGS}</button><div>`;
            Dialog.show('GuardOptionEditor', gui);
            $('#GuardSaveSettings').click(saveSettings);

        },
        LoadSettings: function () {
            for (const key in Guard._defaultSettings.initial) {
                if (!Guard._defaultSettings.initial.hasOwnProperty(key)) continue;
                $(`#Guard_${key}`).val(Guard._settings[key]);
            }
        },
        _deffUnits: ['spear', 'sword', 'archer', 'spy', 'heavy'],
        _storageKey: 'GuardSettings',
        _unitsPerGroup: new Map(),
        _defaultSettings: {
            ratio: {
                spear: 1,
                sword: 1,
                archer: 1,
                spy: 0,
                heavy: 6
            },
            safeguard: {
                spear: 0,
                sword: 0,
                archer: 0,
                spy: 0,
                heavy: 0
            },
            initial: {
                deffCount: 0,
                spyCount: 0,
                villageCount: 12,
                minimumCount: 0
            }
        },
        _settings: {},
        initSettings: function () {
            let storedSettings = localStorage[Guard._storageKey];
            if (storedSettings === undefined) {
                localStorage[Guard._storageKey] = JSON.stringify(Guard._defaultSettings);
                storedSettings = JSON.stringify(Guard._defaultSettings);
            }
            Guard._settings = JSON.parse(storedSettings);
        },
        init: function () {
            let instance = $('#HermitianGuard');
            if (0 === instance.length) {
                Guard.initSettings();
                Guard.createGui();
                Guard.initGui();
            }
            else {
                instance.remove();
            }
        },
    };
    Guard.init();
    console.log(Guard)
})(TribalWars);

//Guard.getUnitsForGroup();
