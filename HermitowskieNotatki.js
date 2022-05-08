/**
 * Adding note to the village info from report and scrapping some usefull informations
 * Created by: Hermitowski
 */

(async function (TribalWars) {
    let TechnologyEnum = {
        TEN_LEVELS: '0',
        THREE_LEVELS: '1',
        SIMPLE: '2'
    };
    let Settings = {
        simulator_luck: -25, // Hermitowski nigdy nie ma szcz\u{119}\u{15B}cia
        simulator_def_wall: 20,
        simulator_att_troops: {
            axe: 6000,
            light: 3000,
            ram: 242
        },
        back_time_delta: 3 * 3600 * 1000,
        rebuild_time_delta: 48 * 3600 * 1000,
        rebuild_time_threshold: 72 * 3600 * 1000,
        attack_info_lifetime: 14 * 24 * 3600 * 1000,
        deff_units: game_data.units.filter(x => -1 !== ['spear', 'sword', 'archer', 'heavy'].indexOf(x)),
        off_units: game_data.units.filter(x => -1 !== ['axe', 'light', 'marcher', 'ram'].indexOf(x)),
        misc_units: game_data.units.filter(x => -1 !== ['spy', 'catapult', 'snob'].indexOf(x)),
        population: {},
        speed: {},
        build_time: {},
        tech: undefined,
        init: function (worldInfo) {
            const core_build_time = {
                spear: 158.44,
                sword: 233,
                axe: 205.04,
                archer: 279.6,
                spy: 187.1,
                light: 374.2,
                marcher: 561.25,
                heavy: 748.35,
                ram: 1335.3,
                catapult: 2002.9
            };

            this.tech = worldInfo.config.game.tech;

            let world_speed = Number(worldInfo.config.speed);

            for (const unit in worldInfo.unit_info) {
                this.population[unit] = Number(worldInfo.unit_info[unit].pop);
                this.speed[unit] = Number(worldInfo.unit_info[unit].speed);
                if (core_build_time[unit]) {
                    this.build_time[unit] = core_build_time[unit] / world_speed;
                }
            }
        }
    };
    let Helper = {
        parse_datetime_string: function (datetime_string) {
            let date_time = datetime_string.split(' ');
            let date = date_time[0].split('.').map(x => Number(x));
            let time = date_time[1].split(':').map(x => Number(x));
            return new Date(2000 + date[2], date[1] - 1, date[0], time[0], time[1], time[2]);
        },
        date_to_datetime_string: function (date) {
            let two_digit_function = function (number) {
                return number < 10
                    ? `0${number}`
                    : `${number}`;
            };
            let days = two_digit_function(date.getDate());
            let month = two_digit_function(date.getMonth() + 1);
            let year = two_digit_function(date.getFullYear() % 100);
            let hours = two_digit_function(date.getHours());
            let minutes = two_digit_function(date.getMinutes());
            let seconds = two_digit_function(date.getSeconds());
            return `${days}.${month}.${year} ${hours}:${minutes}:${seconds}`;
        },
        calculate_rebuild_time: function (troops) {
            let rebuild_time = function (units) {
                return units
                    .filter(unit => troops[unit] > 0)
                    .reduce((time, unit) => Settings.build_time[unit] * troops[unit] + time, 0) * 1000;
            }

            let barracks_time = rebuild_time(['spear', 'sword', 'axe', 'archer']);
            let stable_time = rebuild_time(['spy', 'light', 'marcher', 'heavy']);
            let garage_time = rebuild_time(['ram', 'catapult']);
            return Math.max(barracks_time, stable_time, garage_time);
        },
        get_troops_summary: function (troops) {
            function count_population(units) {
                return units.reduce((time, unit) => Settings.population[unit] * troops[unit] + time, 0);
            }

            let deff_population = count_population(Settings.deff_units);
            let off_population = count_population(Settings.off_units);
            let misc_population = count_population(Settings.misc_units);
            return {
                troops: troops,
                deff_population: deff_population,
                off_population: off_population,
                misc_population: misc_population,
            }
        },
        generate_link_to_simulator: function (def_troops) {
            let properties = {
                mode: 'sim',
                moral: 100,
                luck: Settings.simulator_luck,
                belief_def: 'on',
                belief_att: 'on',
                simulate: 1,
                def_wall: Settings.simulator_def_wall
            };

            let append_units = function (context, units) {
                for (const unit in units) {
                    if (units[unit] > 0) {
                        properties[`${context}_${unit}`] = units[unit];
                        switch (Settings.tech) {
                            case TechnologyEnum.TEN_LEVELS:
                                properties[`${context}_tech_${unit}`] = 10;
                                break;
                            case TechnologyEnum.THREE_LEVELS:
                                properties[`${context}_tech_${unit}`] = 3;
                                break;
                        }

                    }
                }
            }

            append_units('att', Settings.simulator_att_troops);
            append_units('def', def_troops);

            return TribalWars.buildURL('GET', 'place', properties).substr(1);
        },
        get_march_time: function (troops, origin, destination) {
            let march_time_per_field = Object.keys(troops).filter(unit => troops[unit] > 0)
                .reduce((time_per_field, unit) => Math.max(Settings.speed[unit], time_per_field), 0);
            if (march_time_per_field === 0) {
                throw 'xd';
            }
            let distance = Math.hypot(origin[0] - destination[0], origin[1] - destination[1]);
            return Math.round(distance * march_time_per_field * 60) * 1000;
        },
        beautify_number: function (number) {
            if (number < 1000) {
                return `${number}`;
            }
            number /= 1000;
            let precision = 0;
            if (number < 100) {
                precision = 1;
            }
            if (number < 10) {
                precision = 2;
            }
            return `${number.toFixed(precision)}K`;
        },
        get_troops_by_row: function (row, start) {
            let troops = {};
            for (let i = start; i < row.cells.length; i++) {
                let count = Number(row.cells[i].innerText);
                troops[game_data.units[i - start]] = count;
            }
            return troops;
        },
        handle_error: function (error) {
            if (typeof (error) === 'string') {
                UI.ErrorMessage(error);
                return;
            }
            const gui =
                `<h2>WTF - What a Terrible Failure</h2>
                 <p><strong>Komunikat o b\u{142}\u{119}dzie: </strong><br/>
                    <textarea rows='5' cols='42'>${error}\n\n${error.stack}</textarea><br/>
                    <a href='https://forum.plemiona.pl/index.php?threads/hermitowskie-notatki.126752/'>Link do w\u{105}tku na forum</a>
                 </p>`;
            Dialog.show(namespace, gui);
        }
    };
    let NotesScript = {
        context: {},
        village_info: {},
        attack_info: {},
        init: function () {
            try {
                NotesScript.check_screen();
                NotesScript.get_report_id();
                NotesScript.get_battle_time();
                NotesScript.get_context();
                NotesScript.get_village_coords();
                if (NotesScript.context.side === 'att') {
                    NotesScript.get_church();
                    NotesScript.get_attack_results();
                    NotesScript.check_if_is_empty();
                    NotesScript.get_sim();
                    NotesScript.get_units_away();
                }
                if (NotesScript.context.side === 'def') {
                    NotesScript.get_back_time();
                }
                NotesScript.get_export_code();
                NotesScript.get_rebuild_time();
                NotesScript.get_belief();
                NotesScript.get_troops_type();
                NotesScript.check_report();
                NotesScript.get_current_notes().then(old_notes => {
                    try {
                        let new_note = NotesScript.parse_notebook(old_notes);
                        if (new_note.error) {
                            throw new_note.error;
                        }
                        NotesScript.add_note(new_note);
                    } catch (e) {
                        UI.ErrorMessage(e);
                        console.error(e);
                    }
                });
            }
            catch (e) {
                if (typeof (e) === 'string') {
                    UI.ErrorMessage(e);
                } else {
                    throw e;
                }
            }
        },
        check_report: function () {
            if (Object.keys(NotesScript.village_info).length === 1 &&
                Object.keys(NotesScript.attack_info).length === 3) {
                let ignore = prompt('Wydaje si\u{119}, \u{17C}e ten raport nic nie wnosi.\nWpisz dodaj, aby doda\u{107} go pomimo tego');
                if (!ignore || ignore.trim() !== 'dodaj') {
                    throw 'Ten raport nic nie wnosi';
                }
            }
            if (NotesScript.village_info.troops_type) {
                NotesScript.save_coords(NotesScript.village_info.troops_type);
            }
            if (typeof (NotesScript.village_info.belief) === 'boolean' && !NotesScript.village_info.belief) {
                NotesScript.save_coords('without_belief');
            }
        },
        save_coords: function (key) {
            const full_key = ['HermitowskieNotatki', key].join("_");
            let item = localStorage.getItem(full_key);
            const arr = item === null
                ? []
                : JSON.parse(item);
            arr.push(NotesScript.context.village_coords);
            localStorage.setItem(full_key, JSON.stringify([...new Set(arr)]));
        },
        check_screen: function () {
            if ($('.report_ReportAttack').length !== 1) {
                if ($('[class*=report_Report]').length !== 0) {
                    throw 'Tego typu raporty nie s\u0105 obs\u0142ugiwane';
                }
                throw 'Czy aby na pewno jeste\u015B w przegl\u0105dzie raportu?';
            }
        },
        get_village_coords: function () {
            NotesScript.context.village_coords = $(`#attack_info_${NotesScript.context.opponent_side}`)[0].rows[1].cells[1].innerText.match(/\d+\|\d+/g).pop()
        },
        get_context: function () {
            let att = $('#attack_info_att');
            let def = $('#attack_info_def');
            const get_player_name = function (element) {
                return element[0].rows[0].cells[1].innerText.trim();
            }
            const get_player_id = function (element) {
                const nodes = element[0].rows[0].cells[1].children;
                return nodes.length
                    ? nodes[0].href.match(/id=(\d+)/)[1]
                    : '0';
            }
            let att_player_name = get_player_name(att);
            let def_player_name = get_player_name(def);;
            let att_player_id = get_player_id(att);
            let def_player_id = get_player_id(def);
            let att_village_id = att.find('.contexted').attr('data-id');
            let def_village_id = def.find('.contexted').attr('data-id');

            let get_forwarder = function () {
                let table = $('.content-border').find('table.vis')[3];
                for (let i = 0; i < table.rows.length; i++) {
                    if (table.rows[i].cells[0].innerText === 'Przes\u0142ane od:') {
                        return table.rows[i].cells[1].innerText;
                    }
                }
            }

            let forwarder = get_forwarder();
            let is_side_att = game_data.player.id == att_player_id || forwarder === att_player_name;
            let is_side_def = game_data.player.id == def_player_id || forwarder === def_player_name;

            if (is_side_att && !is_side_def) {
                NotesScript.context.side = 'att';
            }
            if (is_side_def && !is_side_att) {
                NotesScript.context.side = 'def';
            }
            if (NotesScript.context.side !== 'att' && NotesScript.context.side !== 'def') {
                let user_answer = prompt('Wpisz \'att\', je\u{17C}eli jeste\u{15B} agresorem w tym raporcie; \'def\' je\u{17C}eli si\u{119} bronisz, \'att\'');
                if (user_answer !== null && (user_answer.trim() === 'att' || user_answer.trim() === 'def')) {
                    NotesScript.context.side = user_answer;
                } else {
                    throw 'Nie wiem po kt\u{F3}rej stronie doda\u{107} notatk\u{119}';
                }
            }
            NotesScript.context.opponent_side = NotesScript.context.side === 'att' ? 'def' : 'att';
            NotesScript.village_info.player_id = NotesScript.context.side === 'att' ? def_player_id : att_player_id;
            NotesScript.context.village_id = NotesScript.context.side === 'att' ? def_village_id : att_village_id;
            let village_player_id = (NotesScript.context.side === 'att' ? def : att)[0].rows[1].cells[1].children[0].getAttribute('data-player');
            if (NotesScript.village_info.player_id !== village_player_id) {
                NotesScript.add_note('');
                throw 'Docelowa wioska zmieni\u{142}a w\u{142}a\u{15B}ciciela';
            }

        },
        get_export_code: function () {
            NotesScript.attack_info.export_code = $('#report_export_code').val().match(/\[report_export].*\[\/report_export\]/)[0];
        },
        get_report_id: function () {
            NotesScript.attack_info.report_id = Number(location.href.match(/view=(\d+)/)[1]);
        },
        get_units_away: function () {
            let spy_away = $('#attack_spy_away');
            if (spy_away.length === 1) {
                let row = spy_away.find('table')[0].rows[1];
                let troops = Helper.get_troops_by_row(row, 0);
                let summary = Helper.get_troops_summary(troops);
                NotesScript.attack_info.units_away = summary;
            }
        },
        get_troops_type: function () {
            let verdict = function (summary, threshold) {
                if (summary.off_population > threshold) {
                    return 'OFF';
                }
                if (summary.deff_population > threshold) {
                    return 'DEFF';
                }
                if (summary.off_population && summary.deff_population === 0) {
                    return 'OFF';
                }
                if (summary.deff_population && summary.off_population === 0) {
                    return 'DEFF';
                }
                return undefined;
            }

            if (NotesScript.attack_info.units_away) {
                let troops_type = verdict(NotesScript.attack_info.units_away, 1000);
                if (troops_type) {
                    NotesScript.village_info.troops_type = troops_type;
                    return;
                }
            }
            let attack_info_units = $(`#attack_info_${NotesScript.context.opponent_side}_units`)[0];
            if (attack_info_units) {
                let troops = Helper.get_troops_by_row(attack_info_units.rows[1], 1);
                if (troops) {
                    let troops_type = verdict(Helper.get_troops_summary(troops), 3000);
                    if (troops_type) {
                        NotesScript.village_info.troops_type = troops_type;
                    }
                }
            }
        },
        get_rebuild_time: function () {
            let get_loses = function () {
                let attack_info_units = $(`#attack_info_${NotesScript.context.opponent_side}_units`)[0];
                if (attack_info_units) {
                    return Helper.get_troops_by_row(attack_info_units.rows[2], 1);
                }
            }
            let loses = get_loses();
            if (loses) {
                let rebuild_time = Helper.calculate_rebuild_time(loses);
                if (rebuild_time > Settings.rebuild_time_threshold) {
                    NotesScript.attack_info.rebuild_time = new Date(NotesScript.attack_info.battle_time.getTime() + rebuild_time);
                }
            }
        },
        get_back_time: function () {
            let match_coordinates = function (text) {
                let matches = text.match(/\d{1,3}\|\d{1,3}/g);
                return matches[matches.length - 1].split('|').map(x => Number(x));
            }
            let origin = match_coordinates($('#attack_info_att')[0].rows[1].innerText);
            let destination = match_coordinates($('#attack_info_def')[0].rows[1].innerText);

            let units = Helper.get_troops_by_row($('#attack_info_att_units')[0].rows[1], 1);
            let survivors = NotesScript.get_survivors('att');
            let someone_survived = Object.values(survivors).some(x => x > 0);
            if (someone_survived) {
                let march_time = Helper.get_march_time(units, origin, destination);
                let back_time_timestamp = NotesScript.attack_info.battle_time.getTime() + march_time;
                let milliseconds = back_time_timestamp % 1000;
                if (milliseconds !== 0) {
                    back_time_timestamp -= milliseconds;
                }
                NotesScript.attack_info.back_time = new Date(back_time_timestamp);
            }
        },
        get_battle_time: function () {
            let rows = $('.content-border').find('table.vis')[3].rows;
            for (let i = 0; i < rows.length; i++) {
                if (rows[i].cells[0].innerText.trim() === 'Czas bitwy') {
                    NotesScript.attack_info.battle_time = Helper.parse_datetime_string(rows[i].cells[1].innerText);
                    return;
                }
            }
        },
        get_attack_results: function () {
            let attack_results = $('#attack_results')[0];
            if (attack_results) {
                NotesScript.attack_info.attack_results = {};
                let ram_match = attack_results.innerText.match(/Uszkodzenie przez tarany:\s*Mur uszkodzony z poziomu (\d+) do poziomu (\d+)/);
                let catapult_match = attack_results.innerText.match(/Szkody spowodowane ostrza\u{142}em katapult:\\s*(.*) uszkodzono z poziomu (\\d+) do poziomu (\\d+)/);
                if (ram_match) {
                    NotesScript.attack_info.attack_results.ram_result = ram_match.slice(1).map(x => Number(x));
                }
                if (catapult_match) {
                    NotesScript.attack_info.attack_results.catapult_result = {
                        target: catapult_match[1],
                        damage: catapult_match.slice(2).map(x => Number(x))
                    }
                }
            }
        },
        get_church: function () {
            let table = $('#attack_spy_building_data');
            if (table.length === 1) {
                let buildings = JSON.parse(table.val());
                let church_match = buildings.find(x => x.id.match(/church/));
                NotesScript.village_info.church = church_match
                    ? `${church_match.name} ${church_match.level}`
                    : false;
            }
        },
        check_if_is_empty: function () {
            let def_units = $('#attack_info_def_units');
            if (def_units.length === 1) {
                let rows = def_units[0].rows;
                let troops = rows[1];
                let loses = rows[2];
                let is_empty = true;
                let is_clean = true;
                for (let i = 1; i < troops.cells.length; i++) {
                    if (loses.cells[i].innerText !== troops.cells[i].innerText) {
                        is_clean = false;
                        break;
                    }
                }
                if (is_clean) {
                    for (let i = 1; i < troops.cells.length; i++) {
                        if (loses.cells[i].innerText !== '0') {
                            is_empty = false;
                        }
                    }

                    NotesScript.attack_info.is_empty = is_empty
                        ? 'Pusta'
                        : 'Wyczyszczona';
                }
            }
        },
        get_belief: function () {
            let attack_info = $(`#attack_info_${NotesScript.context.opponent_side}`);
            if (attack_info) {
                let belief_match = attack_info[0].innerText.match(/Si\u{142}a uderzenia: (\\d+)%/);
                if (belief_match) {
                    NotesScript.village_info.belief = belief_match[1] === '100';
                }
            }
        },
        get_survivors: function (context) {
            let attack_info_units = $(`#attack_info_${context}_units`)[0];
            if (attack_info_units) {
                let defense = Helper.get_troops_by_row(attack_info_units.rows[1], 1);
                let loses = Helper.get_troops_by_row(attack_info_units.rows[2], 1);
                let survivors = {};
                for (const key in defense) {
                    survivors[key] = defense[key] - loses[key];
                }
                return survivors;
            }
        },
        get_sim: function () {
            let survivors = NotesScript.get_survivors('def');
            if (survivors) {
                let summary = Helper.get_troops_summary(survivors);
                if (summary.deff_population != 0 ||
                    summary.off_population != 0 ||
                    summary.misc_population != 0) {
                    NotesScript.village_info.sim = summary;
                }
            }
        },
        generate_attack_info: function (attack_info) {
            let properties = [Helper.date_to_datetime_string(attack_info.battle_time)];
            if (attack_info.is_empty) {
                properties.push(attack_info.is_empty);
            }
            if (attack_info.attack_results) {
                if (attack_info.attack_results.ram_result) {
                    let from = attack_info.attack_results.ram_result[0];
                    let to = attack_info.attack_results.ram_result[1];
                    properties.push(`T:Mur ${from} -> ${to}`)
                }
                if (attack_info.attack_results.catapult_result) {
                    let target = attack_info.attack_results.catapult_result.target;
                    let from = attack_info.attack_results.catapult_result.damage[0];
                    let to = attack_info.attack_results.catapult_result.damage[1];
                    properties.push(`K:${target} ${from} -> ${to}`);
                }
            }
            if (attack_info.back_time && (attack_info.back_time.getTime() + Settings.back_time_delta) > Date.now()) {
                properties.push(`Czas powrotu: ${Helper.date_to_datetime_string(attack_info.back_time)}`)
            }
            if (attack_info.rebuild_time && (attack_info.rebuild_time.getTime() + Settings.rebuild_time_delta) > Date.now()) {
                properties.push(`Odbudowa dnia: ${Helper.date_to_datetime_string(attack_info.rebuild_time)}`)
            }
            if (attack_info.units_away) {
                if (attack_info.units_away.deff_population || attack_info.units_away.off_population) {
                    let away = [];
                    if (attack_info.units_away.deff_population) {
                        away.push(`deff: ${Helper.beautify_number(attack_info.units_away.deff_population)}`)
                    }
                    if (attack_info.units_away.off_population) {
                        away.push(`off: ${Helper.beautify_number(attack_info.units_away.off_population)}`)
                    }
                    properties.push(`Poza: { ${away.join(', ')} }`)
                }
            }
            if (attack_info.catapult_attack_result_plaintext) {
                properties.push(attack_info.catapult_attack_result_plaintext);
            }
            if (attack_info.ram_attack_result_plaintext) {
                properties.push(attack_info.ram_attack_result_plaintext);
            }
            let attack_info_text = `[spoiler=${properties.join(' | ')}]${attack_info.export_code}[color=#EFE6C9]#${(attack_info.report_id.toString(36))}[/color][/spoiler]`;
            return attack_info_text;
        },
        generate_village_info() {
            let properties = [];
            if (NotesScript.village_info.troops_type) {
                properties.push(NotesScript.village_info.troops_type);
            }
            if (typeof (NotesScript.village_info.church) === 'string') {
                properties.push(NotesScript.village_info.church);
            }
            if (typeof (NotesScript.village_info.belief) === 'boolean' && !NotesScript.village_info.belief) {
                properties.push('Bez wiary');
            }
            if (NotesScript.village_info.sim) {
                let url = Helper.generate_link_to_simulator(NotesScript.village_info.sim.troops);
                let deff_count = Helper.beautify_number(NotesScript.village_info.sim.deff_population);
                properties.push(`SIM [url=${url}]${deff_count}[/url]`);
            }
            if (NotesScript.village_info.sim_plaintext) {
                properties.push(NotesScript.village_info.sim_plaintext);
            }
            if (NotesScript.village_info.player_id) {
                properties.push(`[color=#F5EDDA]${NotesScript.village_info.player_id}[/color]`);
            }
            return properties.join(' | ');
        },
        add_note: function (new_note) {
            TribalWars.post('info_village', {
                ajaxaction: 'edit_notes',
                id: NotesScript.context.village_id
            }, { note: new_note }, NotesScript.on_note_updated);
        },
        on_note_updated: function (response) {
            if (response.note_parsed) {
                UI.SuccessMessage(`Notatka dodana do wioski ${NotesScript.context.side === 'def' ? 'atakuj\u{105}cego' : 'broni\u{105}cego'}`);
                let next_report = $('#report-next')[0];
                if (next_report) {
                    location.href = next_report.href;
                }
            }
            else {
                location.href = TribalWars.buildURL('GET', 'report', {
                    action: 'del_one',
                    mode: 'attack',
                    id: NotesScript.attack_info.report_id,
                    h: game_data.csrf
                });
            }
        },
        get_current_notes: function () {
            let village_notes_url = TribalWars.buildURL('GET', { screen: 'info_village', id: NotesScript.context.village_id });
            return fetch(village_notes_url, { credentials: 'include' }).then(t => t.text()).then(t => {
                try {
                    return $(t).find('textarea[name=note]')[0].innerText.trim();
                } catch (e) {
                    return '';
                }
            });
        },
        merge_village_info: function (old_village_info) {
            if (typeof (NotesScript.village_info.belief) === 'undefined') {
                NotesScript.village_info.belief = old_village_info.belief;
            }
            if (typeof (NotesScript.village_info.church) === 'undefined') {
                NotesScript.village_info.church = old_village_info.church;
            }
            if (typeof (NotesScript.village_info.troops_type) === 'undefined') {
                NotesScript.village_info.troops_type = old_village_info.troops_type;
            }
            if (typeof (NotesScript.village_info.sim) === 'undefined') {
                NotesScript.village_info.sim_plaintext = old_village_info.sim_plaintext;
            }
        },
        get_user_notes: function (old_notes) {
            let start = old_notes.indexOf('>>>');
            return start === -1
                ? old_notes
                : old_notes.substr(start + 3);
        },
        parse_notebook: function (old_notes) {
            let old_village_info = NotesScript.get_old_village_info(old_notes);
            let attack_infos = NotesScript.get_attack_infos(old_notes);
            let user_notes = NotesScript.get_user_notes(old_notes);
            // check if village owner has changed
            if (old_village_info.player_id !== NotesScript.village_info.player_id) {
                attack_infos = [];
            } else {
                NotesScript.merge_village_info(old_village_info);
            }
            // check if village already has this report
            if (attack_infos.some(old_info => old_info.report_id === NotesScript.attack_info.report_id)) {
                return { error: 'Village already has this report' };
            }
            // add current attack_info
            attack_infos.push(NotesScript.attack_info);
            // sort by date
            attack_infos.sort((lhs, rhs) => {
                if (lhs.battle_time.getTime() === rhs.battle_time.getTime()) {
                    return 0;
                }
                return lhs.battle_time.getTime() < rhs.battle_time.getTime()
                    ? 1
                    : -1;
            });
            // filter by date
            attack_infos = attack_infos.filter(x => x.battle_time.getTime() + Settings.attack_info_lifetime > Date.now());
            let attack_infos_text = attack_infos.map(x => NotesScript.generate_attack_info(x)).join('\n');
            let new_note = `${NotesScript.generate_village_info()}\n\n${attack_infos_text}\n<<<[b][size=9][color=#fa0fc0]HermitowskieNotatki <3<3<3[/color][/size][/b]>>>${user_notes}`;
            return new_note;
        },
        get_attack_infos: function (old_notes) {
            let start = old_notes.indexOf('\n\n');
            let end = old_notes.indexOf('>>>');
            if (end === -1 || start === -1) {
                return [];
            }
            let attack_infos_region = old_notes.substr(start + 2, end - start - 2);
            let attack_infos_text = attack_infos_region.match(/\[spoiler=.*\[\/spoiler]/g) || [];
            let attack_infos = [];
            for (let i = 0; i < attack_infos_text.length; i++) {
                let attack_info_text = attack_infos_text[i];
                let properties_text = attack_info_text.match(/\[spoiler=(.*)\]\[report_export/)[1];
                let properties = NotesScript.parse_old_attack_info_properties(properties_text);

                properties.export_code = attack_info_text.match(/\[report_export].*\[\/report_export\]/)[0];
                properties.report_id = parseInt(attack_info_text.match(/\[color=#EFE6C9\]#(.*)\[\/color\]/)[1], 36);
                attack_infos.push(properties);
            }
            return attack_infos;
        },
        parse_old_attack_info_properties: function (properties_text) {
            let properties_texts = properties_text.split(' | ');
            let properties = {};

            let battle_time_match = properties_texts.find(x => x.match(/^\d{2}.\d{2}.\d{2} \d{2}:\d{2}:\d{2}$/));
            if (battle_time_match) {
                properties.battle_time = Helper.parse_datetime_string(battle_time_match);
            }
            let rebuild_time_match = properties_texts.find(x => x.startsWith('Odbudowa dnia:'));
            if (rebuild_time_match) {
                properties.rebuild_time = Helper.parse_datetime_string(rebuild_time_match.match(/\d{2}.\d{2}.\d{2} \d{2}:\d{2}:\d{2}/)[0]);
            }
            let back_time_match = properties_texts.find(x => x.startsWith('Czas powrotu:'));
            if (back_time_match) {
                properties.back_time = Helper.parse_datetime_string(back_time_match.match(/\d{2}.\d{2}.\d{2} \d{2}:\d{2}:\d{2}/)[0]);
            }
            let empty_match = properties_texts.find(x => x === 'Wyczyszczona' || x === 'Pusta')
            if (empty_match) {
                properties.is_empty = empty_match;
            }
            let away_match = properties_texts.find(x => x.startsWith('Poza:'));
            if (away_match) {
                properties.units_away_plaintext = away_match;
            }
            let catapult_attack_result_match = properties_texts.find(x => x.startsWith('K:'));
            if (catapult_attack_result_match) {
                properties.catapult_attack_result_plaintext = catapult_attack_result_match;
            }
            let ram_attack_result_match = properties_texts.find(x => x.startsWith('T:'));
            if (catapult_attack_result_match) {
                properties.ram_attack_result_plaintext = ram_attack_result_match;
            }
            return properties;
        },
        get_old_village_info: function (old_notes) {
            let village_info_text = old_notes.split('\n\n')[0];
            let village_info_properties_text = village_info_text.split(' | ');
            let old_village_info = {};
            if (village_info_properties_text.some(x => x === 'OFF')) {
                old_village_info.troops_type = 'OFF';
            }
            if (village_info_properties_text.some(x => x === 'DEFF')) {
                old_village_info.troops_type = 'DEFF';
            }
            if (village_info_properties_text.some(x => x === 'Bez wiary')) {
                old_village_info.belief = false;
            }
            let church_match = village_info_properties_text.find(x => x.toLowerCase().indexOf('ko\u{15B}ci\u{F3}\u{142}') !== -1)
            if (church_match) {
                old_village_info.church = church_match;
            }
            let sim_match = village_info_properties_text.find(x => x.startsWith('SIM'));
            if (sim_match) {
                old_village_info.sim = true;
                old_village_info.sim_plaintext = sim_match;
            }
            let player_id_match = village_info_properties_text.find(x => x.match(/#F5EDDA\](\d+)/));
            if (player_id_match) {
                old_village_info.player_id = player_id_match.match(/\](\d+)/)[1];
            }
            return old_village_info;
        },
        main: async function () {
            try {
                const world_info = await get_world_info({ configs: ['config', 'unit_info'] });
                Settings.init(world_info);
                NotesScript.init();
            } catch (error) {
                Helper.handle_error(error);
            }
        }
    }

    $.ajax({
        url: 'https://media.innogamescdn.com/com_DS_PL/skrypty/HermitowskiePlikiMapy.js?_=' + ~~(Date.now() / 9e6),
        dataType: 'script',
        cache: true
    }).then(() => {
        NotesScript.main().catch(Helper.handle_error);
    });

})(TribalWars);
