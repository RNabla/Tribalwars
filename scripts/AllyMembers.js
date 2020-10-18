/**
 * Exporting data about ally members into CSV
 * Created by: Hermitowski
 * Modified on: 04/10/2020 - version 2.0
 */

(async function (TribalWars) {
    const start = Date.now();
    const namespace = 'Hermitowski.Members';
    const i18n = {
        ERROR: {
            NO_ALLY: 'Jeste\u{15B} poza plemieniem',
            NO_VILLAGES: 'Gracz nie posiada wiosek',
            NO_PERMISSIONS: 'Gracz nie udostępnia informacji',
            SKIPPED_PLAYERS: 'Pomini\u{119}ci gracze'
        },
        LABEL: {
            export_option: 'Opcje exportu',
            members_troops: 'Wojska',
            members_buildings: 'Budynki',
            members_defense: 'Obrona',
            export: 'Export'
        },
        TITLE: 'Hermitowscy Cz\u{142}onkowie',
        PLAYER_NO_ACCESS: '(brak dost\u{119}pu)',
        ERROR_MESSAGE: 'Komunikat o b\u{142}\u{119}dzie: ',
        FORUM_THREAD: 'Link do w\u{105}tku na forum',
        FORUM_THREAD_HREF: 'https://forum.plemiona.pl/index.php?threads/HermitowscyCzlonkowie.xxxxxxx/',
        PROGRESS: {
            PLAYER_LIST: 'Pobieranie listy graczy',
            PLAYER_TROOPS: 'Pobieranie danych graczy (__0__/__1__)',
            TABLE: 'Generowanie tabelki',
        },
    };
    const Helper = {
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
        },
    };
    const AllyMembers = {
        create_ui: function () {
            const container = document.createElement('div');
            container.id = Helper.get_id('container');
            Dialog.show(Helper.get_id(), container.outerHTML);
            document.querySelector('[id^="popup_box"]').style.width = '300px';
        },
        create_controls: function () {
            const container = Helper.get_control('container');
            const title = document.createElement('h2');
            title.innerText = i18n.TITLE;
            const fieldset = document.createElement('fieldset');
            const legend = document.createElement('legend');
            legend.innerText = i18n.LABEL.export_option;
            const table = document.createElement('table');
            for (const export_option of AllyMembers.export_options) {
                const row = document.createElement('tr');
                const cell_1 = document.createElement('td');
                const cell_2 = document.createElement('td');
                const label = document.createElement('label');
                const checkbox = document.createElement('input');
                label.textContent = i18n.LABEL[export_option];
                label.setAttribute('for', Helper.get_id(export_option));
                checkbox.type = 'checkbox';
                checkbox.id = Helper.get_id(export_option);
                checkbox.checked = true;
                cell_1.append(label);
                cell_2.append(checkbox);
                row.append(cell_1);
                row.append(cell_2);
                table.append(row);
            }
            const button = document.createElement('button');
            button.id = Helper.get_id('export_button');
            button.innerText = i18n.LABEL.export;
            button.classList.add('btn');
            button.style.float = 'right';
            const progress = document.createElement('div');
            progress.id = Helper.get_id('progress');
            container.append(title);
            container.append(fieldset);
            fieldset.append(legend);
            fieldset.append(table);
            container.append(button);
            container.append(progress);
        },
        add_handlers: function () {
            for (const export_option of AllyMembers.export_options) {
                const control = Helper.get_control(export_option);
                control.addEventListener('click', AllyMembers.save_settings);
                control.addEventListener('click', AllyMembers.disable_export);
            }
            const export_button = Helper.get_control('export_button');
            export_button.addEventListener('click', AllyMembers.export);
        },
        init: async function () {
            AllyMembers.create_ui();
            AllyMembers.create_controls();
            AllyMembers.load_settings();
            AllyMembers.disable_export();
            AllyMembers.add_handlers();
        },
        export: async function () {
            const export_button = Helper.get_control('export_button');
            try {
                export_button.disabled = true;
                const export_options = AllyMembers.get_export_options();
                const members_info = await AllyMembers.get_members_info(export_options);
                const requests = AllyMembers.get_requests(members_info);
                const responses = await AllyMembers.fetch_data(requests);
                const member_data = AllyMembers.merge_member_data(responses, export_options);
                const [table, skipped_players] = AllyMembers.generate_table(members_info, member_data, export_options);
                AllyMembers.save_as_file(table.join('\n'));
                if (skipped_players.length) {
                    AllyMembers.print_progress(i18n.ERROR.SKIPPED_PLAYERS + '\n' + skipped_players.map(x => `${x.player_name} - ${x.reason}`).join('\n'));
                } else {
                    AllyMembers.print_progress('');
                }
            } catch (ex) {
                Helper.handle_error(ex);
            }
            finally {
                export_button.disabled = false;
            }
        },
        get_export_options: function () {
            const export_options = {};
            for (const export_option of AllyMembers.export_options) {
                const control = Helper.get_control(export_option);
                export_options[export_option] = control.checked;
            }
            return export_options;
        },
        get_members_info: async function (export_options) {
            AllyMembers.print_progress(i18n.PROGRESS.PLAYER_LIST);
            const requests = [];
            for (const export_name in export_options) {
                if (export_options[export_name]) {
                    requests.push(AllyMembers.get_player_list(export_name));
                }
            }
            const responses = await Promise.all(requests);
            return Object.fromEntries(responses);
        },
        get_player_list: async function (mode) {
            const player_link = TribalWars.buildURL('', { screen: 'ally', mode });
            const response = await fetch(player_link);
            const text = await response.text();
            const body = document.createElement('body');
            body.innerHTML = text;
            const options = [...body.querySelectorAll('select option')].map(option => {
                const access_granted = !option.disabled;
                const player_id = option.value;
                let player_name = option.label;
                if (player_name.endsWith(i18n.PLAYER_NO_ACCESS)) {
                    player_name = player_name.slice(0, player_name.length - i18n.PLAYER_NO_ACCESS.length).trim();
                }
                return { player_id, player_name, access_granted };
            });
            AllyMembers.ally_name = body.querySelector('h2').innerText;
            return [mode, options.slice(1)];
        },
        get_requests: function (members_info) {
            const requests = [];
            const response_mappers = {
                members_troops: AllyMembers.map_member_troops,
                members_buildings: AllyMembers.map_member_buildings,
                members_defense: AllyMembers.map_member_defense,
            };
            for (const export_name in members_info) {
                for (const member of members_info[export_name]) {
                    requests.push(Object.assign({}, member, {
                        response_mapper: response_mappers[export_name],
                        mode: export_name
                    }));
                }
            }
            return requests;
        },
        fetch_data: async function (tasks) {
            const task_queue = [...tasks];
            const active_requests = [];
            const request_ids = [];

            const players_data = {};
            for (const task of tasks) {
                players_data[task.player_id] = {};
                for (const mode of AllyMembers.export_options) {
                    players_data[task.player_id][mode] = [];
                }
            }

            while (task_queue.length || active_requests.length) {
                AllyMembers.print_progress(i18n.PROGRESS.PLAYER_TROOPS
                    .replace('__0__', tasks.length - task_queue.length)
                    .replace('__1__', tasks.length)
                );
                while (task_queue.length && active_requests.length < AllyMembers.concurrent_requests) {
                    const task = task_queue.pop();
                    if (!task.access_granted) {
                        continue;
                    }
                    const url = TribalWars.buildURL('', { screen: 'ally', mode: task.mode, player_id: task.player_id });
                    const request = AllyMembers.time_wrapper(fetch(url, { redirect: 'manual' }));
                    active_requests.push(request);
                    request_ids.push(task.mode + task.player_id);
                }
                const response = await Promise.any(active_requests);
                const response_data = new URLSearchParams(response.url);
                const response_player_id = response_data.get('player_id');
                const response_mode = response_data.get('mode');
                const index = request_ids.indexOf(response_mode + response_player_id);
                active_requests.splice(index, 1);
                request_ids.splice(index, 1);
                const finished_task = tasks.find(x => x.player_id === response_player_id && x.mode === response_mode);
                // tribalwars redirects from members_troops to members_buildings in case where player has no villages
                // and then displays empty page; what makes that more funny is that members_defense does not have that kind of issue
                // 3 hours wasted investigating why I was fetching members_buildings when I asked for members_troops only
                // how the f... designs API in such way
                if (response.type === "opaqueredirect") {
                    players_data[response_player_id][response_mode] = [];
                }
                else if (response.status === 200) {
                    if (finished_task.response_mapper) {
                        players_data[response_player_id][response_mode] = await finished_task.response_mapper(response);
                    }
                } else {
                    task_queue.push(finished_task);
                }
            }
            return players_data;
        },
        map_member_troops: async function (response) {
            const text = await response.text();
            const body = document.createElement('body');
            body.innerHTML = text;
            const table = body.querySelector('#ally_content table.vis.w100');

            const player_data = [];
            const commands_info = { 'incoming': -1, 'outgoing': -1 };

            if (!table) return player_data;

            for (let i = game_data.units.length + 1; i < table.rows[0].cells.length; i++) {
                switch (table.rows[0].cells[i].children[0].src.split('/').pop()) {
                    case "commands_outgoing.png":
                        commands_info['outgoing'] = i;
                        break;
                    case "att.png":
                        commands_info['incoming'] = i;
                        break;
                }
            }

            for (let i = 1; i < table.rows.length; i++) {
                const row_data = { units: {} };
                const row = table.rows[i];

                row_data.coords = row.cells[0].innerText.match(/\d+\|\d+/).pop();
                row_data.village_name = row.cells[0].innerText.trim();

                for (let j = 0; j < game_data.units.length; j++) {
                    row_data.units[game_data.units[j]] = row.cells[j + 1].innerText.trim() === '?'
                        ? null
                        : Number(row.cells[j + 1].innerText);
                }

                row_data.outgoing = commands_info['outgoing'] === -1
                    ? null
                    : Number(row.cells[commands_info['outgoing']].innerText);
                row_data.incoming = commands_info['incoming'] === -1
                    ? null
                    : Number(row.cells[commands_info['incoming']].innerText);
                player_data.push(row_data);
            }

            return player_data;
        },
        map_member_buildings: async function (response) {
            const text = await response.text();
            const body = document.createElement('body');
            body.innerHTML = text;
            const table = body.querySelector('#ally_content table.vis.w100');

            const player_data = [];

            if (!table) return player_data;

            const building_info = {};
            for (let i = 2; i < table.rows[0].cells.length; i++) {
                building_info[i] = table.rows[0].cells[i].children[0].src.split('/').pop().split('.png')[0];
            }

            if (!AllyMembers.building_names) {
                AllyMembers.building_names = Object.values(building_info);
            }

            for (let i = 1; i < table.rows.length; i++) {
                const row_data = { buildings: {} };
                const row = table.rows[i];

                row_data.village_name = row.cells[0].innerText.trim();
                row_data.coords = row.cells[0].innerText.match(/\d+\|\d+/).pop();
                row_data.points = Number(row.cells[1].innerText.replace('.', ''));

                for (const building_index in building_info) {
                    row_data.buildings[building_info[building_index]] = Number(row.cells[building_index].innerText);
                }

                player_data.push(row_data);
            }

            return player_data;
        },
        map_member_defense: async function (response) {
            const text = await response.text();
            const body = document.createElement('body');
            body.innerHTML = text;
            const table = body.querySelector('#ally_content table.vis.w100');

            const player_data = [];

            if (!table) return player_data;

            const has_incomings = table.rows[0].cells.length > (game_data.units.length + 2);

            for (let i = 1; i < table.rows.length; i += 2) {
                const row_data = {};
                const row_1 = table.rows[i];
                const row_2 = table.rows[i + 1];

                row_data.village_name = row_1.cells[0].innerText.trim();
                row_data.coords = row_1.cells[0].innerText.match(/\d+\|\d+/).pop();

                row_data.incoming = has_incomings
                    ? Number(row_1.cells[game_data.units.length + 2].innerText)
                    : null;

                row_data['village'] = {};
                row_data['transit'] = {};
                for (let j = 0; j < game_data.units.length; j++) {
                    row_data['village'][game_data.units[j]] = row_1.cells[j + 2].innerText.trim() === '?'
                        ? null
                        : Number(row_1.cells[j + 2].innerText);
                    row_data['transit'][game_data.units[j]] = row_2.cells[j + 1].innerText.trim() === '?'
                        ? null
                        : Number(row_2.cells[j + 1].innerText);
                }
                player_data.push(row_data);
            }

            return player_data;
        },
        merge_member_data: function (responses, export_options) {
            const members_data = {};
            for (const player_id in responses) {
                const response_data = responses[player_id];
                const member_data = {};
                for (const export_name in export_options) {
                    if (!export_options[export_name]) {
                        continue;
                    }
                    const villages = response_data[export_name];
                    for (const village of villages) {
                        if (village.coords in member_data) {
                            Object.assign(member_data[village.coords], village);
                        }
                        else {
                            member_data[village.coords] = JSON.parse(JSON.stringify(village));
                        }
                    }
                }
                members_data[player_id] = member_data;
            }
            return members_data;
        },
        merge_member_metadata: function (members_metadata, export_options) {
            const members_info = {};

            for (const export_name of AllyMembers.export_options) {
                if (!export_options[export_name]) { continue; }
                const members_list = members_metadata[export_name];
                for (const member of members_list) {
                    if (!(member.player_id in members_info)) {
                        const member_info = {
                            player_id: member.player_id,
                            player_name: member.player_name,
                            access_granted: {}
                        };
                        for (const export_name of AllyMembers.export_options) {
                            member_info.access_granted[export_name] = false;
                        }
                        members_info[member.player_id] = member_info;
                    }
                    members_info[member.player_id].access_granted[export_name] = member.access_granted;
                }
            }

            return members_info;
        },
        generate_table_header: function (export_options) {
            const header = ['player_name', 'village_name', 'coords'];

            if (export_options['members_troops'] || export_options['members_defense']) {
                header.push('incoming');
            }

            if (export_options['members_troops']) {
                header.push('outgoing');
                header.push(...game_data.units);
            }

            if (export_options['members_buildings']) {
                header.push('points', ...AllyMembers.building_names);
            }

            if (export_options['members_defense']) {
                header.push(...game_data.units.map(unit_name => 'village_' + unit_name));
                header.push(...game_data.units.map(unit_name => 'transit_' + unit_name));
            }

            return header;
        },
        generate_table: function (members_metadata, members_data, export_options) {
            AllyMembers.print_progress(i18n.PROGRESS.TABLE);

            const header = AllyMembers.generate_table_header(export_options);
            const members_info = AllyMembers.merge_member_metadata(members_metadata, export_options);

            const table = [header.join(",")];

            const skipped_players = [];

            for (const player_id in members_info) {
                const member_metadata_info = members_info[player_id];
                const member_data = members_data[player_id];

                if (!AllyMembers.export_options
                    .filter(export_name => export_options[export_name])
                    .map(export_name => member_metadata_info.access_granted[export_name])
                    .reduce((pv, cv) => cv || pv, false)) {
                    skipped_players.push({
                        player_name: member_metadata_info.player_name,
                        reason: i18n.ERROR.NO_PERMISSIONS
                    });
                    continue;
                }

                if (Object.keys(member_data).length === 0) {
                    skipped_players.push({
                        player_name: member_metadata_info.player_name,
                        reason: i18n.ERROR.NO_VILLAGES
                    });
                    continue;
                }

                for (const village_coords in member_data) {
                    const row = [];
                    const village_data = member_data[village_coords];
                    row.push(`"${member_metadata_info.player_name}"`, `"${village_data.village_name}"`, village_data.coords);
                    if (export_options['members_troops'] || export_options['members_defense']) {
                        row.push(village_data.incoming !== null
                            ? village_data.incoming
                            : ''
                        );
                    }
                    if (export_options['members_troops']) {
                        row.push(village_data.outgoing !== null
                            ? village_data.outgoing
                            : ''
                        );
                        if (member_metadata_info.access_granted['members_troops']) {
                            for (const unit_name of game_data.units) {
                                row.push(village_data.units[unit_name] !== null
                                    ? village_data.units[unit_name]
                                    : ''
                                );
                            }
                        } else {
                            row.push(...new Array(game_data.units.length).fill(''));
                        }
                    }
                    if (export_options['members_buildings']) {
                        if (member_metadata_info.access_granted['members_buildings']) {
                            row.push(village_data.points);
                            for (const building_name of AllyMembers.building_names) {
                                row.push(village_data.buildings[building_name]);
                            }
                        } else {
                            row.push(...new Array(AllyMembers.building_names.length).fill(''));
                        }
                    }
                    if (export_options['members_defense']) {
                        if (member_metadata_info.access_granted['members_defense']) {
                            for (const troops_type of ['village', 'transit']) {
                                for (const unit_name of game_data.units) {
                                    row.push(village_data[troops_type][unit_name] !== null
                                        ? village_data[troops_type][unit_name]
                                        : ''
                                    );
                                }
                            }
                        } else {
                            row.push(...new Array(2 * game_data.units.length).fill(''));
                        }
                    }
                    table.push(row.join(','));
                }
            }
            return [table, skipped_players];
        },
        save_as_file: function (content) {
            const a = document.createElement('a');
            const timestamp = (new Date())
                .toISOString()
                .replace('T', '_')
                .replace(':', '-')
                .slice(0, 16);
            a.download = `${AllyMembers.ally_name}_${timestamp}.csv`;
            a.href = window.URL.createObjectURL(new Blob([content], { type: "text/csv" }),);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        },
        time_wrapper: async function (task) {
            const start = Date.now();
            const result = await task;
            const duration = Date.now() - start;
            return new Promise((resolve) => {
                if (duration < AllyMembers.throttle_ms) {
                    setTimeout(() => {
                        resolve(result);
                    }, AllyMembers.throttle_ms - duration);
                } else {
                    resolve(result);
                }
            });
        },
        print_progress: function (text) {
            const progressContainer = Helper.get_control('progress');
            if (progressContainer) {
                progressContainer.innerText = text;
            }
        },
        disable_export: function () {
            let any_checked = false;
            for (const control_name of AllyMembers.export_options) {
                any_checked |= Helper.get_control(control_name).checked;
            }
            const export_button = Helper.get_control('export_button');
            export_button.disabled = !any_checked;
        },
        save_settings: function () {
            const settings = {};
            for (const control_name of AllyMembers.export_options) {
                settings[control_name] = Helper.get_control(control_name).checked;
            }
            localStorage.setItem(namespace, JSON.stringify(settings));
        },
        load_settings: function () {
            let settings = {};
            const item = localStorage.getItem(namespace);
            if (item !== null) {
                settings = JSON.parse(item);
            } else {
                settings = {};
                for (const control_name of AllyMembers.export_options) {
                    settings[control_name] = true;
                }
            }
            for (const control_name of AllyMembers.export_options) {
                Helper.get_control(control_name).checked = settings[control_name];
            }
        },
        main: async function () {
            if (!game_data.player.ally) {
                throw i18n.ERROR.NO_ALLY;
            }
            await AllyMembers.init();
        },
        throttle_ms: 50,
        concurrent_requests: 4,
        export_options: ['members_troops', 'members_buildings', 'members_defense'],
        building_names: null
    };
    try { await AllyMembers.main(); } catch (ex) { Helper.handle_error(ex); }
    console.log(`%c${namespace} | Elapsed time: ${Date.now() - start} [ms]`, "background-color:black;color:lime;font-family:'Courier New';padding:5px");
})(TribalWars);