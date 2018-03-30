/**
 * Helper for distributing deff troops
 * Created by: Hermitowski
 * Modified on: 30/03/2018 - version 2.0 - initial release
 */

(function (TribalWars) {
    let Info = {
        SETTINGS_SAVED: 'Zapisano pomy\u015Blnie',
        LEGEND: {
            ratio: 'Przeliczniki',
            safeguard: 'Rezerwa',
            initial: 'Domy\u015Blne warto\u015Bci'
        },
        DESCRIPTION: {
            initial: {
                deffCount: 'Ilo\u015B\u0107 deffa',
                spyCount: 'Ilo\u015B\u0107 zwiadu',
                villageCount: 'Ilo\u015B\u0107 wiosek',
                minimumCount: 'Ilo\u015B\u0107 minimalna'
            },
            ratio: {
                spear: 'Przelicznik - Pikinier',
                sword: 'Przelicznik - Miecznik',
                archer: 'Przelicznik - \u0141ucznik',
                spy: 'Przelicznik - Zwiadowca',
                heavy: 'Przelicznik - Ci\u0119\u017Cka kawaleria',
            },
            safeguard: {
                spear: 'Rezerwa - Pikinier',
                sword: 'Rezerwa - Miecznik',
                archer: 'Rezerwa - \u0141ucznik',
                spy: 'Rezerwa - Zwiadowca',
                heavy: 'Rezerwa - Ci\u0119\u017Cka kawaleria',
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
        },
        ERROR: {
            BLANK: 'Pole <strong>__1__</strong> jest puste',
            NAN: 'Pole <strong>__1__</strong> nie reprezentuje liczby',
            NEGATIVE_NUMBER: 'Pole <strong>__1__</strong> jest ujemne',
            BAD_FORMAT: 'Pole <strong>__1__</strong> ma z\u0142y format'
        }
    };

    let Guard = {
        _beautifyNumber: function (number) {
            let prefix = ['', 'K', 'M', 'G'];
            for (let i = 0; i < prefix.length; i++) {
                if (number >= 1000) {
                    number /= 1000;
                } else {
                    if (i === 0)
                        return number;
                    let fraction = 2;
                    if (number >= 10)
                        fraction = 1;
                    if (number >= 100)
                        fraction = 0;
                    return `${number.toFixed(fraction)}${prefix[i]}`;
                }
            }
            return `${number.toFixed(0)}T`;
        },

        _isNumber: function (selector, replacement) {
            let emptyRegex = new RegExp(/^\s*$/);
            let input = $(selector);
            let value = input.val();
            if (emptyRegex.test(value)) {
                UI.ErrorMessage(Info.ERROR.BLANK.replace('__1__', replacement));
                input.focus();
                return false;
            }
            let numericValue = Number(value);
            if (isNaN(numericValue)) {
                UI.ErrorMessage(Info.ERROR.NAN.replace('__1__', replacement));
                input.focus();
                return false;
            }
            if (numericValue < 0) {
                UI.ErrorMessage(Info.ERROR.NEGATIVE_NUMBER.replace('__1__', replacement));
                input.focus();
                return false;
            }
            return true;
        },

        addToResults: function (village, coords) {
            let misc = {
                x: coords[0],
                y: coords[1],
                from: 'simulator',
                village: village.id
            };
            let anyUnit = false;
            for (const unit in Guard._defaultSettings.safeguard) {
                if (!Guard._defaultSettings.safeguard.hasOwnProperty(unit)) continue;
                if (village.units[unit] !== 0) {
                    misc[unit] = village.units[unit];
                    anyUnit = true;
                }
            }
            // empty entry
            if (anyUnit === false)
                return;
            let row = $('<tr>');

            let villageLink = TribalWars.buildURL('GET', 'info_village', {id: village.id});


            let placeLink = TribalWars.buildURL('GET', 'place', misc);


            let villageCell = $('<td>', {
                html: `<a href="${villageLink}">${village.name}</a>`
            });
            row.append(villageCell);

            for (const unit in village.units) {
                if (!village.units.hasOwnProperty(unit)) continue;
                let unitCell = $('<td>');
                unitCell.text(village.units[unit]);
                if (village.units[unit] === 0) {
                    unitCell.addClass('hidden');
                }
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
        createGui: function () {
            let div = $('<div>', {
                id: 'HermitianGuard',
                class: 'vis vis_item'
            });
            let mainTable = $('<table>', {
                width: '100%'
            });
            let head = $('<thead>');
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
                `<td><input id='Guard_target' type='text' size='9' pattern="\\s*\\d{1,3}\\|\\d{1,3}\\s*"/></td>` +
                `<td><select id='Guard_group'></select></td>` +
                `<td><input id='Guard_deffCount' type="text" pattern="\\s*\\d+\\s*"></td>` +
                `<td><input id='Guard_spyCount' type="text" pattern="\\s*\\d+\\s*"></td>` +
                `<td><input id='Guard_villageCount' type="text" pattern="\\d+\\s*"></td>` +
                `<td><input id='Guard_minimumCount' type="text" pattern="\\d+\\s*"></td>` +
                `<td><input id='Guard_calculate' class="btn" type="button" disabled="disabled" value="${Info.DESCRIPTION.BUTTONS.CALCULATE}"/></td>` +
                `<td></td>` // padding for settings icon
            });
            head.append(header);
            head.append(inputRow);

            let createResultTable = function () {

                let table = $('<table>', {
                    width: '100%'
                });
                let head = $('<thead>');
                let body = $('<tbody>', {
                    id: 'GuardResultList'
                });

                let addCell = function (unit_name) {
                    let html = `<th>`;
                    html += `<img src="${image_base}unit/unit_${unit_name}.png" alt="${unit_name}"/>`;
                    html += `(<span id="Guard_selected_${unit_name}">0</span>`;
                    html += `/`;
                    html += `<span id="Guard_all_${unit_name}">0</span>)`;
                    html += `</th>`;
                    return html;
                };

                let header = `<th><img src="${image_base}face.png" alt="deff"/>`;
                header += `(<span id="Guard_selected_deff">0</span>/<span id="Guard_all_deff">0</span>)</th>`;
                for (const unit in Guard._defaultSettings.safeguard) {
                    if (!Guard._defaultSettings.safeguard.hasOwnProperty(unit)) continue;
                    header += addCell(unit);
                }
                header += '<th>Rozkaz</th>';
                head.append(header);
                table.append(head);
                table.append(body);
                return table;
            };

            let resultTable = createResultTable();

            let subDiv = $('<div class="vis vis_item" style="overflow-y:auto;height:200px">');

            subDiv.append(resultTable);

            mainTable.append(head);
            div.append(mainTable);
            div.append(subDiv);

            $('#contentContainer').prepend(div);

        },
        initGui: function () {
            // target
            let input = $('#Guard_target');
            input.val(`${game_data.village.x}|${game_data.village.y}`);
            if (game_data.screen === 'info_village') {
                input.val(`${TWMap.pos[0]}|${TWMap.pos[1]}`);
            }
            for (const key in Guard._defaultSettings.initial) {
                if (!Guard._defaultSettings.initial.hasOwnProperty(key)) continue;
                $(`#Guard_${key}`).val(Guard._settings.initial[key]);
            }
            // handlersc
            $('#Guard_calculate').click(() => setTimeout(Guard.Calculate));
            $('#Guard_settings').click(() => setTimeout(Guard.EditSettings));

            let getGroupsInfo = function () {
                let url = TribalWars.buildURL('GET', 'groups', {mode: 'overview', ajax: 'load_group_menu'});
                return fetch(url, {credentials: 'include'}).then(t => t.text()).then(response => {
                    return JSON.parse(response);
                });
            };

            getGroupsInfo().then(groupInfo => {
                let select = $("#Guard_group");
                for (const group of groupInfo.result) {
                    if (group.type === 'separator') continue;
                    let option = $('<option>');
                    option.val(group.group_id);
                    option.text(group.name);
                    select.append(option);
                }
                select.val(groupInfo.group_id);
                $('#Guard_calculate').attr('disabled', false);
            });

        },

        Calculate: function () {

            let checkInput = function (userInput) {
                for (const key in Guard._defaultSettings.initial) {
                    if (!Guard._defaultSettings.initial.hasOwnProperty(key)) continue;
                    let input = $(`#Guard_${key}`);
                    let value = input.val();
                    if (!Guard._isNumber(`#Guard_${key}`, Info.DESCRIPTION.initial[key]))
                        return false;
                    userInput[key] = Number(value);
                }

                let coordsRegex = new RegExp(/^\s*\d{1,3}\|\d{1,3}\s*$/);
                let coordsInput = $('#Guard_target');
                if (!coordsRegex.test(coordsInput.val())) {
                    UI.ErrorMessage(Info.ERROR.BAD_FORMAT.replace('__1__', Info.DESCRIPTION.HEADERS.TARGET));
                    coordsInput.focus();
                    return false;
                }
                userInput['target'] = coordsInput.val();
                return true;
            };

            let normalizeVillages = function (villages) {

                let normalizeVillage = function (village) {
                    let normalized = {
                        deff: 0,
                        name: village.name,
                        id: village.id,
                        units: {}
                    };
                    for (const unit in Guard._defaultSettings.safeguard) {
                        if (!Guard._defaultSettings.safeguard.hasOwnProperty(unit)) continue;
                        let ratio = Guard._settings.ratio[unit] === undefined
                            ? 0
                            : Number(Guard._settings.ratio[unit]);

                        normalized.units[unit] = village.units[unit] === undefined
                            ? 0
                            : Math.max(village.units[unit] - Number(Guard._settings.safeguard[unit]), 0);

                        normalized.deff += Number(normalized.units[unit]) * ratio;
                    }
                    return normalized;
                };


                let normalizedVillages = {
                    villages: [],
                    all: {deff: 0},
                    selected: {deff: 0}
                };

                for (const unit in Guard._defaultSettings.safeguard) {
                    if (!Guard._defaultSettings.safeguard.hasOwnProperty(unit)) continue;
                    normalizedVillages.all[unit] = 0;
                    normalizedVillages.selected[unit] = 0;
                }

                for (const village of villages) {
                    let normalized = normalizeVillage(village);

                    for (const unit in Guard._defaultSettings.safeguard) {
                        if (!Guard._defaultSettings.safeguard.hasOwnProperty(unit)) continue;
                        normalizedVillages.all[unit] += normalized.units[unit];
                    }
                    normalizedVillages.all.deff += normalized.deff;
                    normalizedVillages.villages.push(normalized);
                }
                return normalizedVillages;
            };

            let selectDeff = function (normalized, userInput) {
                // discard villages with deff less then minimum threshold
                normalized.villages = normalized.villages.filter(village => village.deff >= userInput.minimumCount);
                // sort by owned deff if requested deffCount is not equal zero, otherwise sort by ownedSpies
                userInput.deffCount !== 0
                    ? normalized.villages.sort((lhs, rhs) => rhs.deff - lhs.deff)
                    : normalized.villages.sort((lhs, rhs) => rhs.units.spy - lhs.units.spy);
                // take as many villages as user wanted
                normalized.villages = normalized.villages.slice(0, userInput.villageCount);
                // deff selection
                for (let i = normalized.villages.length; i > 0; i--) {
                    let village = normalized.villages[i - 1];
                    // on average we should pick this amount deff to balance distribution
                    let threshold = (userInput.deffCount - normalized.selected.deff) / i;
                    let ratio = threshold < village.deff ? threshold / village.deff : 1.0;
                    for (const unit in Guard._defaultSettings.ratio) {
                        if (!Guard._defaultSettings.ratio.hasOwnProperty(unit)) continue;
                        let selectedCount = Math.min(Math.round(ratio * village.units[unit]), village.units[unit]);
                        normalized.selected[unit] += selectedCount;
                        normalized.selected['deff'] += selectedCount * Number(Guard._settings.ratio[unit]);
                        village.units[unit] = selectedCount;
                    }
                }
                normalized.villages.sort((lhs, rhs) => rhs.units.spy - lhs.units.spy);
                // spy selection
                for (let i = normalized.villages.length; i > 0; i--) {
                    let village = normalized.villages[i - 1];
                    let threshold = (userInput.spyCount - normalized.selected.spy) / i;
                    let ratio = threshold < village.units.spy ? threshold / village.units.spy : 1.0;
                    let selectedCount = Math.min(Math.round(ratio * village.units.spy), village.units.spy);
                    normalized.selected.spy += selectedCount;
                    village.units.spy = selectedCount;
                }

                for (const name in normalized.all) {
                    if (!normalized.all.hasOwnProperty(name)) continue;
                    let selected = Guard._beautifyNumber(normalized.selected[name]);
                    let all = Guard._beautifyNumber(normalized.all[name]);
                    $(`#Guard_selected_${name}`).text(selected);
                    $(`#Guard_all_${name}`).text(all);
                }

                return normalized;
            };

            let userInput = {};
            if (!checkInput(userInput)) {
                return;
            }
            // clear output
            $('#GuardResultList').find('tr').remove();
            let button = $('#HermitianGuardCalculate');
            button.attr('disabled', true);

            let selectedGroupId = $('#Guard_group').val();
            Guard.getUnitsForGroup(selectedGroupId).then(villages => {
                let normalized = normalizeVillages(villages);
                selectDeff(normalized, userInput);
                for (const village of normalized.villages) {
                    Guard.addToResults(village, userInput.target.split('|'));
                }
                button.attr('disabled', false);
            });
        },
        getUnitsForGroup: function (group_id) {
            if (Guard._unitsPerGroup.has(group_id)) {
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
                Guard._unitsPerGroup.set(group_id, villages);
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
                        let userInput = $(`#Guard_default_${branch}_${key}`);
                        let userValue = userInput.val();
                        if (!Guard._isNumber(`#Guard_default_${branch}_${key}`, Info.DESCRIPTION[branch][key])) {
                            return;
                        }
                        settings[branch][key] = Number(userValue);
                        // apply changes to current setttings, but don't change user's input
                        if (branch !== 'initial') {
                            Guard._settings[branch][key] = settings[branch][key];
                        }
                    }
                }
                localStorage[Guard._storageKey] = JSON.stringify(settings);
                UI.SuccessMessage(Info.SETTINGS_SAVED);
                $('.popup_box_close').click();
            };

            let gui = '<div>';
            gui += addUnitFieldset('ratio');
            gui += addUnitFieldset('safeguard');
            gui += addInfoFieldset('initial');
            gui += `<button id="GuardSaveSettings" class="btn">${Info.DESCRIPTION.BUTTONS.SAVE_SETTINGS}</button><div>`;
            Dialog.show('GuardOptionEditor', gui);
            $('#GuardSaveSettings').click(saveSettings);

        },
        _storageKey: 'GuardSettings',
        _unitsPerGroup: new Map(),
        _defaultSettings: {
            ratio: {
                spear: 1,
                sword: 1,
                archer: 1,
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
})(TribalWars);

