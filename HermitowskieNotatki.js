!function (TribalWars) {
    let Settings = {
        simulator_luck: -25,
        simulator_def_wall: 20,
        simulator_att_troops: {
            axe: 6000,
            light: 3000,
            ram: 242
        },
        back_time_delta: 3, /* hours */
        rebuild_time_delta: 48, /* hours */
        rebuild_time_threshold: 6, /* hours */
        attack_info_lifetime: 14, /* days */
    };
    let Helper = {
        parse_datetime_string: function (datetime_string) {
            let date_time = datetime_string.split(" ");
            let date = date_time[0].split(".").map(x => Number(x));
            let time = date_time[1].split(":").map(x => Number(x));
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
                return units.reduce((time, unit) => Helper.unit2rebuild_time[unit] * troops[unit] + time, 0) * 1000;
            }

            let barracks_time = rebuild_time(['spear', 'sword', 'axe', 'archer']);
            let stable_time = rebuild_time(['spy', 'light', 'marcher', 'heavy']);
            let garage_time = rebuild_time(['ram', 'catapult']);
            return Math.max(barracks_time, stable_time, garage_time);
        },
        get_troops_summary: function (troops) {
            function count_population(units) {
                return units.reduce((time, unit) => Helper.unit2population[unit] * troops[unit] + time, 0);
            }

            let deff_population = count_population(Helper.deff_units);
            let off_population = count_population(Helper.off_units);
            let misc_population = count_population(Helper.misc_units);
            return {
                troops: troops,
                deff_population: deff_population,
                off_population: off_population,
                misc_population: misc_population,
            }
        },
        generate_link_to_simulator: function (def_troops, att_troops) {
            let properties = {
                mode: 'sim',
                moral: 100,
                luck: -25, // Hermitowski nigdy nie ma szczęścia
                belief_def: 'on',
                belief_att: 'on',
                simulate: 1,
                def_wall: 20
            };

            let append_units = function (context, units) {
                for (const unit in units) {
                    if (units[unit] > 0) {
                        properties[`${context}_${unit}`] = units[unit];
                    }
                }
            }

            append_units('att', att_troops);
            append_units('def', def_troops);

            return TribalWars.buildURL('GET', 'place', properties);
        },
        get_march_time: function (troops) {
            let march_time = Object.keys(troops).filter(unit => troops[unit] > 0)
                .reduce((time_per_field, unit) => Math.max(Helper.unit2speed[unit], time_per_field), 0);
            if (march_time === 0) {
                throw 'xd';
            }
            return march_time * 60 * 1000;
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
        unit2speed: {
            'pl121': {
                spear: 18,
                sword: 22,
                axe: 18,
                archer: 18,
                spy: 9,
                light: 10,
                marcher: 10,
                heavy: 11,
                ram: 29.9999999976,
                catapult: 29.9999999976,
                snob: 35
            }
        }[game_data.world],
        unit2population: {
            spear: 1,
            sword: 1,
            axe: 1,
            archer: 1,
            spy: 2,
            light: 4,
            marcher: 5,
            heavy: 6,
            ram: 5,
            catapult: 8,
            knight: 10,
            snob: 100
        },
        unit2rebuild_time: {
            'pl121': {
                spear: 100,
                sword: 146,
                axe: 129,
                archer: 175,
                spy: 117,
                light: 234,
                marcher: 351,
                heavy: 468,
                ram: 1184,
                catapult: 1776
            }
        }[game_data.world],
        deff_units: ['spear', 'sword', 'archer', 'heavy'],
        off_units: ['axe', 'light', 'marcher', 'ram'],
        misc_units: ['spy', 'catapult', 'snob'],
        back_time_delta: 3,
        rebuild_time_delta: 48,
        attack_info_lifetime: 14,
        bunker_threshold: 30000,
    };
    // TODO: raporty z przejeciem
    let info = {};
    try {
        check_screen();
        get_report_id();
        get_battle_time();
        get_context();
        if (info.context === 'att') {
            get_church();
            get_attack_results();
            check_if_empty();
            get_bunker();
            get_units_away();
        }
        if (info.context === 'def') {
            get_back_time();
        }
        get_export_code();
        get_rebuild_time();
        get_belief();
        get_troops_type();
        console.log(info);
        return;
        get_current_notes().then(old_notes => {
            try {
                let new_note = parse_notebook(old_notes);
                if (new_note.error) {
                    throw new_note.error;
                }
                append_note(new_note);
            } catch (e) {
                UI.ErrorMessage(e);
                console.error(e);
                let next_report = $('#report-next')[0];
                if ($('#report-next')[0]) {
                    location.href = next_report.href;
                }
            }
        });
    }
    catch (e) {
        UI.ErrorMessage(e);
        console.error(e);
    }

    function check_screen() {
        if ($('.report_ReportAttack').length !== 1) {
            if ($('[class*=report_Report]').length !== 0) {
                throw "Tego typu raporty nie s\u0105 obs\u0142ugiwane";
            }
            throw "Czy aby na pewno jeste\u015B w przegl\u0105dzie raportu?";
        }
    }

    function get_context() {
        let att = $('#attack_info_att');
        let def = $('#attack_info_def');
        let att_player_name = $(att)[0].rows[0].cells[1].innerText.trim();
        let def_player_name = $(def)[0].rows[0].cells[1].innerText.trim();
        let att_player_id = att[0].rows[0].cells[1].children[0].href.match(/id=(\d+)/)[1];
        let def_player_id = def[0].rows[0].cells[1].children[0].href.match(/id=(\d+)/)[1];
        let att_village_id = $(att).find('.contexted').attr('data-id');
        let def_village_id = $(def).find('.contexted').attr('data-id');
        let this_player_id = game_data.player.id;
        let forwarder = get_origin_player();
        if (this_player_id === att_player_id || forwarder === att_player_name) {
            info.context = 'att';
        }
        if (this_player_id === def_player_id || forwarder === def_player_name) {
            info.context = 'def';
        }
        if (info.context !== 'att' && info.context !== 'def') {
            let user_answer = prompt("Wpisz 'att', jeżeli jesteś agresorem w tym raporcie; 'def' jeżeli się bronisz", 'att');
            if (user_answer !== null && (user_answer.trim() === 'att' || user_answer.trim() === 'def')) {
                info.context = user_answer;
            } else {
                throw 'Nie wiem po której stronie dodać notatkę';
            }
        }
        info.player_id = info.context === 'att' ? def_player_id : att_player_id;
        info.village_id = info.context === 'att' ? def_village_id : att_village_id;
        let village_player_id = (info.context === 'att' ? def : att)[0].rows[1].cells[1].children[0].getAttribute('data-player');
        if (info.player_id !== village_player_id) {
            // TODO: maybe clear old old_notes
            location.href = TribalWars.buildURL('GET', 'report', {
                action: 'del_one',
                mode: 'attack',
                id: info.report_id,
                h: game_data.csrf
            });
            throw 'Docelowa wioska zmieniła właściciela';
        }

    }

    function get_origin_player() {
        let table = $('table.vis')[3];
        for (let i = 0; i < table.rows.length; i++) {
            if (table.rows[i].cells[0].innerText === "Przes\u0142ane od:") {
                return table.rows[i].cells[1].innerText;
            }
        }
        return undefined;
    }

    function get_export_code() {
        info.export_code = $("#report_export_code").val().match(/\[report_export].*\[\/report_export\]/)[0];
    }

    function get_report_id() {
        info.report_id = 42;
        //return;
        info.report_id = Number(location.href.match(/view=(\d+)/)[1]);
    }

    function get_units_away() {
        let spy_away = $('#attack_spy_away');
        if (spy_away.length === 1) {
            let row = spy_away.find('table')[0].rows[1];
            let troops = get_troops_by_row(row, 0);
            let summary = Helper.get_troops_summary(troops);
            info.units_away = summary;
        }
    }

    function get_troops_type() {
        let troops_type = undefined;
        if (info.units_away) {
            troops_type = verdict(info.units_away, 1000);
        }
        let context = info.context === 'att'
            ? 'def'
            : 'att';
        // we wan't opposite side troops
        let attack_info_units = $(`#attack_info_${context}_units`);
        if (attack_info_units.length) {
            let troops = get_troops_by_row($(`#attack_info_${context}_units`)[0].rows[1], 1);
            if (troops && !troops_type) {
                troops_type = verdict(Helper.get_troops_summary(troops), 3000);
            }
            info.troops_type = troops_type;
        }
    }

    function verdict(summary, threshold) {
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

    function get_rebuild_time() {
        let context = info.context === 'att' ? 'def' : 'att';
        let loses = get_loses(context);
        if (loses) {
            let rebuild_time = Helper.calculate_rebuild_time(loses);
            if (rebuild_time != 0) {
                info.rebuild_time = new Date(info.battle_time.getTime() + rebuild_time);
            }
        }
    }

    function get_back_time() {
        let match_coordinates = function (text) {
            let matches = text.match(/\d{1,3}\|\d{1,3}/g);
            return matches[matches.length - 1].split("|").map(x => Number(x));
        }
        let origin = match_coordinates($('#attack_info_att')[0].rows[1].innerText);
        let destination = match_coordinates($('#attack_info_def')[0].rows[1].innerText);
        let distance = Math.hypot(origin[0] - destination[0], origin[1] - destination[1]);
        let units = get_troops_by_row($('#attack_info_att_units')[0].rows[1], 1);
        let survivors = get_survivors('att');
        let someone_survived = Object.values(survivors).some(x => x > 0);
        if (someone_survived) {
            let march_time = Helper.get_march_time(units);
            let back_time_timestamp = info.battle_time.getTime() + march_time * distance;
            // HACK: światy bez ms; a co z tymi co mają ms
            let milliseconds = back_time_timestamp % 1000;
            if (milliseconds !== 0) {
                back_time_timestamp -= milliseconds;
                back_time_timestamp += 1000;
            }
            // TODO: światy z ms?????

            info.back_time = new Date(back_time_timestamp);
        }
        else {
            info.back_time = undefined;
        }
    }

    function get_battle_time() {
        let rows = $('table.vis')[3].rows;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].cells[0].innerText === "Czas bitwy") {
                info.battle_time = Helper.parse_datetime_string(rows[i].cells[1].innerText);
                return;
            }
        }
        info.battle_time = undefined;
    }

    function get_attack_results() {
        let attack_results = $('#attack_results')[0];
        if (attack_results === undefined) {
            info.attack_results = undefined;
            return;
        }
        info.attack_results = {};
        let ram_match = attack_results.innerText.match(/Uszkodzenie przez tarany:\s*Mur uszkodzony z poziomu (\d+) do poziomu (\d+)/);
        let catapult_match = attack_results.innerText.match(/Szkody spowodowane ostrzałem katapult:\s*(.*) uszkodzono z poziomu (\d+) do poziomu (\d+)/);
        info.attack_results.ram_result = ram_match === null
            ? undefined
            : ram_match.slice(1).map(x => Number(x));
        info.attack_results.catapult_result = catapult_match === null
            ? undefined
            : {
                target: catapult_match[1],
                damage: catapult_match.slice(2).map(x => Number(x))
            }
    }

    function get_church() {
        let table = $('#attack_spy_building_data');
        if (table.length === 1) {
            let buildings = JSON.parse(table.val());
            for (const building of buildings) {
                if (building.id === 'church' || building.id === 'church_f') {
                    info.church = building.name + " " + building.level;
                    return;
                }
            }
            info.church = false;
            return;
        }
        info.church = undefined;
    }

    function check_if_empty() {
        let def_units = $('#attack_info_def_units');
        if (def_units.length === 1) {
            let rows = def_units[0].rows;
            let troops = rows[1];
            let loses = rows[2];
            let empty = true;
            let clean = true;
            for (let i = 1; i < troops.cells.length; i++) {
                if (loses.cells[i].innerText !== troops.cells[i].innerText) {
                    clean = false;
                    break;
                }
            }
            if (clean) {
                for (let i = 1; i < troops.cells.length; i++) {
                    if (loses.cells[i].innerText !== "0") {
                        empty = false;
                    }
                }

                info.empty = empty
                    ? 'Pusta'
                    : 'Wyczyszczona';
                return;
            }
        }
        info.empty = undefined;
    }

    function get_belief() {
        let context = info.context === 'att' ? 'def' : 'att';
        let attack_info = $(`#attack_info_${context}`);
        if (attack_info.length === 1) {
            let rows = attack_info[0].rows;
            let belief_row = rows[rows.length - 1];
            let belief_match = belief_row.innerText.match(/Siła uderzenia: (\d+)%/);
            if (belief_match !== null) {
                if (belief_match[1] === "50") {
                    info.belief = false;
                }
                if (belief_match[1] === "100") {
                    info.belief = true;
                }
                return;
            }
            info.belief = undefined;
        }
    }

    function get_troops_by_row(row, start) {
        let troops = {};
        for (let i = start; i < row.cells.length; i++) {
            let count = Number(row.cells[i].innerText);
            troops[game_data.units[i - start]] = count;
        }
        return troops;
    }

    function get_loses(context) {
        let attack_info_units = $(`#attack_info_${context}_units`)[0];
        if (attack_info_units) {
            return get_troops_by_row(attack_info_units.rows[2], 1);
        }
        return undefined;
    }

    function get_survivors(context) {
        let attack_info_units = $(`#attack_info_${context}_units`)[0];
        if (attack_info_units) {
            let defense = get_troops_by_row(attack_info_units.rows[1], 1);
            let loses = get_troops_by_row(attack_info_units.rows[2], 1);
            let survivors = {};
            for (const key in defense) {
                survivors[key] = defense[key] - loses[key];
            }
            return survivors;
        }
        return undefined;
    }

    function get_bunker() {
        let survivors = get_survivors('def');
        if (survivors) {
            let summary = Helper.get_troops_summary(survivors);
            if (summary.deff_population > Helper.bunker_threshold) {
                info.bunker = summary;
            }
            else {
                info.bunker = false;
            }
            return;
        }
        info.bunker = undefined;
    }

    function generate_attack_info(attack_info) {
        let properties = [Helper.date_to_datetime_string(attack_info.battle_time)];

        if (attack_info.empty) {
            properties.push(attack_info.empty);
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
        if (attack_info.back_time && (attack_info.back_time.getTime() + Helper.back_time_delta * 3600 * 1000) > Date.now()) {
            properties.push(`Czas powrotu: ${Helper.date_to_datetime_string(attack_info.back_time)}`)
        }
        if (attack_info.rebuild_time && (attack_info.rebuild_time.getTime() + Helper.rebuild_time_delta * 3600 * 1000) > Date.now()) {
            properties.push(`Odbudowa dnia: ${Helper.date_to_datetime_string(attack_info.rebuild_time)}`)
        }
        if (attack_info.units_away) {
            if (attack_info.units_away.deff_population || info.units_away.off_population) {
                let away = [];
                if (attack_info.units_away.deff_population) {
                    away.push(`deff: ${Helper.beautify_number(attack_info.units_away.deff_population)}`)
                }
                if (attack_info.units_away.off_population) {
                    away.push(`off: ${Helper.beautify_number(attack_info.units_away.off_population)}`)
                }
                properties.push(`Poza: { ${away.join(", ")} }`)
            }
        }
        if (attack_info.catapult_attack_result_plaintext) {
            properties.push(attack_info.catapult_attack_result_plaintext);
        }
        if (attack_info.ram_attack_result_plaintext) {
            properties.push(attack_info.ram_attack_result_plaintext);
        }
        let attack_info_text = `[spoiler=${properties.join(" | ")}]${attack_info.export_code}[color=#EFE6C9]#${(attack_info.report_id.toString(36))}[/color][/spoiler]`;
        return attack_info_text;
    }

    function generate_village_info() {
        let properties = [];
        if (info.troops_type) {
            properties.push(info.troops_type);
        }
        if (info.church) {
            properties.push(info.church);
        }
        if (typeof (info.belief) === 'boolean' && !info.belief) {
            properties.push('Bez wiary');
        }
        if (info.bunker) {
            let url = Helper.generate_link_to_simulator(info.bunker.troops, {
                axe: 6000,
                light: 3000,
                ram: 400
            }).substr(1);
            let deff_count = Helper.beautify_number(info.bunker.deff_population);
            properties.push(`Bunkier [url=${url}]${deff_count}[/url]`);
        }
        if (info.bunker_plaintext) {
            properties.push(info.bunker_plaintext);
        }
        if (info.player_id) {
            properties.push(`[color=#F5EDDA]${info.player_id}[/color]`);
        }
        return properties.join(" | ");
    }

    function append_note(new_note) {
        TribalWars.post('info_village', {
            ajaxaction: 'edit_notes',
            id: info.village_id
        }, { note: new_note }, on_note_updated);
    }

    function on_note_updated() {
        UI.SuccessMessage(`Notatka dodana do wioski ${info.context === 'def' ? 'atakującego' : 'broniącego'}`);
        let next_report = $('#report-next')[0];
        if ($('#report-next')[0]) {
            location.href = next_report.href;
        }
    }

    function get_current_notes() {
        let village_notes_url = TribalWars.buildURL('GET', { screen: 'info_village', id: info.village_id });
        return fetch(village_notes_url, { credentials: 'include' }).then(t => t.text()).then(t => {
            try {
                return $(t).find('textarea[name=note]')[0].innerText.trim();
            } catch (e) {
                return "";
            }
        });
    }

    function merge_village_info(old_village_info) {
        if (typeof (info.belief) === 'undefined') {
            info.belief = old_village_info.belief;
        }
        if (typeof (info.church) === 'undefined') {
            info.church = old_village_info.church;
        }
        if (typeof (info.troops_type) === 'undefined') {
            info.troops_type = old_village_info.troops_type;
        }
        if (typeof (info.bunker) === 'undefined') {
            info.bunker_plaintext = old_village_info.bunker_plaintext;
        }
    }

    function get_user_notes(old_notes) {
        let start = old_notes.indexOf('>>>');
        return start === -1
            ? old_notes
            : old_notes.substr(start + 3);
    }

    function parse_notebook(old_notes) {
        let old_village_info = get_old_village_info(old_notes);
        let attack_infos = get_attack_infos(old_notes);
        let user_notes = get_user_notes(old_notes);
        // check if village owner has changed
        if (old_village_info.player_id !== info.player_id) {
            attack_infos = [];
        } else {
            merge_village_info(old_village_info);
        }
        // check if village already has this report
        if (attack_infos.some(old_info => old_info.report_id === info.report_id)) {
            return { error: 'Village already has this report' };
        }
        // add current attack_info
        attack_infos.push(info);
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
        attack_infos = attack_infos.filter(x => x.battle_time.getTime() + Helper.attack_info_lifetime * 24 * 3600 * 1000 > Date.now());
        let attack_infos_text = attack_infos.map(x => generate_attack_info(x)).join("\n");
        let new_note = `${generate_village_info()}\n\n${attack_infos_text}\n<<<NOTATKI>>>${user_notes}`;
        return new_note;
    }

    function get_attack_infos(old_notes) {
        let start = old_notes.indexOf('\n\n');
        let end = old_notes.indexOf('>>>');
        if (end === -1 || start === -1) {
            return [];
        }
        let attack_infos_region = old_notes.substr(start + 2, end - start - 2);
        let attack_infos_text = attack_infos_region.match(/\[spoiler=.*\[\/spoiler]/g);
        let attack_infos = [];
        for (let i = 0; i < attack_infos_text.length; i++) {
            let attack_info_text = attack_infos_text[i];
            let properties_text = attack_info_text.match(/\[spoiler=(.*)\]\[report_export/)[1];
            let properties = parse_old_attack_info_properties(properties_text);

            properties.export_code = attack_info_text.match(/\[report_export].*\[\/report_export\]/)[0];
            properties.report_id = parseInt(attack_info_text.match(/\[color=#EFE6C9\]#(.*)\[\/color\]/)[1], 36);
            attack_infos.push(properties);
        }
        return attack_infos;
    }

    function parse_old_attack_info_properties(properties_text) {
        let properties_texts = properties_text.split(" | ");
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
            properties.empty = empty_match;
        }
        let away_match = properties_texts.find(x => x.startsWith('Poza:'));
        if (away_match) {
            properties.units_away_plaintext = away_match;
        }
        let catapult_attack_result_match = properties_texts.find(x => x.startsWith("K:"));
        if (catapult_attack_result_match) {
            properties.catapult_attack_result_plaintext = catapult_attack_result_match;
        }
        let ram_attack_result_match = properties_texts.find(x => x.startsWith("T:"));
        if (catapult_attack_result_match) {
            properties.ram_attack_result_plaintext = ram_attack_result_match;
        }
        return properties;
    }

    function get_old_village_info(old_notes) {
        let village_info_text = old_notes.split('\n\n')[0];
        let village_info_properties_text = village_info_text.split(" | ");
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
        let church_match = village_info_properties_text.find(x => x.toLowerCase().indexOf('kościół') !== -1)
        if (church_match) {
            old_village_info.church = church_match;
        }
        let bunker_match = village_info_properties_text.find(x => x.startsWith('Bunkier'));
        if (bunker_match) {
            old_village_info.bunker = true;
            old_village_info.bunker_plaintext = bunker_match;
        }
        let player_id_match = village_info_properties_text.find(x => x.match(/#F5EDDA\](\d+)/));
        if (player_id_match) {
            old_village_info.player_id = player_id_match.match(/\](\d+)/)[1];
        }
        return old_village_info;
    }


}(TribalWars);