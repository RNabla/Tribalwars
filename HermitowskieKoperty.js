/**
 * Generating mail template for nearby players that can help
 * Created by: Hermitowski
 * Modified on: 11/10/2019 - version 2.0
 */

(async function (TribalWars) {
    const start = Date.now();
    const namespace = 'Hermitowski.Mailing';
    const i18n = {
        SETTINGS_SAVED: 'Zapisano pomy\u{15B}lnie',
        SETTINGS_RESETED: 'Przywr\u{F3}cono domy\u{15B}lne ustawienia',
        ERROR_MESSAGE: 'Komunikat o b\u{142}\u{119}dzie: ',
        FORUM_THREAD: 'Link do w\u{105}tku na forum',
        FORUM_THREAD_HREF: 'https://forum.plemiona.pl/index.php?threads/HermitowskieKoperty.125615/',
        TROOPS_TIME_PER_FIELD: '(__1__ na pole)',
        NO_TROOPS: 'Brak wojska',
        SIGIL_OF_DISTRESS: 'Amulet strapionych',
        ERROR: {
            BAD_FORMAT: 'Pole <strong>__1__<\/strong> ma z\u{142}y format',
            PAST_DATE: 'Podany punkt w czasie nale\u{17C}y do przesz\u{142}o\u{15B}ci',
            MOBILE: 'Wersja mobilna nie jest wspierana',
            NO_ALLY: 'Nie ma kto ci pom\u00F3c',
            EMPTY_SELECTION: '\u017Baden z graczy nie zd\u0105\u017Cy :(',
            NEW_WINDOW: 'Ups... Wygl\u0105da na to, \u017Ce obecne ustawienia przegl\u0105darki nie pozwalaj\u0105 otworzy\u0107 nowego okna',
            NO_MORE_COMMANDS: 'Nie ma wi\u0119cej komend'
        },
        TEMPLATE: {
            VILLAGE: 'Wioska',
            ARRIVAL_DATE: 'Pomoc potrzebna na',
            LOYALTY: 'Poparcie',
            TROOPS: 'Wojska',
            WALL: 'Mur',
            INCOMING_COMMANDS: 'Nadchodz\u0105ce wojska',
            MAILING_LIST: 'Lista mailingowa',
            IGNORED_COMMAND: 'ignorowane'
        },
        UNITS: {
            spy: 'Zwiadowca',
            light: 'Lekka kawaleria',
            heavy: 'Ci\u{119}\u{17C}ka kawaleria',
            spear: 'Pikinier',
            sword: 'Miecznik',
            ram: 'Taran',
            snob: 'Szlachcic',
        },
        FIELDSET: {
            user_input: 'Domy\u{15B}lne warto\u{15B}ci',
            village_info: 'Poka\u017C informacje o wiosce - szczeg\u00F3\u0142y',
            diplomacy: 'Importuj graczy z dyplomacji plemienia - szczeg\u00F3\u0142y',
            incoming_commands_info: 'Nadchodz\u0105ce wojska',
            misc: 'R\u00F3\u017Cne',
        },
        LABELS: {
            target: 'Cel',
            help_speed: 'Pr\u0119dko\u015B\u0107 pomocy',
            support_bonus_speed: 'Szybciej podr\u00F3\u017Cuj\u0105ce wsparcie (%)',
            arrival_date: 'Pomoc potrzebna na',
            split_units: 'Rozdziel jednostki',
            import_diplomacy: 'Importuj graczy z dyplomacji plemienia',
            import_naps: 'Importuj z pakt\u00F3w o nieagresji',
            show_village_info: 'Poka\u017C informacje o wiosce',
            show_troops: 'Poka\u017C wojska',
            show_loyalty: 'Poka\u017C poparcie',
            show_wall_level: 'Poka\u017C poziom muru',
            show_incoming_commands: 'Poka\u017C nadchodz\u0105ce wojska',
            show_ignored_commands: 'Poka\u017C ignorowane komendy',
            show_supports: 'Poka\u017C przybywaj\u0105ce wsparcia',
            show_mailing_list: 'Poka\u017C list\u0119 mailingow\u0105',
            message_title: 'Tytu\u0142 wiadomo\u015Bci',
            generate: 'Generuj',
            save_settings: 'Zapisz',
            reset_settings: 'Przywr\u{F3}\u{107} domy\u{15B}lne',
        }
    };
    const Helper = {
        three_digit: function (value) {
            return value > 99
                ? `${value}`
                : `0${Helper.two_digit(value)}`;
        },
        two_digit: function (value) {
            return value > 9
                ? `${value}`
                : `0${value}`;
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
                milliseconds: time_parts[3] || 0,
            };
            if (date_matches) {
                const date_match = date_matches[0];
                switch (date_match) {
                    case 'jutro': parts.date = today.getDate() + 1; break;
                    case 'dzisiaj': break;
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
            const user_date = new Date(parts.year, parts.month, parts.date, parts.hours, parts.minutes, parts.seconds, parts.milliseconds);
            if (!date_matches && user_date.getTime() < Date.now()) {
                user_date.setDate(user_date.getDate() + 1);
            }
            return user_date;
        },
        get_date_string: function (date_object, with_milliseconds) {
            const date = Helper.two_digit(date_object.getDate());
            const month = Helper.two_digit(date_object.getMonth() + 1);
            const hour = Helper.two_digit(date_object.getHours());
            const minutes = Helper.two_digit(date_object.getMinutes());
            const seconds = Helper.two_digit(date_object.getSeconds());
            if (with_milliseconds) {
                const ms = Helper.three_digit(date_object.getMilliseconds());
                return `${date}.${month} ${hour}:${minutes}:${seconds}[color=grey].${ms}[/color]`;
            }
            return `${date}.${month} ${hour}:${minutes}:${seconds}`;
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
    const Mailing = {
        create_main_panel: function () {
            const options = [
                { name: 'target', controls: [{ type: 'input', attributes: { id: 'target', size: 10 } }] },
                { name: 'arrival_date', controls: [{ type: 'input', attributes: { id: 'arrival_date', size: 12 } }] },
                { name: 'help_speed', controls: [{ type: 'select', attributes: { id: 'help_speed' } }] },
                { name: 'support_bonus_speed', controls: [{ type: 'input', attributes: { id: 'support_bonus_speed' } }] },
                { name: 'import_diplomacy', controls: [{ type: 'input', attributes: { id: 'import_diplomacy', type: 'checkbox' } }] },
                { name: 'show_village_info', controls: [{ type: 'input', attributes: { id: 'show_village_info', type: 'checkbox' } }] },
                { name: 'show_incoming_commands', controls: [{ type: 'input', attributes: { id: 'show_incoming_commands', type: 'checkbox' } }] },
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
                    if (option.name === 'arrival_date' && game_data.screen === 'overview') {
                        option_span.style.marginTop = '2px';
                        option_control.style.height = '13px';
                        for (const direction of ['Left', 'Right']) {
                            const arrow = document.createElement('span');
                            arrow.setAttribute('id', Helper.get_id(`arrival_date.${direction.toLowerCase()}`));
                            arrow.style.display = 'block';
                            arrow.style.width = '16px';
                            arrow.style.height = '22px';
                            arrow.style.cursor = 'pointer';
                            arrow.classList.add(`arrow${direction}`);
                            option_span.append(arrow);
                        }
                    }
                }
                option_cell.append(option_span);
                return option_cell;
            }

            const option_labels_row = document.createElement('tr');
            const option_inputs_row = document.createElement('tr');

            for (const option of options) {
                if (game_data.screen !== 'overview' && ['show_village_info', 'show_incoming_commands'].includes(option.name)) {
                    continue;
                }
                option_labels_row.append(create_option_label(option));
                option_inputs_row.append(create_option_input(option));
            }

            const settings_cell = document.createElement('th');
            const settings_image = document.createElement('img');
            settings_image.setAttribute('id', Helper.get_id('settings'));
            settings_image.setAttribute('src', `${image_base}icons/settings.png`);
            settings_image.setAttribute('alt', 'settings');
            settings_image.style.margin = '0 5px 0 0';
            settings_image.style.float = 'right';
            settings_cell.append(settings_image);
            option_labels_row.append(settings_cell);

            const generate_cell = document.createElement('td');
            const generate_button = document.createElement('button');
            generate_button.setAttribute('id', Helper.get_id('generate'));
            generate_button.textContent = i18n.LABELS.generate;
            generate_button.style.margin = '2px 5px 0 0';
            generate_button.style.float = 'right';
            generate_button.classList.add('btn');
            generate_button.disabled = true;
            generate_cell.append(generate_button);
            option_inputs_row.append(generate_cell);

            const panel = document.createElement('div');
            const table = document.createElement('table');
            panel.classList.add('vis', 'vis_item');
            panel.style.margin = '5px 5px 0px 5px';
            panel.append(table);
            table.style.width = '100%';
            table.append(option_labels_row);
            table.append(option_inputs_row);
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
            panel.style.margin = '0px 5px 5px 5px';
            panel.style.padding = '0';
            const panel_table = document.createElement('table');
            panel_table.style.width = '100%';
            const panel_tr = document.createElement('tr');
            const panel_td = document.createElement('td');
            panel_table.append(panel_tr);
            panel_tr.append(panel_td);
            panel_td.append(Mailing.create_signature_span());
            panel.append(panel_table)
            return panel;
        },
        create_gui: function () {
            const div = document.createElement('div');
            div.style.padding = '0px';
            div.style.margin = '0px 0px 5px 0px';
            div.setAttribute('id', namespace);
            div.classList.add('vis', 'vis_item');
            div.append(Mailing.create_main_panel());
            div.append(Mailing.create_bottom_panel());
            document.querySelector('#contentContainer').prepend(div);
        },
        init_gui: async function () {
            const target = Helper.get_control('target');
            target.value = game_data.screen === 'info_village'
                ? `${TWMap.pos[0]}|${TWMap.pos[1]}`
                : `${game_data.village.x}|${game_data.village.y}`;
            target.disabled = false;

            await Mailing.get_world_info();

            let default_date = new Date();
            if (Mailing.world_info.config.night.active) {
                let end_hour = Number(Mailing.world_info.config.night.end_hour);
                if (default_date.getHours() >= end_hour) {
                    default_date.setDate(default_date.getDate() + 1);
                }
                default_date.setHours(end_hour);
            }
            Helper.get_control('arrival_date').value = `${default_date.getDate()}.${default_date.getMonth() + 1} ${default_date.getHours()}:00:00`;
            Helper.get_control('arrival_date').disabled = false;

            const help_speed = Helper.get_control('help_speed');
            const troops_speeds = Mailing.get_troops_speeds();
            for (const unit_name in troops_speeds) {
                const option = document.createElement('option');
                option.setAttribute('value', unit_name);
                option.text = troops_speeds[unit_name];
                help_speed.append(option);
            }

            help_speed.value = Mailing.settings.user_input.help_speed;
            help_speed.disabled = false;

            const support_bonus_speed = Helper.get_control('support_bonus_speed');
            support_bonus_speed.value = Mailing.settings.user_input.support_bonus_speed;
            support_bonus_speed.disabled = false;

            Helper.get_control('import_diplomacy').checked = Mailing.settings.user_input.import_diplomacy;
            Helper.get_control('import_diplomacy').disabled = false;

            if (game_data.screen === 'overview') {
                const support_bonus_speed_modifier = Mailing.get_support_bonus_speed();
                if (support_bonus_speed_modifier) {
                    Helper.get_control('support_bonus_speed').value = support_bonus_speed_modifier;
                }

                Helper.get_control('show_village_info').checked = Mailing.settings.user_input.show_village_info;
                Helper.get_control('show_village_info').disabled = false;
                Helper.get_control('show_incoming_commands').checked = Mailing.settings.user_input.show_incoming_commands;
                Helper.get_control('show_incoming_commands').disabled = false;

                Mailing.incoming_commands = Mailing.get_incoming_commands();

                const incoming_attacks = Mailing.incoming_commands.filter(x => x.command_type === 'attack');
                if (incoming_attacks) {
                    const noble_incoming_command = incoming_attacks.find(x => x.unit_type === 'snob');
                    if (noble_incoming_command) {
                        Helper.get_control('arrival_date').value = Helper.get_date_string(noble_incoming_command.arrival_date, false);
                    } else {
                        const first_lethal = incoming_attacks.find(x => x.unit_type !== 'spy');
                        if (first_lethal) {
                            Helper.get_control('arrival_date').value = Helper.get_date_string(first_lethal.arrival_date, false);
                        } else {
                            Helper.get_control('arrival_date').value = Helper.get_date_string(incoming_attacks[0].arrival_date, false);
                            Helper.get_control('help_speed').value = 'spy';
                        }
                    }
                }

                Helper.get_control('arrival_date.right').addEventListener('click', () => {
                    try { Mailing.set_arrival_date('before'); } catch (ex) { Helper.handle_error(ex); }
                });
                Helper.get_control('arrival_date.left').addEventListener('click', () => {
                    try { Mailing.set_arrival_date('after'); } catch (ex) { Helper.handle_error(ex); }
                });
            }
            Helper.get_control('generate').addEventListener('click', async () => {
                try { await Mailing.generate(); } catch (ex) { Helper.handle_error(ex); }
            });
            Helper.get_control('settings').addEventListener('click', () => {
                try { Mailing.edit_settings(); } catch (ex) { Helper.handle_error(ex); }
            });
            Helper.get_control('generate').disabled = false;
        },
        get_support_bonus_speed: function () {
            const bonus = [...document.querySelector('#show_effects').querySelectorAll('td')]
                .filter(x => x.tooltipText)
                .map(x => x.tooltipText)
                .find(x => x.includes(i18n.SIGIL_OF_DISTRESS));
            return bonus
                ? Number(bonus.match(/\d+(?=%)/g)[0])
                : null;
        },
        get_troops_speeds: function () {
            const troops_speeds = {};
            for (const unit_name of ['spy', 'light', 'heavy', 'spear', 'sword', 'ram', 'snob']) {
                const speed = parseFloat(Mailing.world_info.unit_info[unit_name].speed);
                const hour = ~~speed;
                const minutes = Math.round((speed - hour) * 60);
                const speed_human_format = `${hour}:${minutes}`;
                const text = `${i18n.UNITS[unit_name]} ${i18n.TROOPS_TIME_PER_FIELD.replace('__1__', speed_human_format)}`;
                troops_speeds[unit_name] = text;
            }
            return troops_speeds;
        },
        get_diplomacy: async function () {
            if (Mailing.diplomacy) {
                return Mailing.diplomacy;
            }
            const response = await fetch(TribalWars.buildURL('GET', 'ally', { mode: 'contracts' }));
            const text = await response.text();
            const requested_body = document.createElement('body');
            requested_body.innerHTML = text;
            const partners_table = requested_body.querySelector('#partners');
            const partners = { allies: [], naps: [], enemies: [] };
            const tags = ['allies', 'naps', 'enemies'];
            let tag_id = -1;
            for (let i = 0; i < partners_table.rows.length; i++) {
                if (partners_table.rows[i].getElementsByTagName('th').length) {
                    tag_id++;
                    continue;
                }
                if (partners_table.rows[i].cells[0].children.length) {
                    const ally_id = partners_table.rows[i].cells[0].children[0].href.match(/=?id=(\d+)/).pop();
                    partners[tags[tag_id]].push(ally_id);
                }
            }
            Mailing.diplomacy = partners;
            return partners;
        },
        get_incoming_commands: function () {
            const table = document.querySelector('#commands_incomings');
            if (!table) {
                return [];
            }
            return [...table.querySelectorAll('.command-row')].map(command => {
                const is_ignored = command.classList.contains('ignored_command');
                const icons = [...command.querySelector('.icon-container').querySelectorAll('img')];
                const command_type = icons[0].getAttribute('src').split('/').pop().split('.')[0];
                const unit_type = icons.length > 1
                    ? icons[1].getAttribute('src').split('/').pop().split('.')[0]
                    : null;
                const arrival_date = Helper.parse_date(command.cells[1].innerText);
                const label = command.cells[0].innerText.trim().replace(/\s\s+/, ' ');
                const coords_matches = label.match(/\d+\|\d+/);
                let coords = coords_matches
                    ? coords_matches.pop()
                    : null;
                let player = command_type === 'support' && command.querySelector('.command_hover_details')
                    ? (label.includes(':') ? label.split(':')[0] : null)
                    : null;
                if (!player && coords) {
                    const parts = coords.split('|').map(x => Number(x));
                    const origin_village = Mailing.world_info.village.find(v => v.x === parts[0] && v.y == parts[1]);
                    if (origin_village) {
                        const origin_player = Mailing.world_info.player.find(p => p.id === origin_village.player_id);
                        if (origin_player) {
                            player = origin_player.name;
                        }
                    } else {
                        coords = null;
                    }
                }
                return { is_ignored, command_type, unit_type, arrival_date, label, coords, player };
            });
        },
        get_world_info: async function () {
            const world_settings = {
                configs: ['config', 'unit_info'],
                entities: {
                    'ally': ['id'],
                    'player': ['id', 'ally_id', 'name'],
                    'village': ['id', 'x', 'y', 'player_id']
                }
            };
            Mailing.world_info = await get_world_info(world_settings);
        },
        set_arrival_date: function (when) {
            const current_timestamp = ~~(+Helper.parse_date(Helper.get_control('arrival_date').value, i18n.LABELS.arrival_date) / 1000);
            const timestamps = Mailing.incoming_commands.filter(x => x.command_type !== 'support' && !x.is_ignored).map(x => ~~(+x.arrival_date / 1000));
            const new_timestamp = when === 'after'
                ? timestamps.reverse().find(timestamp => timestamp < current_timestamp)
                : timestamps.find(timestamp => timestamp > current_timestamp);
            if (!new_timestamp) {
                throw i18n.ERROR.NO_MORE_COMMANDS;
            }
            Helper.get_control('arrival_date').value = Helper.get_date_string(new Date(new_timestamp * 1000));
        },
        generate: async function () {
            const user_input = Mailing.get_user_input();
            const generate_button = Helper.get_control('generate');
            generate_button.disabled = true;

            const recipients = await Mailing.get_recipients(user_input);
            const mail_template = Mailing.generate_mail_template(user_input, recipients);
            if (!recipients.length) {
                generate_button.disabled = false;
                throw i18n.ERROR.EMPTY_SELECTION;
            }

            let new_message_link = TribalWars.buildURL('GET', 'mail', { mode: 'new' });

            if (!document.querySelector('#new_mail')) {
                const new_message_url = new URLSearchParams(new_message_link);
                new_message_url.delete('t');
                new_message_link = decodeURI(new_message_url.toString());
            }

            const new_window = window.open(new_message_link);

            if (!new_window) {
                generate_button.disabled = false;
                throw i18n.ERROR.NEW_WINDOW;
            }

            new_window.addEventListener('load', () => {
                const message_form = new_window.document.querySelector('#form');
                message_form.querySelector('#to').value = recipients.join(';');
                message_form.querySelector('.vis').rows[1].cells[1].children[0].value = `[HM] ${Mailing.settings.misc.message_title}`;
                message_form.querySelector('#message').value = mail_template;
            });
            generate_button.disabled = false;
        },
        get_user_input: function () {
            const user_input = {};
            const coords_regex = new RegExp(/^\s*\d{1,3}\|\d{1,3}\s*$/);
            const target = Helper.get_control('target');
            if (!coords_regex.test(target.value)) {
                target.focus();
                throw i18n.ERROR.BAD_FORMAT.replace('__1__', i18n.LABELS.target);
            }
            user_input.target = target.value.trim().split('|').map(x => Number(x));
            const selected_unit = Helper.get_control('help_speed').value;
            user_input.import_diplomacy = Helper.get_control('import_diplomacy').checked;
            user_input.arrival_date = Helper.parse_date(Helper.get_control('arrival_date').value, i18n.LABELS.arrival_date);

            if (user_input.arrival_date.getTime() <= Date.now()) {
                Helper.get_control('arrival_date').focus();
                throw i18n.ERROR.PAST_DATE;
            }
            const travel_speed = Mailing.world_info.unit_info[selected_unit].speed * (100 - Number(Helper.get_control('support_bonus_speed').value)) / 100;
            const travel_time = (user_input.arrival_date.getTime() - Date.now()) / 60 / 1000;
            user_input.range = travel_time / travel_speed;
            const show_village_info_control = Helper.get_control('show_village_info')
            user_input.show_village_info = show_village_info_control
                ? show_village_info_control.checked
                : false;
            const show_incoming_commands_control = Helper.get_control('show_incoming_commands')
            user_input.show_incoming_commands = show_incoming_commands_control
                ? show_incoming_commands_control.checked
                : false;
            return user_input;
        },
        get_recipients: async function (user_input) {
            let ally_ids = new Set([game_data.player.ally]);
            if (user_input.import_diplomacy) {
                const diplomacy = await Mailing.get_diplomacy();
                for (const ally_id of diplomacy.allies) {
                    ally_ids.add(ally_id)
                }
                if (Mailing.settings.diplomacy.import_naps) {
                    for (const ally_id of diplomacy.naps) {
                        ally_ids.add(ally_id)
                    }
                }
            }

            const is_in_range = function (village) {
                return Math.hypot(user_input.target[0] - village.x, user_input.target[1] - village.y) <= user_input.range;
            }

            return Mailing.world_info.player.filter(p => {
                return p.id != game_data.player.id &&
                    ally_ids.has(p.ally_id) &&
                    Mailing.world_info.village.some(v => v.player_id == p.id && is_in_range(v))
            }).map(p => p.name);
        },
        generate_mail_template: function (user_input, recipients) {
            const arrival_date = Helper.get_date_string(user_input.arrival_date, false);
            let content = `[b]${i18n.TEMPLATE.VILLAGE}[/b]: ${user_input.target.join('|')}`;
            const target_village = Mailing.world_info.village.find(v => v.x === user_input.target[0] && v.y === user_input.target[1]);
            if (target_village) {
                content += ` [url=game.php?screen=info_village&id=${target_village.id}&arrival_date=${arrival_date}]HermitowskieObstawy[/url]`;
            }
            content += `\n[b]${i18n.TEMPLATE.ARRIVAL_DATE}[/b]: ${arrival_date}`;
            if (game_data.screen === 'overview' && user_input.show_village_info) {
                if (Mailing.settings.village_info.show_loyalty) {
                    const loyalty_matches = document.querySelector('#show_mood').innerText.match(/\d+/);
                    const loyalty = loyalty_matches
                        ? loyalty_matches.pop()
                        : 100;
                    content += `\n[b]${i18n.TEMPLATE.LOYALTY}[/b]: ${loyalty}`;
                }
                if (Mailing.settings.village_info.show_troops) {
                    const unit_links = document.querySelector('#show_units').querySelectorAll('.unit_link');
                    const troops = unit_links.length
                        ? [...unit_links].map(x => `[unit]${x.getAttribute('data-unit')}[/unit]${x.parentNode.children[1].innerText}`).join(' ')
                        : i18n.NO_TROOPS;
                    content += `\n[b]${i18n.TEMPLATE.TROOPS}[/b]: ${troops}`;
                }
                if (Mailing.settings.village_info.show_wall_level) {
                    content += `\n[b]${i18n.TEMPLATE.WALL}[/b]: ${game_data.village.buildings.wall}`;
                }
            }

            if (game_data.screen === 'overview' && user_input.show_incoming_commands) {

                let incoming_commands = Mailing.incoming_commands;
                if (!Mailing.settings.incoming_commands_info.show_ignored_commands) {
                    incoming_commands = incoming_commands.filter(x => !x.is_ignored);
                }
                if (!Mailing.settings.incoming_commands_info.show_supports) {
                    incoming_commands = incoming_commands.filter(x => x.command_type !== 'support');
                }
                if (incoming_commands.length) {
                    const command_labels = incoming_commands.map(incoming_command => {
                        let command_label = '';
                        command_label += `[command]${incoming_command.command_type}[/command] [unit]${incoming_command.unit_type}[/unit]`;
                        const date = Helper.get_date_string(incoming_command.arrival_date, Mailing.world_info.config.commands.millis_arrival);
                        command_label += (incoming_command.unit_type === 'snob' && incoming_command.command_type !== 'support')
                            ? ` [b]${date}[/b]`
                            : ` ${date}`;
                        if (incoming_command.player) {
                            if (incoming_command.coords) {
                                command_label += ` [coord]${incoming_command.coords}[/coord]`;
                            }
                            command_label += ` [player]${incoming_command.player}[/player]`;
                            if (incoming_command.is_ignored) {
                                command_label += ` (${i18n.TEMPLATE.IGNORED_COMMAND})`;
                            }
                        } else {
                            command_label += ` ${incoming_command.label}`;
                        }
                        return command_label;
                    }).join('\n');

                    content += `\n\n[spoiler=${i18n.TEMPLATE.INCOMING_COMMANDS}]${command_labels}[/spoiler]`;
                }
            }

            if (Mailing.settings.misc.show_mailing_list) {
                content += `\n\n[spoiler=${i18n.TEMPLATE.MAILING_LIST}]`;
                content += recipients.map(x => `[player]${x}[/player]`).join(';');
                content += '[/spoiler]';
            }

            return content;
        },
        edit_settings: function () {
            const default_settings = Mailing.get_default_settings();

            let add_setttings_input = function (id, value) {
                return `<td><input id='${id}' value='${value}&nbsp;'/></td>`;
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

            let add_input_fieldset = function (section) {
                let fieldset = `<fieldset><legend>${i18n.FIELDSET[section]}</legend><table>`;
                for (const key in default_settings[section]) {
                    const id = Helper.get_id(`${section}.${key}`);
                    const value = default_settings[section][key];
                    fieldset += '<tr>';
                    fieldset += `<td><label for='${id}'>${i18n.LABELS[key]}:</label></td>`;
                    switch (key) {
                        case 'help_speed': fieldset += add_settings_select(id, Mailing.get_troops_speeds()); break;
                        default:
                            fieldset += typeof (value) === 'boolean'
                                ? add_settings_checkbox(id, value)
                                : add_setttings_input(id, value);
                            break;
                    }
                    fieldset += '</tr>';
                }
                fieldset += '</table></fieldset>';
                return fieldset;
            };

            let save_settings = function () {
                const settings = {};
                try {
                    for (const section in default_settings) {
                        settings[section] = {};
                        for (const key in default_settings[section]) {
                            const user_input = Helper.get_control(`${section}.${key}`);
                            const new_value = typeof (default_settings[section][key]) == 'boolean'
                                ? user_input.checked
                                : user_input.value;
                            settings[section][key] = new_value;
                            if (section != 'user_input') {
                                Mailing.settings[section][key] = new_value;
                            }
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
                Mailing.settings = JSON.parse(JSON.stringify(Mailing.default_settings));
                localStorage.removeItem(namespace);
                UI.SuccessMessage(i18n.SETTINGS_RESETED);
                document.querySelector('.popup_box_close').click();
            };

            let gui = '<div>';

            for (const key in default_settings) {
                gui += add_input_fieldset(key);
            }

            gui += `<button disabled id='${Helper.get_id('reset_settings')}' class='btn'  >${i18n.LABELS.reset_settings}</button>`;
            gui += `<button disabled id='${Helper.get_id('save_settings')}' class='btn right'>${i18n.LABELS.save_settings}</button><div>`;
            Dialog.show(Helper.get_id('settings_editor'), gui);
            setTimeout(() => {
                Helper.get_control('user_input.help_speed').value = default_settings.user_input.help_speed;
                Helper.get_control('user_input.support_bonus_speed').value = default_settings.user_input.support_bonus_speed;
                const reset_settings_button = Helper.get_control('reset_settings');
                reset_settings_button.addEventListener('click', reset_settings);
                reset_settings_button.disabled = false;
                const save_settings_button = Helper.get_control('save_settings');
                save_settings_button.addEventListener('click', save_settings);
                save_settings_button.disabled = false;
            });

        },
        default_settings: {
            user_input: {
                help_speed: 'heavy',
                support_bonus_speed: 0,
                import_diplomacy: true,
                show_village_info: true,
                show_incoming_commands: true,
            },
            diplomacy: {
                import_naps: true,
            },
            village_info: {
                show_loyalty: true,
                show_troops: true,
                show_wall_level: true,
            },
            incoming_commands_info: {
                show_ignored_commands: false,
                show_supports: true,
            },
            misc: {
                message_title: 'Hello',
                show_mailing_list: false,
            }
        },
        deff_units: [],
        speed_groups: [['spear', 'archer'], ['sword'], ['spy', 'heavy']],
        settings: {},
        diplomacy: null,
        get_default_settings: function () {
            let stored_settings = localStorage.getItem(namespace);
            return stored_settings
                ? JSON.parse(stored_settings)
                : JSON.parse(JSON.stringify(Mailing.default_settings));
        },
        init_settings: function () {
            Mailing.settings = Mailing.get_default_settings();
        },
        main: async function () {
            if (mobile) {
                throw i18n.ERROR.MOBILE;
            }
            if (!game_data.player.ally) {
                throw i18n.ERROR.NO_ALLY;
            }
            let instance = Helper.get_control();
            if (instance) {
                instance.remove();
                return;
            }
            Mailing.init_settings();
            Mailing.create_gui();
            $.ajax({
                url: 'https://media.innogamescdn.com/com_DS_PL/skrypty/HermitowskiePlikiMapy.js?_=' + ~~(Date.now() / 9e6),
                dataType: 'script',
                cache: true
            }).then(() => {
                Mailing.init_gui().catch(Helper.handle_error);
            });
        }
    };
    try { await Mailing.main(); } catch (ex) { Helper.handle_error(ex); }
    console.log(`${namespace} | Elapsed time: ${Date.now() - start} [ms]`);
})(TribalWars);


