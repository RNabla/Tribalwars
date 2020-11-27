/**
 * Helper for distributing deff troops
 * Created by: Hermitowski
 * Modified on: 30/03/2018 - version 2.0 - initial release
 * Modified on: 25/10/2018 - version 2.1 - added strategy for selecting villages
 * Modified on: 27/10/2018 - version 2.2 - added time range filter
 * Modified on: 12/08/2019 - version 2.2 - refactor + integration with new map files api
 * Modified on: 18/08/2019 - version 2.3 - added open commands in new tabs
 * Modified on: 19/08/2019 - version 2.4 - split units option
 * Modified on: 26/08/2019 - version 2.5 - more date formats, ratio of value 0 handling
 * Modified on: 28/11/2019 - version 2.6 - notification of violation no_other_support constraint
 * Modified on: 27/11/2020 - version 2.7 - mass support sending
 */

(async function (TribalWars) {
    const start = Date.now();
    const namespace = 'Hermitowski.Guard';
    const i18n = {
        SETTINGS_SAVED: 'Zapisano pomy\u{15B}lnie',
        SETTINGS_RESETED: 'Przywr\u{F3}cono domy\u{15B}lne ustawienia',
        CURRENTLY_SELECTED_GROUP: 'Obecnie wybrana grupa',
        ERROR_MESSAGE: 'Komunikat o b\u{142}\u{119}dzie: ',
        FORUM_THREAD: 'Link do w\u{105}tku na forum',
        FORUM_THREAD_HREF: 'https://forum.plemiona.pl/index.php?threads/hermitowska-obstawa.124587/',
        STRATEGY: {
            TROOP_ASC: 'Ilo\u{15B}\u{107} wojsk rosn\u{105}co',
            TROOP_DESC: 'Ilo\u{15B}\u{107} wojsk malej\u{105}co',
            DIST_ASC: 'Odleg\u{142}o\u{15B}\u{107} rosn\u{105}co',
            DIST_DESC: 'Odleg\u{142}o\u{15B}\u{107} malej\u{105}co',
            RANDOM: 'Losowo'
        },
        ERROR: {
            BLANK: 'Pole <strong>__1__</strong> jest puste',
            NAN: 'Pole <strong>__1__</strong> nie reprezentuje liczby',
            NEGATIVE_NUMBER: 'Pole <strong>__1__</strong> jest ujemne',
            BAD_FORMAT: 'Pole <strong>__1__</strong> ma z\u{142}y format',
            PAST_DATE: 'Podany punkt w czasie nale\u{17C}y do przesz\u{142}o\u{15B}ci',
            MOBILE: 'Wersja mobilna nie jest wspierana',
            NEW_WINDOW_BLOCKED: 'Wygl\u0105da na to, \u017Ce preferencje u\u017Cytkownika w przegl\u0105darce nie pozwalaj\u0105 otworzy\u0107 wi\u0119kszej ilo\u015Bci kart',
            EMPTY_DEFF_SELECTION: 'Nie uda\u{142}o si\u0119 wybra\u0107 jednostek defensywnych',
            INVALID_VILLAGE_INFO: 'Wydaje si\u0119, \u017Ce wioska docelowa nie istnieje',
            NO_OTHER_SUPPORT_CONFLICT: 'Ustawienia \u{15B}wiata nie pozwalaj\u0105 na wysy\u{142}anie wspar\u{107} do graczy innych plemion',
            EMPTY_GROUP: 'Wybrana grupa nie posiada wiosek'
        },
        UNITS: {
            spear: 'Pikinier',
            sword: 'Miecznik',
            archer: '\u{141}ucznik',
            spy: 'Zwiadowca',
            heavy: 'Ci\u{119}\u{17C}ka kawaleria',
        },
        FIELDSET: {
            input: 'Domy\u{15B}lne warto\u{15B}ci',
            ratio: 'Przeliczniki',
            safeguard: 'Rezerwa',
        },
        LABELS: {
            target: 'Cel',
            group: 'Grupa',
            deff_count: 'Ilo\u{15B}\u{107} deffa',
            spy_count: 'Ilo\u{15B}\u{107} zwiadu',
            village_count: 'Ilo\u{15B}\u{107} wiosek',
            minimal_deff_count: 'Minimalna ilo\u{15B}\u{107} deffa',
            strategy: 'Strategia wybierania',
            arrival_date: 'Data dotarcia przed',
            split_units: 'Rozdziel jednostki',
            generate: 'Generuj',
            command: 'Rozkaz',
            execute: 'Wykonaj',
            save_settings: 'Zapisz',
            reset_settings: 'Przywr\u{F3}\u{107} domy\u{15B}lne',
        }
    };
    const Helper = {
        beautify_number: function (number) {
            let prefix = ['', 'K', 'M', 'G'];
            for (let i = 0; i < prefix.length; i++) {
                if (number >= 1000) {
                    number /= 1000;
                } else {
                    if (i === 0)
                        return number.toFixed();
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
        parse_date: function (date_string, replacement) {
            let time_offset = 0;
            const date_matches = date_string.match(/jutro|dzisiaj|\d+\.\d+(?:\.\d+)?/g);
            if (date_matches) {
                time_offset = date_string.indexOf(date_matches[0]) + date_matches[0].length;
            }
            const time_matches = date_string.slice(time_offset).match(/\d+(?::\d+)*/g);
            if (!time_matches || time_matches.length > 1 || (date_matches && date_matches.length > 1)) {
                throw i18n.ERROR.BAD_FORMAT.replace('__1__', replacement);
            }
            const today = new Date();
            const time_parts = time_matches[0].split(':').map(x => Number(x));
            const parts = {
                year: today.getFullYear(),
                month: today.getMonth(),
                date: today.getDate(),
                hours: time_parts[0],
                minutes: time_parts[1] || 0,
                seconds: time_parts[2] || 0,
            };
            if (date_matches) {
                const date_match = date_matches[0];
                switch (date_match) {
                    case "jutro": parts.date = today.getDate() + 1; break;
                    case "dzisiaj": break;
                    default:
                        const date_parts = date_match.split('.').map(x => Number(x));
                        if (date_parts.length === 3) {
                            if (date_parts[2] < 100) {
                                date_parts[2] += 2000;
                            }
                            parts.year = date_parts[2];
                        }
                        parts.month = date_parts[1] - 1;
                        parts.date = date_parts[0];
                        break;
                }
            }
            const user_date = new Date(parts.year, parts.month, parts.date, parts.hours, parts.minutes, parts.seconds);
            if (!date_matches && user_date.getTime() < Date.now()) {
                user_date.setDate(user_date.getDate() + 1);
            }
            return user_date;
        },
        assert_non_negative_number: function (input, replacement) {
            const empty_regex = new RegExp(/^\s*$/);
            const value = input.value;
            if (empty_regex.test(value)) {
                input.focus();
                throw i18n.ERROR.BLANK.replace('__1__', replacement);
            }
            const numeric_value = Number(value);
            if (isNaN(numeric_value)) {
                input.focus();
                throw i18n.ERROR.NAN.replace('__1__', replacement);
            }
            if (numeric_value < 0) {
                input.focus();
                throw i18n.ERROR.NEGATIVE_NUMBER.replace('__1__', replacement);
            }
        },
        get_id: function (control_name) {
            return control_name
                ? `${namespace}.${control_name}`
                : namespace;
        },
        get_control: function (control_name) {
            const escaped_id = Helper.get_id(control_name).replace(/\./g, '\\.');
            return document.querySelector(`#${escaped_id}`);
        },
        handle_error: function (error) {
            if (typeof (error) === 'string') {
                UI.ErrorMessage(error);
                return;
            }
            const gui =
                `<h2>WTF - What a Terrible Failure</h2>
                 <p><strong>${i18n.ERROR_MESSAGE}</strong><br/>
                    <textarea rows='5' cols='42'>${error}\n\n${error.stack}</textarea><br/>
                    <a href='${i18n.FORUM_THREAD_HREF}'>${i18n.FORUM_THREAD}</a>
                 </p>`;
            Dialog.show(namespace, gui);
        }
    };
    const Guard = {
        add_command: function (troops_info, user_input, target_info, group_name) {
            for (let i = 0; i < troops_info.villages.length; i++) {
                const row = document.createElement('tr');
                row.dataset['group'] = group_name;
                if (i == troops_info.villages.length - 1) {
                    row.style.borderBottom = 'black solid 1px';
                }

                const village_cell = document.createElement('td');
                const village_anchor = document.createElement('a');
                village_anchor.href = TribalWars.buildURL('GET', 'info_village', { id: troops_info.villages[i].id });
                village_anchor.innerText = troops_info.villages[i].name;
                village_cell.append(village_anchor);
                row.append(village_cell);
                for (const unit of Guard.deff_units) {
                    const unit_cell = document.createElement('td');
                    unit_cell.textContent = troops_info.villages[i].units[unit];
                    if (troops_info.villages[i].units[unit] === 0) {
                        unit_cell.classList.add('hidden');
                    }
                    row.append(unit_cell);
                }
                if (i == 0) {
                    const payload = {
                        x: user_input.target[0],
                        y: user_input.target[1],
                        target: target_info[Guard._village_info.VILLAGE_ID],
                        call: {},
                        h: game_data.csrf,
                    };

                    for (const village of troops_info.villages) {
                        payload['call'][village.id] = {};
                        for (const unit of Guard.deff_units) {
                            if (village.units[unit] != 0) {
                                payload['call'][village.id][unit] = village.units[unit];
                            }
                        }
                    }

                    const place_cell = document.createElement('td');
                    place_cell.rowSpan = troops_info.villages.length;
                    place_cell.style.verticalAlign = 'top';
                    const place_button = document.createElement('button');

                    place_button.innerText = i18n.LABELS.execute;
                    place_button.dataset['payload'] = JSON.stringify(payload);
                    place_button.classList.add('btn');
                    place_button.style.margin = '2px';

                    place_button.addEventListener('click', (e) => {
                        const payload = JSON.parse(e.target.dataset['payload']);

                        let payload_formdata = `x=${payload.x}&y=${payload.y}&target=${payload.target}&h=${game_data.csrf}`;
                        for (const village_id in payload.call) {
                            const village_troops = payload.call[village_id];
                            for (const unit_name in village_troops) {
                                payload_formdata += `&call[${village_id}][${unit_name}]=${village_troops[unit_name]}`;
                            }
                        }
                        fetch(TribalWars.buildURL('GET', 'place', { mode: 'call', action: 'call' }), {
                            body: encodeURI(payload_formdata),
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                            }
                        });
                        Guard.group_id2villages.delete(user_input.group_id);
                        const group_rows = Helper.get_control('output').querySelectorAll(`tr[data-group="${group_name}"]`);
                        for (let i = group_rows.length - 1; i >= 0; i--) {
                            group_rows[i].remove();
                        }
                        return false;
                    });

                    place_cell.append(place_button);
                    row.append(place_cell);
                }

                Helper.get_control('output').append(row);
            }
        },
        create_main_panel: function () {
            const options = [
                { name: 'target', controls: [{ type: 'input', attributes: { id: 'target', size: 10 } }] },
                { name: 'group', controls: [{ type: 'select', attributes: { id: 'group' } }] },
                { name: 'deff_count', controls: [{ type: 'input', attributes: { id: 'deff_count', size: 10 } }] },
                { name: 'spy_count', controls: [{ type: 'input', attributes: { id: 'spy_count', size: 10 } }] },
                { name: 'village_count', controls: [{ type: 'input', attributes: { id: 'village_count', size: 10 } }] },
                { name: 'minimal_deff_count', controls: [{ type: 'input', attributes: { id: 'minimal_deff_count', size: 10 } }] },
                { name: 'strategy', controls: [{ type: 'select', attributes: { id: 'strategy' } }] },
                { name: 'arrival_date', for: 'is_arrival_date_enabled', controls: [{ type: 'input', attributes: { id: 'is_arrival_date_enabled', type: 'checkbox' } }, { type: 'input', attributes: { id: 'arrival_date', size: 12 } }] },
                { name: 'split_units', controls: [{ type: 'input', attributes: { id: 'split_units', type: 'checkbox' } }] },
            ];

            const create_option_label = function (option) {
                const option_cell = document.createElement('th');
                const option_label = document.createElement('label');
                option_label.classList.add('center');
                option_label.setAttribute('for', Helper.get_id(option.hasOwnProperty('for') ? option.for : option.name));
                option_label.textContent = i18n.LABELS[option.name];
                option_cell.append(option_label)
                return option_cell;
            }

            const create_option_input = function (option) {
                const option_cell = document.createElement('td');
                const option_span = document.createElement('span');
                option_span.style.display = 'flex';
                for (const control_definition of option.controls) {
                    const option_control = document.createElement(control_definition.type);
                    const attributes = control_definition.attributes;
                    for (const attribute_name in attributes) {
                        const attribute_value = attribute_name === 'id'
                            ? Helper.get_id(attributes.id)
                            : attributes[attribute_name];
                        option_control.setAttribute(attribute_name, attribute_value);
                    }
                    if (attributes.type === 'checkbox') {
                        option_control.style.display = 'block';
                        option_control.style.margin = 'auto';
                    }
                    option_control.disabled = true;
                    option_span.append(option_control);
                }
                option_cell.append(option_span);
                return option_cell;
            }

            const option_labels_row = document.createElement('tr');
            const option_inputs_row = document.createElement('tr');

            for (const option of options) {
                option_labels_row.append(create_option_label(option));
                option_inputs_row.append(create_option_input(option));
            }

            const settings_cell = document.createElement('th');
            const settings_image = document.createElement('img');
            settings_image.setAttribute('id', Helper.get_id('settings'));
            settings_image.setAttribute('src', `${image_base}icons/settings.png`);
            settings_image.setAttribute('alt', 'settings');
            settings_image.style.margin = 'auto';
            settings_image.style.display = 'block';
            settings_cell.append(settings_image);
            option_labels_row.append(settings_cell);

            const generate_cell = document.createElement('td');
            const generate_button = document.createElement('button');
            generate_button.setAttribute('id', Helper.get_id('generate'));
            generate_button.textContent = i18n.LABELS.generate;
            generate_button.style.marginTop = '2px';
            generate_button.classList.add('btn');
            generate_button.disabled = true;
            generate_cell.append(generate_button);
            option_inputs_row.append(generate_cell);

            const panel = document.createElement('div');
            const table = document.createElement('table');
            panel.classList.add('vis', 'vis_item');
            panel.style.margin = '5px';
            panel.append(table);
            table.style.width = '100%';
            table.append(option_labels_row);
            table.append(option_inputs_row);
            return panel;
        },
        create_output_panel: function () {
            const header = document.createElement('thead');

            const create_unit_counter_cell = function (unit_name) {
                const cell = document.createElement('th');
                if (game_data.units.includes(unit_name)) {
                    const unit_image = document.createElement('img');
                    unit_image.setAttribute('src', `${image_base}unit/unit_${unit_name}.png`);
                    unit_image.setAttribute('alt', unit_name);
                    cell.append(unit_image);
                }
                const selected_counter = document.createElement('span');
                selected_counter.setAttribute('id', Helper.get_id(`${unit_name}.selected`));
                selected_counter.textContent = 0;
                const all_counter = document.createElement('span');
                all_counter.setAttribute('id', Helper.get_id(`${unit_name}.all`));
                all_counter.textContent = 0;
                cell.append(document.createTextNode('('));
                cell.append(selected_counter);
                cell.append(document.createTextNode('/'));
                cell.append(all_counter);
                cell.append(document.createTextNode(')'));
                return cell;
            }

            const deff_cell = create_unit_counter_cell('deff');
            const deff_image = document.createElement('img');
            deff_image.setAttribute('src', `${image_base}face.png`);
            deff_image.setAttribute('alt', 'face.png');
            deff_cell.prepend(deff_image);
            header.append(deff_cell);

            for (const unit_name of Guard.deff_units) {
                header.append(create_unit_counter_cell(unit_name));
            }

            const command_cell = document.createElement('th');
            command_cell.append(document.createTextNode(i18n.LABELS.command));
            header.append(command_cell);

            const body = document.createElement('tbody');
            body.setAttribute('id', Helper.get_id('output'));

            const table = document.createElement('table');
            table.style.width = '100%';
            table.append(header);
            table.append(body);

            const panel = document.createElement('div');
            panel.classList.add('vis', 'vis_item');
            panel.style.overflowY = 'auto';
            panel.style.height = '200px';
            panel.style.margin = '5px';
            panel.append(table);
            return panel;
        },
        create_signature_span: function () {
            const span = document.createElement('span');
            span.style.display = 'flex';
            span.style.float = 'left';
            span.style.marginTop = '10px';
            const a = document.createElement('a');
            a.setAttribute('href', i18n.FORUM_THREAD_HREF);
            a.textContent = i18n.FORUM_THREAD;
            span.append(a);
            return span;
        },
        create_bottom_panel: function () {
            const panel = document.createElement('div');
            panel.classList.add('vis_item');
            panel.style.margin = '5px';
            const panel_table = document.createElement('table');
            panel_table.style.width = '100%';
            const panel_tr = document.createElement('tr');
            const panel_td = document.createElement('td');
            panel_table.append(panel_tr);
            panel_tr.append(panel_td);
            panel_td.append(Guard.create_signature_span());
            panel.append(panel_table)
            return panel;
        },
        create_gui: function () {
            const div = document.createElement('div');
            div.style.padding = '0px';
            div.style.margin = '0px 0px 5px 0px';
            div.setAttribute('id', namespace);
            div.classList.add('vis', 'vis_item');
            div.append(Guard.create_main_panel());
            div.append(Guard.create_output_panel());
            div.append(Guard.create_bottom_panel());
            document.querySelector('#contentContainer').prepend(div);
        },
        init_gui: async function () {
            const url_params = new URLSearchParams(location.search);
            const target = Helper.get_control('target');
            target.value = url_params.get('target') || (game_data.screen === 'info_village'
                ? `${TWMap.pos[0]}|${TWMap.pos[1]}`
                : `${game_data.village.x}|${game_data.village.y}`);
            target.disabled = false;

            const strategy = Helper.get_control('strategy');
            for (const key in Guard.strategies) {
                const option = document.createElement('option');
                option.setAttribute('value', key);
                option.text = Guard.strategies[key];
                strategy.append(option);
            }
            strategy.value = Guard.settings.input.strategy;
            strategy.disabled = false;

            for (const option_name of ['deff_count', 'spy_count', 'minimal_deff_count', 'village_count']) {
                const control = Helper.get_control(option_name);
                control.value = url_params.get(option_name) || Guard.settings.input[option_name];
                control.disabled = false;
            }

            const split_units = Helper.get_control('split_units');
            split_units.checked = Guard.settings.input.split_units;
            split_units.disabled = false;

            const groups_info = await Guard.get_groups_info();
            const group = Helper.get_control('group');
            for (const group_info of groups_info.result) {
                const option = document.createElement('option');
                option.setAttribute('value', group_info.group_id);
                option.text = group_info.name;
                group.append(option);
            }
            group.value = Guard.settings.input.group === '-1'
                ? groups_info.group_id
                : Guard.settings.input.group;
            group.disabled = false;

            await Guard.get_world_info();

            let default_date = new Date();
            if (Guard.world_info.config.night.active) {
                let end_hour = Number(Guard.world_info.config.night.end_hour);
                if (default_date.getHours() >= end_hour) {
                    default_date.setDate(default_date.getDate() + 1);
                }
                default_date.setHours(end_hour);
            }

            const arrival_date = Helper.get_control('arrival_date');
            arrival_date.value = url_params.get('arrival_date') || `${default_date.getDate()}.${default_date.getMonth() + 1} ${default_date.getHours()}:00:00`;
            Helper.get_control('generate').addEventListener('click', async () => {
                try { await Guard.generate_commands(); } catch (ex) { Helper.handle_error(ex); }
            });
            Helper.get_control('settings').addEventListener('click', () => {
                try { Guard.edit_settings(); } catch (ex) { Helper.handle_error(ex); }
            });
            const enable_arrival_date = Helper.get_control('is_arrival_date_enabled');
            enable_arrival_date.addEventListener('change', event => {
                Helper.get_control('arrival_date').disabled = !event.target.checked;
            });
            enable_arrival_date.disabled = false;
            Helper.get_control('generate').disabled = false;
            if (url_params.has('arrival_date')) {
                enable_arrival_date.checked = true;
                arrival_date.disabled = false;
            }
        },
        get_groups_info: async function () {
            let url = TribalWars.buildURL('GET', 'groups', { mode: 'overview', ajax: 'load_group_menu' });
            const response = await fetch(url, { credentials: 'include' });
            const text = await response.text();
            const payload = JSON.parse(text);
            payload.result = payload.result.filter(group => group.type !== 'separator');
            payload.result.forEach(group => {
                Guard.group_id2group_name[group.group_id] = group.name;
            });
            return payload;
        },
        get_world_info: async function () {
            Guard.world_info = await get_world_info({ configs: ['config', 'unit_info'] });
        },
        fetch_map_chunk: async function (x_chunk, y_chunk) {
            const map_key = `${x_chunk}_${y_chunk}`;
            if (!Guard.coords2map_chunk.has(map_key)) {
                const url_params = new URLSearchParams({ locale: game_data.locale, v: 2, [map_key]: 1 });
                const response = await fetch(`map.php?${url_params}`);
                const map_info = await response.json();
                Guard.coords2map_chunk.set(map_key, map_info);
            }
            return Guard.coords2map_chunk.get(map_key);
        },
        fetch_village_info: async function (coords) {
            const x_chunk = coords[0] - coords[0] % 20;
            const y_chunk = coords[1] - coords[1] % 20;
            const map_info = await Guard.fetch_map_chunk(x_chunk, y_chunk);
            const village_info = (map_info[0].data.villages[coords[0] - x_chunk] || [])[coords[1] - y_chunk];
            return village_info;
        },
        generate_commands: async function () {
            let get_user_input = function () {
                const user_input = {};
                const numeric_fields = ['deff_count', 'spy_count', 'village_count', 'minimal_deff_count'];
                for (const numeric_field of numeric_fields) {
                    const input = Helper.get_control(numeric_field);
                    Helper.assert_non_negative_number(input, i18n.LABELS[numeric_field]);
                    user_input[numeric_field] = Number(input.value);
                }

                const coords_regex = new RegExp(/^\s*\d{1,3}\|\d{1,3}\s*$/);
                const target = Helper.get_control('target');
                if (!coords_regex.test(target.value)) {
                    target.focus();
                    throw i18n.ERROR.BAD_FORMAT.replace('__1__', i18n.LABELS.target);
                }
                user_input.target = target.value.trim().split('|').map(x => Number(x));
                user_input.strategy = Helper.get_control('strategy').value;
                user_input.group_id = Helper.get_control('group').value;
                user_input.split_units = Helper.get_control('split_units').checked;
                user_input.travel_time = NaN;
                if (Helper.get_control('is_arrival_date_enabled').checked) {
                    let arrival_date = Helper.parse_date(Helper.get_control('arrival_date').value, i18n.LABELS.arrival_date);
                    if (arrival_date.getTime() <= Date.now()) {
                        Helper.get_control('arrival_date').focus();
                        throw i18n.ERROR.PAST_DATE;
                    }
                    user_input.travel_time = (arrival_date.getTime() - Date.now()) / 60 / 1000;
                }
                return user_input;
            };

            let sort_by_deff_asc = function (lhs, rhs) {
                return lhs.deff !== rhs.deff ? lhs.deff > rhs.deff ? 1 : -1 : 0;
            };
            let sort_by_deff_desc = function (lhs, rhs) {
                return lhs.deff !== rhs.deff ? lhs.deff > rhs.deff ? -1 : 1 : 0;
            };

            let sort_by_spy_desc = function (lhs, rhs) {
                return lhs.units.spy !== rhs.units.spy ? lhs.units.spy > rhs.units.spy ? -1 : 1 : 0;
            };
            let sort_by_spy_asc = function (lhs, rhs) {
                return lhs.units.spy !== rhs.units.spy ? lhs.units.spy > rhs.units.spy ? 1 : -1 : 0;
            };

            let sort_by_distance_desc = function (lhs, rhs) {
                return lhs.distance !== rhs.distance ? lhs.distance > rhs.distance ? -1 : 1 : 0;
            };
            let sort_by_distance_asc = function (lhs, rhs) {
                return lhs.distance !== rhs.distance ? lhs.distance > rhs.distance ? 1 : -1 : 0;
            };

            let random_sort = function (villages) {
                for (let i = villages.length - 1; i > 0; i--) {
                    let j = Math.floor(Math.random() * (i + 1));
                    let x = villages[i];
                    villages[i] = villages[j];
                    villages[j] = x;
                }
                return villages;
            };

            let get_troops_info = function (villages, user_input) {
                const troops_info = {
                    villages: [],
                    all: { deff: 0 },
                    selected: { deff: 0 }
                };

                for (const unit_name of Guard.deff_units) {
                    troops_info.all[unit_name] = 0;
                    troops_info.selected[unit_name] = 0;
                }

                for (const village of villages) {
                    const village_troop_info = {
                        deff: 0,
                        name: village.name,
                        id: village.id,
                        coords: village.coords,
                        distance: Math.hypot(user_input.target[0] - village.coords[0], user_input.target[1] - village.coords[1]),
                        units: {}
                    };

                    if (village_troop_info.distance === 0) {
                        continue;
                    }

                    for (const unit_name of Guard.deff_units) {
                        const ratio = Guard.settings.ratio[unit_name] === undefined
                            ? 0
                            : Number(Guard.settings.ratio[unit_name]);

                        village_troop_info.units[unit_name] = village.units[unit_name] === undefined
                            ? 0
                            : Math.max(village.units[unit_name] - Number(Guard.settings.safeguard[unit_name]), 0);

                        if (!isNaN(user_input.travel_time) && Guard.world_info.unit_info.hasOwnProperty(unit_name)) {
                            if (Number(Guard.world_info.unit_info[unit_name].speed) * village_troop_info.distance > user_input.travel_time) {
                                village_troop_info.units[unit_name] = 0;
                            }
                        }

                        if (unit_name !== 'spy' && ratio === 0) {
                            village_troop_info.units[unit_name] = 0;
                        }

                        village_troop_info.deff += Number(village_troop_info.units[unit_name]) * ratio;
                        troops_info.all[unit_name] += village_troop_info.units[unit_name];
                    }
                    troops_info.all.deff += village_troop_info.deff;
                    troops_info.villages.push(village_troop_info);
                }
                return troops_info;
            }

            const preprocess = function (troops_info, user_input) {
                troops_info.villages = troops_info.villages.filter(village => village.deff >= user_input.minimal_deff_count);
                switch (user_input.strategy) {
                    case 'DIST_ASC': troops_info.villages.sort(sort_by_distance_asc); break;
                    case 'DIST_DESC': troops_info.villages.sort(sort_by_distance_desc); break;
                    case 'TROOP_ASC': troops_info.villages.sort(user_input.deff_count ? sort_by_deff_asc : sort_by_spy_asc); break;
                    case 'TROOP_DESC': troops_info.villages.sort(user_input.deff_count ? sort_by_deff_desc : sort_by_spy_desc); break;
                    default: random_sort(troops_info.villages); break;
                }
                troops_info.villages = troops_info.villages.slice(0, user_input.village_count);
            }

            let select_troops = function (troops_info, user_input) {
                troops_info.villages.sort(sort_by_deff_desc);
                for (let i = troops_info.villages.length; i > 0; i--) {
                    const village = troops_info.villages[i - 1];
                    const threshold = (user_input.deff_count - troops_info.selected.deff) / i;
                    const ratio = threshold < village.deff ? threshold / village.deff : 1.0;
                    for (const unit_name in Guard.default_settings.ratio) {
                        if (Guard.deff_units.includes(unit_name)) {
                            const selected_count = Math.min(Math.round(ratio * village.units[unit_name]), village.units[unit_name]);
                            troops_info.selected[unit_name] += selected_count;
                            troops_info.selected.deff += selected_count * Number(Guard.settings.ratio[unit_name]);
                            village.units[unit_name] = selected_count;
                        }
                    }
                }
                troops_info.villages.sort(sort_by_spy_desc);
                for (let i = troops_info.villages.length; i > 0; i--) {
                    const village = troops_info.villages[i - 1];
                    const threshold = (user_input.spy_count - troops_info.selected.spy) / i;
                    const ratio = threshold < village.units.spy ? threshold / village.units.spy : 1.0;
                    const selected_count = Math.min(Math.round(ratio * village.units.spy), village.units.spy);
                    troops_info.selected.spy += selected_count;
                    village.units.spy = selected_count;
                }
                for (const unit_name in troops_info.all) {
                    Helper.get_control(`${unit_name}.all`).textContent = Helper.beautify_number(troops_info.all[unit_name])
                    Helper.get_control(`${unit_name}.selected`).textContent = Helper.beautify_number(troops_info.selected[unit_name]);
                }
            };

            const user_input = get_user_input();

            const target_info = await Guard.fetch_village_info(user_input.target);

            const villages = await Guard.get_villages(user_input.group_id);

            if (!target_info) {
                throw i18n.ERROR.INVALID_VILLAGE_INFO;
            }

            if (target_info[Guard._village_info.ALLY_ID] !== game_data.player.ally) {
                throw i18n.ERROR.NO_OTHER_SUPPORT_CONFLICT;
            }

            if (villages == null) {
                throw i18n.ERROR.EMPTY_GROUP;
            }

            const current_commands = [...Helper.get_control('output').children];
            for (let i = current_commands.length - 1; i >= 0; i--) {
                current_commands[i].remove();
            }
            const generate_button = Helper.get_control('generate');

            try {
                generate_button.disabled = true;
                const troops_info = get_troops_info(villages, user_input);
                preprocess(troops_info, user_input);
                select_troops(troops_info, user_input);
                if (user_input.deff_count && !user_input.spy_count && !troops_info.selected.deff) {
                    throw i18n.ERROR.EMPTY_DEFF_SELECTION;
                }
                if (user_input.split_units) {
                    for (const speed_group of Guard.speed_groups) {
                        const snapshot = JSON.parse(JSON.stringify(troops_info));
                        let total = 0;
                        for (const unit_name of Guard.deff_units) {
                            snapshot.selected[unit_name] = 0;
                            for (const village of snapshot.villages) {
                                if (!speed_group.includes(unit_name)) {
                                    village.units[unit_name] = 0;
                                } else {
                                    snapshot.selected[unit_name] += village.units[unit_name];
                                }
                            }
                            total += snapshot.selected[unit_name];
                        }
                        if (total) {
                            Guard.add_command(snapshot, user_input, target_info, speed_group[0]);
                        }
                    }
                }
                else {
                    Guard.add_command(troops_info, user_input, target_info, 'all');
                }
            }
            finally {
                generate_button.disabled = false;
            }
        },
        get_villages: async function (group_id) {
            if (Guard.group_id2villages.has(group_id)) {
                return Guard.group_id2villages.get(group_id);
            }
            let url = TribalWars.buildURL('GET', 'overview_villages', { mode: 'units', type: 'own_home', group: group_id, page: -1, });
            const request = await fetch(url, { credentials: 'same-origin' });
            const response = await request.text();
            const requested_body = document.createElement('body');
            requested_body.innerHTML = response;
            const units_table = requested_body.querySelector('#units_table');
            if (!units_table) {
                return null;
            }
            const villages = [];
            for (let i = 1; i < units_table.rows.length; i++) {
                let row = units_table.rows[i];
                let units = {};
                const offset = 2;
                for (let j = 0; j < game_data.units.length; j++) {
                    let unit_name = game_data.units[j];
                    units[unit_name] = Number(row.cells[offset + j].textContent);
                }
                let main_cell = row.cells[0];
                let name = main_cell.textContent.trim();
                let villagei18n = {
                    name: name,
                    coords: name.match(/\d+\|\d+/).pop().split('|').map(x => Number(x)),
                    id: main_cell.children[0].getAttribute('data-id'),
                    units: units
                };
                villages.push(villagei18n);
            }
            Guard.group_id2villages.set(group_id, villages);
            return villages;
        },
        edit_settings: function () {
            const default_settings = Guard.get_default_settings();

            let add_unit_fieldset = function (branch) {
                let fieldset = `<fieldset><legend>${i18n.FIELDSET[branch]}</legend><table>`;
                for (const unit_name in default_settings[branch]) {
                    if (Guard.deff_units.includes(unit_name)) {
                        const id = Helper.get_id(`${branch}.${unit_name}`);
                        const value = default_settings[branch][unit_name];
                        const title = `${i18n.FIELDSET[branch]} - ${i18n.UNITS[unit_name]}`
                        fieldset += '<tr>';
                        fieldset += `<td><label for='${id}' title='${title}'><image src='${image_base}unit/unit_${unit_name}.png' alt='${unit_name}'></image></label></td>`;
                        fieldset += `<td><input id='${id}' value='${value}'/></td>`;
                        fieldset += '</tr>';
                    }
                }
                fieldset += '</table></fieldset>';
                return fieldset;
            };

            let add_setttings_input = function (id, value) {
                return `<td><input id='${id}' value='${value}'/></td>`;
            };

            let add_settings_select = function (id, options) {
                let html = `<td><select id='${id}'>`;
                for (let key in options) {
                    html += `<option value='${key}'>${options[key]}</option>`
                }
                html += '</select></td>';
                return html;
            };

            let add_settings_checkbox = function (id, checked) {
                return `<td><input id='${id}' type='checkbox' ${checked ? 'checked' : ''} style='margin-left:0px;'/></td>`;
            };

            let add_input_fieldset = function () {
                let fieldset = `<fieldset><legend>${i18n.FIELDSET.input}</legend><table>`;
                for (const key in default_settings.input) {
                    const id = Helper.get_id(`input.${key}`);
                    const value = default_settings.input[key];
                    fieldset += '<tr>';
                    fieldset += `<td><label for='${id}'>${i18n.LABELS[key]}:</label></td>`;
                    switch (key) {
                        case 'strategy': fieldset += add_settings_select(id, Guard.strategies); break;
                        case 'group': fieldset += add_settings_select(id, Guard.group_id2group_name); break;
                        case 'split_units': fieldset += add_settings_checkbox(id, value); break;
                        default: fieldset += add_setttings_input(id, value); break;
                    }
                    fieldset += '</tr>';
                }
                fieldset += '</table></fieldset>';
                return fieldset;
            };

            let save_settings = function () {
                const settings = { ratio: {}, safeguard: {}, input: {} };
                try {
                    for (const branch of ['ratio', 'safeguard']) {
                        for (const unit_name in default_settings[branch]) {
                            if (Guard.deff_units.includes(unit_name)) {
                                const user_input = Helper.get_control(`${branch}.${unit_name}`);
                                Helper.assert_non_negative_number(user_input, `${i18n.FIELDSET[branch]} - ${i18n.UNITS[unit_name]}`);
                                settings[branch][unit_name] = Number(user_input.value);
                                Guard.settings[branch][unit_name] = Number(user_input.value);
                            }
                        }
                    }
                    for (const key in default_settings.input) {
                        const user_input = Helper.get_control(`input.${key}`);
                        if (['strategy', 'group'].includes(key)) {
                            settings.input[key] = user_input.value;
                        } else if (key === 'split_units') {
                            settings.input[key] = user_input.checked;
                        } else {
                            Helper.assert_non_negative_number(user_input, i18n.LABELS[key]);
                            settings.input[key] = Number(user_input.value);
                        }
                    }
                    localStorage.setItem(namespace, JSON.stringify(settings));
                    UI.SuccessMessage(i18n.SETTINGS_SAVED);
                    document.querySelector('.popup_box_close').click();
                } catch (ex) {
                    Helper.handle_error(ex);
                }
            };

            let reset_settings = function () {
                Guard.settings = JSON.parse(JSON.stringify(Guard.default_settings));
                localStorage.removeItem(namespace);
                UI.SuccessMessage(i18n.SETTINGS_RESETED);
                document.querySelector('.popup_box_close').click();
            };

            let gui = '<div>';
            gui += add_unit_fieldset('ratio');
            gui += add_unit_fieldset('safeguard');
            gui += add_input_fieldset();
            const reset_settings_id = Helper.get_id('reset_settings');
            const save_settings_id = Helper.get_id('save_settings');
            gui += `<button disabled id='${reset_settings_id}' class='btn'>${i18n.LABELS.reset_settings}</button>`;
            gui += `<button disabled id='${save_settings_id}' class='btn right'>${i18n.LABELS.save_settings}</button><div>`;
            Dialog.show(Helper.get_id('settings_editor'), gui);
            setTimeout(() => {
                Helper.get_control('input.group').value = default_settings.input.group;
                Helper.get_control('input.strategy').value = default_settings.input.strategy;
                const reset_settings_button = Helper.get_control('reset_settings');
                reset_settings_button.addEventListener('click', reset_settings);
                reset_settings_button.disabled = false;
                const save_settings_button = Helper.get_control('save_settings');
                save_settings_button.addEventListener('click', save_settings);
                save_settings_button.disabled = false;
            });

        },
        _village_info: {
            ALLY_ID: 11,
            VILLAGE_ID: 0
        },
        coords2map_chunk: new Map(),
        group_id2villages: new Map(),
        group_id2group_name: {
            '-1': i18n.CURRENTLY_SELECTED_GROUP
        },
        strategies: {
            'TROOP_DESC': i18n.STRATEGY.TROOP_DESC,
            'TROOP_ASC': i18n.STRATEGY.TROOP_ASC,
            'DIST_DESC': i18n.STRATEGY.DIST_DESC,
            'DIST_ASC': i18n.STRATEGY.DIST_ASC,
            'RANDOM': i18n.STRATEGY.RANDOM
        },
        default_settings: {
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
            input: {
                deff_count: 0,
                spy_count: 0,
                village_count: 12,
                minimal_deff_count: 0,
                strategy: 'TROOP_DESC',
                group: '-1',
                split_units: false,
            },
        },
        deff_units: [],
        speed_groups: [['spear', 'archer'], ['sword'], ['spy', 'heavy']],
        settings: {},
        get_default_settings: function () {
            let stored_settings = localStorage.getItem(namespace);
            return stored_settings
                ? JSON.parse(stored_settings)
                : JSON.parse(JSON.stringify(Guard.default_settings));
        },
        init_settings: function () {
            Guard.settings = Guard.get_default_settings();
            Guard.deff_units = Object.keys(Guard.default_settings.safeguard)
                .filter(unit_name => game_data.units.includes(unit_name));
        },
        main: async function () {
            if (mobile) {
                throw i18n.ERROR.MOBILE;
            }
            let instance = Helper.get_control();
            if (instance) {
                instance.remove();
                return;
            }
            Guard.init_settings();
            Guard.create_gui();
            $.ajax({
                url: 'https://media.innogamescdn.com/com_DS_PL/skrypty/HermitowskiePlikiMapy.js?_=' + ~~(Date.now() / 9e6),
                dataType: 'script',
                cache: true
            }).then(() => {
                Guard.init_gui().catch(Helper.handle_error);
            });
        }
    };
    try { await Guard.main(); } catch (ex) { Helper.handle_error(ex); }
    console.log(`${namespace} | Elapsed time: ${Date.now() - start} [ms]`);
})(TribalWars);

