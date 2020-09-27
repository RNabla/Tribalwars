// ==UserScript==
// @name          Sumowanie przybywającego wsparcia
// @description   Skrypt sumuje wsparcie z nadchodzących własnych komend i komend współplemieńców
// @author        stivens, Makak
// @include       https://pl*.plemiona.pl/game.php?*screen=overview
// @include       https://pl*.plemiona.pl/game.php?*screen=overview&*
// @include       https://pl*.plemiona.pl/game.php?*screen=info_village*
// @version       1.1.3
// @grant         none
// ==/UserScript==


(function () {
    'use strict';

    var gui_content = '';
    var doing_ajax = false;
    var game_data = TribalWars.getGameData();
    var world = game_data.world;
    var storage_name = 'commands_script_' + world;
    var current_village_id = game_data.village.id;
    var village_id = current_village_id;
    var commands_selector = '#commands_incomings tr';
    var wall_level = game_data.village.buildings.wall;
    var t = (game_data.player.sitter !== '0') ? '&t=' + game_data.player.id : '';

    if (game_data.screen === 'info_village') {
        village_id = window.location.href.match(/&id=(\d+)[^\d]?.*$/)[1];
        commands_selector = '#commands_incomings tr, #commands_outgoings tr';
        wall_level = 20;
    }


    function create_gui() {
        var filter_data = load_filter_data_for_village(village_id);

        gui_content = `<table class="vis" style="width:100%">
							<tr style="height: 25px">
								<td colspan="4" id="script_table_header"></td>
							</tr>
							<tr id="script_table">
								<td><label><input type="radio" name="filter" id="commands_script_filter_false" checked> Pokaż wszystko</label></td>
								<td><label><input type="radio" name="filter" id="commands_script_filter">Pokaż co wejdzie do podanej daty</label></td>
								<td><input type="text" id="filter_date" size="5" value="` + filter_data.date + `"></td>
								<td><input type="text" id="filter_hour"size="8" value="` + filter_data.time + `"></td>
							</tr>
						</table>
						<div id="commands_script_units"></div>
						<hr>
						<p style="text-align:right;margin:3px !important;"><a id="commands_script_simulator_link" href="" target="_blank">Symulator</a></p>`;

        var gui;
        if (game_data.screen == 'info_village') {
            gui = $('<div>');
            $(gui).attr('id', 'commands_script');
            $(gui).css('margin-bottom', '30px');
            $(gui).html(gui_content);
            $('th:contains(Notatki)').parent().parent().parent().parent().prepend((gui));
            $('#script_table_header').parent().before('<tr><th colspan="4">Sumowanie przybywającego wsparcia</th></tr>');
        } else {
            gui = $('#show_incoming_units').clone();
            $(gui).attr('id', 'commands_script');
            $(gui).find('.head').text('Sumowanie przybywającego wsparcia');
            $(gui).find('table').remove();
            $(gui).find('.widget_content').attr('style', 'padding:3px');
            $(gui).find('.widget_content').html(gui_content);
            $('#show_incoming_units').before(gui);
        }


        if (get_commands_count(-1, true, true) === 0) {
            $('#commands_script').hide();
        }

        $('input[type=radio]').change(function () {
            refresh_gui();
        });

        $('#filter_date, #filter_hour').on('focusout', function () {
            refresh_gui();
        });

        $('body').on('click', '#script_table_header', function () {
            update_commands_data(get_filter_timestamp());
            toggle_load_button();
        });
    }

    function refresh_gui() {
        var timestamp = get_filter_timestamp();
        if (timestamp !== -1) {
            update_filter_data(village_id, $('#filter_date').val().trim(), $('#filter_hour').val().trim(), timestamp);
        }

        var own_commands_troops = get_troops_by_commands_ids(get_commands_ids(timestamp, true, false));
        var ally_commands_troops = get_troops_by_commands_ids(get_commands_ids(timestamp, false, true));
        var in_village_troops = get_in_village_troops();
        var all_troops = sum_troops_objects(sum_troops_objects(own_commands_troops, ally_commands_troops), in_village_troops);
        update_units_table(own_commands_troops, ally_commands_troops, in_village_troops, all_troops);

        $('#commands_script_units table td').css('background-color', 'rgb(244, 228, 188)');
        $('#commands_script_simulator_link').attr('href', get_simulator_link(all_troops, wall_level));

        toggle_load_button();
    }

    function create_units_table(units) {
        var header = '', incoming_own = '', incoming_allies = '', in_village = '', all = '';
        for (var unit in units) {
            if (units.hasOwnProperty(unit)) {
                header += '<th style="text-align:center"><img src="' + image_base + 'unit/unit_' + unit + '.png"></th>';
                incoming_own += '<td style="text-align:center"><span id="commands_script_own_' + unit + '">' + 0 + '</span></td>';
                incoming_allies += '<td style="text-align:center"><span id="commands_script_ally_' + unit + '">' + 0 + '</span></td>';
                in_village += '<td style="text-align:center"><span id="commands_script_in_village_' + unit + '">' + 0 + '</span></td>';
                all += '<td style="text-align:center"><span id="commands_script_all_' + unit + '">' + 0 + '</span></td>';
            }
        }

        return `<table style="width:100%">
					<tr style="height: 25px"><th>Typ wojsk</th>` + header + `</tr>
					<tr><td>Własne komendy</td>` + incoming_own + `</tr>
					<tr><td>Cudze komendy</td>` + incoming_allies + `</tr>
					<tr><td>W wiosce</td>` + in_village + `</tr>
					<tr><td>Razem</td>` + all + `</tr>
				</table>`;
    }

    function update_units_table(own_commands, allies_commands, in_village, all) {
        var unit;
        var n = 0;
        for (unit in all) {
            if (all.hasOwnProperty(unit)) {
                n++;
            }
        }

        if ($('#commands_script_units th img').length !== n) {
            $('#commands_script_units').html(create_units_table(all));
        } else {
            $('#commands_script_units span').text('0');
        }


        for (unit in own_commands) {
            if (own_commands.hasOwnProperty(unit)) {
                $('#commands_script_own_' + unit).text(own_commands[unit]);
            }
        }
        for (unit in allies_commands) {
            if (allies_commands.hasOwnProperty(unit)) {
                $('#commands_script_ally_' + unit).text(allies_commands[unit]);
            }
        }
        for (unit in in_village) {
            if (in_village.hasOwnProperty(unit)) {
                $('#commands_script_in_village_' + unit).text(in_village[unit]);
            }
        }
        for (unit in all) {
            if (all.hasOwnProperty(unit)) {
                $('#commands_script_all_' + unit).text(all[unit]);
            }
        }
    }

    function toggle_load_button() {
        var timestamp = get_filter_timestamp();
        var total_commands_count = get_commands_count(timestamp, true, true);
        var unknown_commands_count = get_unknown_commands_count(timestamp, true, true);

        if (total_commands_count === unknown_commands_count && total_commands_count > 0) {
            $('#script_table_header').html('<button type="button" style="width:100%">Kliknij aby wczytać komendy</button>').css('text-align', 'center');
        }
        else if (unknown_commands_count > 0) {
            $('#script_table_header').html('<button type="button" style="width:100%">Kliknij aby wczytać ' + get_unknown_commands_count(timestamp, true, true) + ' nieznane komendy</button>').css('text-align', 'center');
        }
        else if (unknown_commands_count === 0) {
            gui_content = 'Wczytano wszystkie komendy<br>' + gui_content;
            $('#script_table_header').html('<span style="text-align-center; width:100%;">Wczytano wszystkie komendy</span>').css('text-align', 'center');
        }
    }

    function generate_links_to_filter() {
        if (get_commands_count(-1, true, true) !== 0) {
            var button = '<td><span class="small command_script_filterbutton" style="cursor: pointer; display: block; width: 16px; height: 22px; overflow: hidden; background: transparent url(' + image_base + '/index/group-jump.png) no-repeat;"><img src="' + image_base + '/blank-16x22.png" alt="Wprowadź czas tej komendy do filtra" title="Wprowadź czas tej komendy do filtra"></span></td>';

            $('#commands_outgoings tr:first th:last, #commands_incomings tr:first th:last').after('<th></th>');
            $('#ignored_commands_bar th:first').after('<th></th>');
            var inc_commands = $('#commands_incomings .no_ignored_command, #commands_outgoings .command-row');
            $(inc_commands).each(function () {
                $(this).find('td:last').after(button);
                $(this).find('.command_script_filterbutton').data('time', $(this).find('td:not(:first-child):first').text());
            });


            $('.command_script_filterbutton').on('click', function () {
                $('#commands_script_filter_false').prop('checked', true);

                var date_parts = string_to_date_parts($(this).data('time'));
                $('#filter_date').val(format_number(date_parts.day) + '.' + format_number(date_parts.month));
                $('#filter_hour').val(format_number(date_parts.hour) + ':' + format_number(date_parts.minute) + ':' + format_number(date_parts.second));

                $('#commands_script_filter').prop('checked', true);
                $('#commands_script_filter').trigger('change');

                UI.SuccessMessage('Zmieniono datę filtrowania komend', 500);
                return false;
            });
        }
    }

    function load_units_popup_cache() {
        var commands = get_commands_data_by_ids(get_commands_ids(-1, true, true));
        for (var command_id in commands) {
            if (commands.hasOwnProperty(command_id)) {
                window.Command.details_cache[command_id] = commands[command_id].original_object;
            }
        }
    }





    function load_commands_list() {
        if (localStorage.getItem(storage_name) !== null) {
            return JSON.parse(localStorage.getItem(storage_name));
        }
        return {};
    }

    function save_commands_list(list) {
        localStorage.setItem(storage_name, JSON.stringify(list));
    }

    function remove_old_commands() {
        var current_timestamp = get_current_timestamp();
        var list = load_commands_list();

        for (var command_id in list) {
            if (list.hasOwnProperty(command_id)) {
                if (list[command_id].timestamp < current_timestamp) {
                    delete list[command_id];
                }
            }
        }

        save_commands_list(list);
    }

    function add_command_to_list(command_id, command) {
        var list = load_commands_list();
        list[command_id] = command;
        save_commands_list(list);
    }





    function load_filter_data() {
        if (localStorage.getItem(storage_name + '_filter') !== null) {
            return JSON.parse(localStorage.getItem(storage_name + '_filter'));
        }
        return {};
    }

    function save_filter_data(data) {
        localStorage.setItem(storage_name + '_filter', JSON.stringify(data));
    }

    function remove_old_filter_data() {
        var current_timestamp = get_current_timestamp();
        var data = load_filter_data();

        for (var village_id in data) {
            if (data.hasOwnProperty(village_id)) {
                if (data[village_id].timestamp < current_timestamp) {
                    delete data[village_id];
                }
            }
        }

        save_filter_data(data);
    }

    function update_filter_data(village_id, input_date, input_time, timestamp) {
        var data = load_filter_data();
        data[village_id] = { date: input_date, time: input_time, timestamp: timestamp };
        save_filter_data(data);
    }

    function load_filter_data_for_village(village_id) {
        var data = load_filter_data();

        if (data.hasOwnProperty(village_id)) {
            return { date: data[village_id].date, time: data[village_id].time };
        } else {
            var now = new Date();
            return { date: now.getDate() + '.' + (now.getMonth() + 1), time: '23:59:59' };
        }
    }





    function get_current_timestamp() {
        return Math.floor(Date.now() / 1000);
    }

    function string_to_date_parts(date) {
        var day = 0, month = 0, hour = 0, minute = 0, second = 0;

        date = date.trim().match(/^(dzisiaj|jutro|dnia \d{2}\.\d{2}\.) o (\d{2}):(\d{2}):(\d{2}):(\d{3})$/);
        if (date !== null) {
            if (date[1] === 'dzisiaj') {
                var today = new Date();
                day = today.getDate();
                month = today.getMonth() + 1;
            } else if (date[1] === 'jutro') {
                var tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                day = tomorrow.getDate();
                month = tomorrow.getMonth() + 1;
            } else {
                var m = date[1].match(/(\d{2})\.(\d{2})/);
                day = m[1];
                month = m[2];
            }

            hour = date[2];
            minute = date[3];
            second = date[4];
        }

        return { day: Number(day), month: Number(month), hour: Number(hour), minute: Number(minute), second: Number(second) };
    }

    function date_parts_to_timestamp(date_parts) {
        var year = new Date().getFullYear();
        return Math.floor(new Date(year, date_parts.month - 1, date_parts.day, date_parts.hour, date_parts.minute, date_parts.second).getTime() / 1000);
    }

    function string_to_timestamp(date) {
        return date_parts_to_timestamp(string_to_date_parts(date));
    }

    function get_filter_timestamp() {
        if ($('#commands_script_filter').is(':checked')) {
            var input_date = $('#filter_date').val().trim().match(/^(\d{1,2})\.(\d{1,2})$/);
            var input_time = $('#filter_hour').val().trim().match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/);

            if (input_date === null || input_time === null) {
                UI.ErrorMessage('Podano datę lub czas w złym formacie (dd.mm  jako data, hh:mm:ss  jako czas)', 5000);
            } else if (input_date[1] > 31 || input_date[2] > 12 || input_time[1] > 23 || input_time[2] > 59 || input_time[3] > 59) {
                UI.ErrorMessage('Podano nieprawidłową datę lub czas (wpisano np. 70 w liczbę minut lub inny tego typu błąd)', 5000);
            } else {
                var timestamp = date_parts_to_timestamp({ day: input_date[1], month: input_date[2], hour: input_time[1], minute: input_time[2], second: input_time[3] });

                if (timestamp < get_current_timestamp()) {
                    UI.ErrorMessage('Podano niepoprawnę datę i czas (podano datę/czas w przeszłości)', 5000);
                } else {
                    return timestamp;
                }
            }
        }

        $('#commands_script_filter_false').prop('checked', true);
        return -1;
    }

    function format_number(n) {
        n = Number(n);

        if (n < 10) {
            return '0' + n;
        } else {
            return n;
        }
    }





    function sum_troops_objects(units1, units2) {
        var troops = {};
        var unit;

        for (unit in units1) {
            if (units1.hasOwnProperty(unit)) {
                troops[unit] = units1[unit];
            }
        }

        for (unit in units2) {
            if (units2.hasOwnProperty(unit)) {
                if (troops.hasOwnProperty(unit)) {
                    troops[unit] += units2[unit];
                } else {
                    troops[unit] = units2[unit];
                }
            }
        }

        return troops;
    }

    function get_in_village_troops() {
        if (game_data.screen === 'overview') {
            return troops_in_village_overview();
        } else {
            return troops_in_info_village();
        }
    }

    function troops_in_village_overview() {
        var troops = {};

        $('#show_units').find('.all_unit').each(function () {
            troops[$(this).find('a').attr('data-unit')] = parseInt($(this).find('strong').text());
        });

        return troops;
    }

    function troops_in_info_village() {
        var troops = {};
        var elements = $('h3:contains("Obrona") + table tr');

        var headers = elements.first().find('th');
        headers = headers.slice(1, headers.length - 1);
        headers.each(function () {
            var unit = $(this).find('a').data('unit');

            if (unit !== 'militia') {
                troops[unit] = 0;
            }
        });

        var rows = elements.slice(1).find('td').each(function () {
            if ($(this).hasClass('unit-item')) {
                for (var unit in troops) {
                    if (troops.hasOwnProperty(unit) && $(this).hasClass('unit-item-' + unit)) {
                        troops[unit] += Number($(this).text().trim());
                    }
                }
            }
        });

        return troops;
    }

    function get_simulator_link(def_units, wall_level) {
        var link = '/game.php?screen=place&mode=sim&simulate&att_axe=6200&att_light=3100&att_ram=400&luck=0&def_wall=' + wall_level;

        for (var unit in def_units) {
            if (def_units.hasOwnProperty(unit)) {
                link += '&def_' + unit + '=' + def_units[unit];
            }
        }

        return link;
    }





    function get_commands_ids(timestamp, get_own_commands_ids, get_ally_commands_ids) {
        var list = [];

        $(commands_selector).each(function () {
            var span = $(this).find('span.command_hover_details').first();

            if (span.length === 0) {
                return;
            }

            if (span.data('command-type') !== 'support') {
                return;
            }

            if (timestamp !== -1 && string_to_timestamp(span.closest('td').next('td').text()) >= timestamp) {
                return;
            }

            if ((span.hasClass('commandicon-ally') === false && get_own_commands_ids) || (span.hasClass('commandicon-ally') && get_ally_commands_ids)) {
                list.push(span.data('command-id'));
            }
        });

        return list;
    }

    function get_commands_count(timestamp, get_own_commands_ids, get_ally_commands_ids) {
        return get_commands_ids(timestamp, get_own_commands_ids, get_ally_commands_ids).length;
    }

    function get_unknown_commands_ids(list_of_ids) {
        var list = load_commands_list();
        var unknown_ids = [];

        for (var i = 0, n = list_of_ids.length; i < n; i++) {
            if (list.hasOwnProperty(list_of_ids[i]) === false) {
                unknown_ids.push(list_of_ids[i]);
            }
        }

        return unknown_ids;
    }

    function get_unknown_commands_count(timestamp, get_own_commands_ids, get_ally_commands_ids) {
        var commands_ids = get_commands_ids(timestamp, get_own_commands_ids, get_ally_commands_ids);
        var unknown_commands_ids = get_unknown_commands_ids(commands_ids);
        return unknown_commands_ids.length;
    }

    function download_command_data(command_id) {
        $.get(
            '/game.php?village=' + current_village_id + t + '&screen=info_command&ajax=details&id=' + command_id + '&client_time=' + get_current_timestamp()
        ).done(function (data) {
            var command = convert_ajax_response(data);
            add_command_to_list(command_id, command);
            window.Command.details_cache[command_id] = command.original_object;
            doing_ajax = false;
            refresh_gui();
        }).error(function () {
            UI.ErrorMessage('Wystąpił błąd podczas pobierania danych o komendach. Odśwież stronę aby spróbować ponownie.', 2000);
            doing_ajax = false;
        });
    }

    function convert_ajax_response(data) {
        var command = { timestamp: Number(data.time_arrival.date), units: {}, original_object: data };

        for (var unit in data.units) {
            if (data.units.hasOwnProperty(unit)) {
                command.units[unit] = Number(data.units[unit].count);
            }
        }

        return command;
    }

    function update_commands_data(timestamp) {
        var commands_ids = get_unknown_commands_ids(get_commands_ids(timestamp, true, true)), i = 0, n = commands_ids.length;
        if (n > 0) {
            var interval_id = setInterval(function () {
                if (doing_ajax === false) {
                    doing_ajax = true;
                    download_command_data(commands_ids[i]);
                    i++;

                    if (i == n) {
                        clearInterval(interval_id);
                    }
                }
            }, 75);
        }
    }

    function get_commands_data_by_ids(list_of_ids) {
        var list = load_commands_list();
        var commands = {};

        for (var i = 0, n = list_of_ids.length; i < n; i++) {
            if (list.hasOwnProperty(list_of_ids[i])) {
                commands[list_of_ids[i]] = list[list_of_ids[i]];
            }
        }

        return commands;
    }

    function get_troops_by_commands_ids(list_of_ids) {
        var commands = get_commands_data_by_ids(list_of_ids);
        var troops = {};
        var first_command = true;
        var unit;

        for (var command_id in commands) {
            if (commands.hasOwnProperty(command_id)) {
                if (first_command) {
                    first_command = false;

                    for (unit in commands[command_id].units) {
                        if (commands[command_id].units.hasOwnProperty(unit)) {
                            troops[unit] = commands[command_id].units[unit];
                        }
                    }
                } else {
                    for (unit in commands[command_id].units) {
                        if (commands[command_id].units.hasOwnProperty(unit)) {
                            troops[unit] += commands[command_id].units[unit];
                        }
                    }
                }
            }
        }

        return troops;
    }






    remove_old_commands();
    remove_old_filter_data();
    create_gui();
    refresh_gui();
    generate_links_to_filter();
    load_units_popup_cache();
})();
