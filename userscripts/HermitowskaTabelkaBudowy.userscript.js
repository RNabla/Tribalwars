// ==UserScript==
// @name         Hermitowski Planer Budowy
// @namespace    https://hermitowski.com
// @version      1.0
// @author       Hermitowski
// @include      https://pl*.plemiona.pl/game.php?*&screen=main*
// @grant        none
// ==/UserScript==


/**
 * Overview of resources dependencies on buildings
 * Created by: Hermitowski
 * Modified on: 25/03/2020 - version 2.0
 */
!(async function () {
    const namespace = 'Hermitowski.Planer.Budowy';
    const start = Date.now();
    const now = start;
    const i18n = {
        ERROR_MESSAGE: 'Komunikat o b\u{142}\u{119}dzie: ',
        FORUM_THREAD: 'Link do w\u{105}tku na forum',
        FORUM_THREAD_HREF: 'https://forum.plemiona.pl/index.php?threads/Hermitowski.126840/',
        LABEL: {
            building: 'Budynek',
            buy: 'Kupno',
            sell: 'Sprzeda\u{17C}',
            wood: 'Drewno',
            stone: 'Glina',
            iron: '\u017Belazo',
            time: 'Czas',
            market: 'Rynek',
            call: 'Wezwij',
            export: 'Export',
            additional: 'Dodatkowe',
            max_trade: 'Max wymiana',
            building_level: 'Poziom __0__',
            snob: 'Szlachcic',
            coin: 'Z\u{142}ota moneta',
            copied: 'Skopiowano do schowka'
        },
        ERROR: {
            nothing_to_buy: 'Niczego nie potrzebujesz'
        },
    };

    const Helper = {
        two_digit: function (value) {
            return value > 9
                ? `${value}`
                : `0${value}`;
        },
        get_duration_text: function (duration /* in seconds */) {
            duration = parseInt(duration);
            const seconds = duration % 60;
            duration = (duration - seconds) / 60;
            const minutes = duration % 60;
            duration = (duration - minutes) / 60;
            return [duration, minutes, seconds].map(Helper.two_digit).join(":");
        },
        get_id: function (control_name) {
            if (Array.isArray(control_name)) {
                control_name = control_name.join('.');
            }
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

    const HermitowskiPlanerBudowy = {
        create_gui: function () {
            const container = document.createElement('div');
            container.id = Helper.get_id('container');
            container.classList.add('vis');
            container.style.width = 'auto';
            container.style.margin = '0';
            Dialog.show(Helper.get_id(), container.outerHTML);
            setTimeout(function () {
                document.querySelector(`#popup_box_${Helper.get_id()}`.replace(/\./g, '\\.')).style.width = 'auto';
                if (mobile) {
                    document.querySelector(`#popup_box_${Helper.get_id()}`.replace(/\./g, '\\.')).style.maxWidth = '80vw';
                }
            });
        },
        create_planner_table: function () {
            const container = Helper.get_control('container');
            const form = document.createElement('form');
            const table = document.createElement('table');
            const thead = HermitowskiPlanerBudowy.create_planner_table_header();
            const tbody = HermitowskiPlanerBudowy.create_planner_table_body();
            container.append(form);
            form.append(table);
            table.append(thead);
            table.append(tbody);
        },
        create_planner_table_header: function () {
            const thead = document.createElement('thead');
            thead.id = Helper.get_id('thead');
            const row = document.createElement('tr');
            const columns = [
                { name: i18n.LABEL.building },
                { name: i18n.LABEL.wood, res: 'wood' },
                { name: i18n.LABEL.stone, res: 'stone' },
                { name: i18n.LABEL.iron, res: 'iron' },
                { name: i18n.LABEL.time },
                { name: i18n.LABEL.market },
            ];
            for (const column of columns) {
                const thead_cell = document.createElement('th');
                if (column.res) {
                    const text_div = document.createElement('div');
                    text_div.innerText = column.name;
                    text_div.style.textAlign = 'center';
                    thead_cell.append(text_div);
                    const trade_directions = { buy: i18n.LABEL.buy, sell: i18n.LABEL.sell };
                    for (const trade_direction in trade_directions) {
                        const span = document.createElement('span');
                        span.style.whiteSpace = 'nowrap';
                        const label = document.createElement('label');
                        label.textContent = trade_directions[trade_direction];
                        label.setAttribute('for', Helper.get_id([column.res, trade_direction]));
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.id = Helper.get_id([column.res, trade_direction]);
                        checkbox.checked = true;
                        span.append(checkbox);
                        span.append(label);
                        thead_cell.append(span);
                        thead_cell.append(document.createElement('br'));
                    }
                    const input_fields = { 'additional': i18n.LABEL.additional, 'max_trade': i18n.LABEL.max_trade };
                    for (const input_field_name in input_fields) {
                        const input = document.createElement('input');
                        input.id = Helper.get_id([column.res, input_field_name]);
                        input.size = 10;
                        input.placeholder = input_fields[input_field_name];
                        input.title = input_field_name;
                        input.style.textIndent = '0.5em';
                        thead_cell.append(input);
                        thead_cell.append(document.createElement('br'));
                    }
                }
                else {
                    thead_cell.innerText = column.name;
                    thead_cell.classList.add('center');
                }
                row.append(thead_cell);
            }
            thead.append(row);
            return thead;
        },
        create_planner_table_body: function () {
            const tbody = document.createElement('tbody');
            tbody.id = Helper.get_id('tbody');
            for (const build_target of HermitowskiPlanerBudowy.build_targets) {
                const row_1 = document.createElement('tr');
                const row_2 = document.createElement('tr');
                row_1.classList.add('row_a', build_target.id);
                row_2.classList.add('row_b', build_target.id);
                row_1.append(HermitowskiPlanerBudowy.create_planner_table_body_cell_text({ id: [build_target.id, 'name'], text: build_target.name, bold_name: true }));
                row_2.append(HermitowskiPlanerBudowy.create_planner_table_body_cell_text({ text: build_target.description }));
                for (const resource of HermitowskiPlanerBudowy.resources) {
                    row_1.append(HermitowskiPlanerBudowy.create_planner_table_body_cell_resource(build_target.id, resource, 'current'));
                    row_2.append(HermitowskiPlanerBudowy.create_planner_table_body_cell_resource(build_target.id, resource, 'optimal'));
                }
                row_1.append(HermitowskiPlanerBudowy.create_planner_table_body_cell_text({ id: [build_target.id, 'current'] }));
                row_2.append(HermitowskiPlanerBudowy.create_planner_table_body_cell_text({ id: [build_target.id, 'optimal'] }));
                row_1.append(HermitowskiPlanerBudowy.create_planner_table_body_cell_market(build_target));
                row_2.append(HermitowskiPlanerBudowy.create_planner_table_body_cell_export(build_target));
                tbody.append(row_1);
                tbody.append(row_2);
            }
            return tbody;
        },
        create_planner_table_body_cell_text: function (options) {
            const cell = document.createElement('td');
            if (options.text) {
                cell.innerText = options.text;
                if (options.bold_name) {
                    cell.style.fontWeight = 'bold';
                }
            }
            if (options.id) {
                cell.id = Helper.get_id(options.id);
            }
            return cell;
        },
        create_planner_table_body_cell_resource: function (target_id, resource_name, time_type) {
            const cell = document.createElement('td');
            const icon_span = document.createElement('span');
            icon_span.classList.add('icon', 'header', resource_name);
            icon_span.title = resource_name;
            const text_span = document.createElement('span');
            text_span.id = Helper.get_id([target_id, resource_name, time_type]);
            cell.append(text_span);
            cell.append(icon_span);
            cell.style.textAlign = 'right';
            icon_span.style.marginLeft = '0.5em';
            return cell;
        },
        create_planner_table_body_cell_market: function (build_target) {
            const market_cell = document.createElement('td');
            const market_anchor = document.createElement('a');
            let params = { mode: 'call' };
            for (const resource of HermitowskiPlanerBudowy.resources) {
                params[resource] = build_target[resource];
            }
            params['delivery_at'] = now + HermitowskiPlanerBudowy.build_queue_time * 1000;
            market_anchor.href = TribalWars.buildURL('GET', 'market', params);
            market_anchor.innerText = i18n.LABEL.call;
            market_cell.style.textAlign = 'center';
            market_cell.append(market_anchor);
            return market_cell;
        },
        create_planner_table_body_cell_export: function (build_target) {
            const export_cell = document.createElement('td');
            const export_anchor = document.createElement('a');
            export_anchor.id = Helper.get_id([build_target.id, 'export']);
            export_anchor.href = "#";
            export_anchor.innerText = i18n.LABEL.export;
            export_cell.style.textAlign = 'center';
            export_cell.append(export_anchor);
            return export_cell;
        },
        get_build_targets: function () {
            const build_targets = mobile
                ? HermitowskiPlanerBudowy.get_build_targets_mobile()
                : HermitowskiPlanerBudowy.get_build_targets_desktop();

            build_targets.push({
                name: i18n.LABEL.snob,
                id: 'snob',
                wood: 40000,
                stone: 50000,
                iron: 50000
            });

            if (HermitowskiPlanerBudowy.world_info.config.snob.gold === "1") {
                const coin_cost_factor = Number(HermitowskiPlanerBudowy.world_info.config.snob.factor);
                build_targets.push({
                    name: i18n.LABEL.coin,
                    id: 'coin',
                    wood: Number(HermitowskiPlanerBudowy.world_info.config.snob.coin_wood) * coin_cost_factor,
                    stone: Number(HermitowskiPlanerBudowy.world_info.config.snob.coin_stone) * coin_cost_factor,
                    iron: Number(HermitowskiPlanerBudowy.world_info.config.snob.coin_iron) * coin_cost_factor,
                });
            }

            HermitowskiPlanerBudowy.build_targets = build_targets;
        },
        get_build_targets_desktop: function () {
            const build_targets = [];
            const build_rows = document.querySelectorAll('[id^=main_buildrow]');
            for (const build_row of build_rows) {
                if (build_row.cells.length !== 7) {
                    continue;
                }
                const building_info = BuildingMain.buildings[build_row.id.split('_').pop()];
                build_target = {
                    name: build_row.cells[0].children[1].innerText.replace(/\s/, '\xa0'),
                    description: i18n.LABEL.building_level.replace('__0__', building_info.level_next),
                    id: build_row.id,
                    is_building: true,
                    build_time: building_info.build_time
                };
                for (const resource of HermitowskiPlanerBudowy.resources) {
                    build_target[resource] = Number(build_row.querySelector(`.cost_${resource}`).dataset['cost']);
                }
                build_targets.push(build_target);
            }
            return build_targets;
        },
        get_build_targets_mobile: function () {
            const build_targets = [];
            const build_rows = document.querySelectorAll('[id^=main_buildrow]');
            for (const build_row of build_rows) {
                if (Array.from(build_row.querySelectorAll('p')).length === 1) {
                    continue;
                }
                const building_info = BuildingMain.buildings[build_row.id.split('_').pop()];
                build_target = {
                    name: build_row.querySelector('a').innerText.split('(')[0],
                    description: i18n.LABEL.building_level.replace('__0__', building_info.level_next),
                    id: build_row.id,
                    is_building: true,
                    build_time: building_info.build_time
                };
                for (const resource of HermitowskiPlanerBudowy.resources) {
                    build_target[resource] = Number(build_row.querySelector(`.cost_${resource}`).dataset['cost']);
                }
                build_targets.push(build_target);
            }
            return build_targets;
        },
        calculate_trades: function () {
            const resource_options = {};
            for (const resource of HermitowskiPlanerBudowy.resources) {
                resource_options[resource] = {
                    buy: Helper.get_control([resource, 'buy']).checked,
                    sell: Helper.get_control([resource, 'sell']).checked,
                    additional: Number(Helper.get_control([resource, 'additional']).value),
                    max_trade: Helper.get_control([resource, 'max_trade']).value.length == 0
                        ? null
                        : Number(Helper.get_control([resource, 'max_trade']).value)
                };
            }
            for (const build_target of HermitowskiPlanerBudowy.build_targets) {
                const current_time = HermitowskiPlanerBudowy.calculate_trade_current_time(build_target, resource_options);
                const optimal_time = HermitowskiPlanerBudowy.calculate_trade_optimal_time(build_target, resource_options, current_time);

                HermitowskiPlanerBudowy.update_duration(build_target, 'current', current_time);
                HermitowskiPlanerBudowy.update_duration(build_target, 'optimal', optimal_time);

                HermitowskiPlanerBudowy.highlight_building(build_target);

                for (const resource of HermitowskiPlanerBudowy.resources) {
                    Helper.get_control([build_target.id, resource, 'current']).innerText =
                        Math.round(HermitowskiPlanerBudowy.get_village_resources(resource, current_time) - build_target[resource] + resource_options[resource].additional);
                    Helper.get_control([build_target.id, resource, 'optimal']).innerText =
                        Math.round(HermitowskiPlanerBudowy.get_village_resources(resource, optimal_time) - build_target[resource] + resource_options[resource].additional);
                }
            }
        },
        update_duration: function (build_target, time_type, duration) {
            const control = Helper.get_control([build_target.id, time_type]);
            control.innerText = Helper.get_duration_text(duration);
            control.title = new Date(now + duration * 1000).toLocaleString();
        },
        highlight_building: function (build_target) {
            if (build_target.build_time) {
                let production_sum = 0;
                let building_total_cost = 0;
                for (const resource of HermitowskiPlanerBudowy.resources) {
                    production_sum += HermitowskiPlanerBudowy.get_production_rate(resource, HermitowskiPlanerBudowy.build_queue_time);
                    building_total_cost += build_target[resource];
                }

                const time_gained = build_target.build_time - (building_total_cost / production_sum);
                const prefix = time_gained > 0 ? '+' : '-';

                const control = Helper.get_control([build_target.id, 'name']);
                control.title = `${prefix}${Helper.get_duration_text(Math.abs(time_gained))}`;
                control.style.color = time_gained > 0
                    ? 'green'
                    : 'unset';
            }
        },
        calculate_trade_current_time: function (build_target, resource_options) {
            const current_times = [];
            for (const resource of HermitowskiPlanerBudowy.resources) {
                current_times.push((build_target[resource] - game_data.village[`${resource}_float`]) / game_data.village[`${resource}_prod`]);
            }

            let current_time = Math.ceil(Math.max(...current_times, 0));

            const is_time_doable = function (time) {
                return HermitowskiPlanerBudowy.resources.map(resource => {
                    const village_resources = HermitowskiPlanerBudowy.get_village_resources(resource, time) + resource_options[resource].additional;
                    return (village_resources - build_target[resource]) >= 0;
                }).every(x => x);
            };

            let low = build_target.is_building
                ? HermitowskiPlanerBudowy.build_queue_time
                : 0;
            let high = current_time;
            while (high - low > 1) {
                current_time = low + (high - low) / 2;
                if (is_time_doable(current_time)) {
                    high = current_time;
                } else {
                    low = current_time;
                }
            }

            return current_time;
        },
        calculate_trade_optimal_time: function (build_target, resource_options, current_time) {
            const is_time_doable = function (time) {
                let total_needs = 0;
                let total_surplus = 0;
                let total_buy_capacity = 0;

                for (const resource of HermitowskiPlanerBudowy.resources) {
                    const village_resources = HermitowskiPlanerBudowy.get_village_resources(resource, time) + resource_options[resource].additional;
                    const need = build_target[resource] - village_resources;

                    if (need > 0) {
                        total_needs += need;
                        if (resource_options[resource].buy) {
                            total_buy_capacity += resource_options[resource].max_trade === null
                                ? need
                                : Math.min(need, resource_options[resource].max_trade);
                        }
                    }

                    if (need < 0 && resource_options[resource].sell) {
                        total_surplus += resource_options[resource].max_trade === null
                            ? -need
                            : Math.min(-need, resource_options[resource].max_trade);
                    }
                }
                return total_surplus >= total_needs && total_buy_capacity >= total_needs;
            };

            if (is_time_doable(HermitowskiPlanerBudowy.build_queue_time)) {
                return HermitowskiPlanerBudowy.build_queue_time;
            }

            let low = build_target.is_building
                ? HermitowskiPlanerBudowy.build_queue_time
                : 0;
            let high = optimal_time = current_time;
            while (high - low > 1) {
                optimal_time = low + (high - low) / 2;
                if (is_time_doable(optimal_time)) {
                    high = optimal_time;
                } else {
                    low = optimal_time;
                }
            }

            return optimal_time;
        },
        get_build_queue_time: function () {
            let build_queue_time = mobile
                ? HermitowskiPlanerBudowy.get_build_queue_time_mobile()
                : HermitowskiPlanerBudowy.get_build_queue_time_desktop();
            if (build_queue_time) {
                const matches = build_queue_time.match(/(dzisiaj|jutro) o (.*)/);
                const parts = matches[2].split(':').map(Number);
                const now = new Date();
                const finished_at = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate() + (matches[1] === "dzisiaj" ? 0 : 1),
                    parts[0],
                    parts[1],
                    parts[2],
                );
                build_queue_time = (finished_at.getTime() - now.getTime()) / 1000;
            }
            HermitowskiPlanerBudowy.build_queue_time = build_queue_time;
        },
        get_build_queue_time_desktop: function () {
            const build_orders = document.querySelectorAll('[class*="buildorder"]');
            let build_queue_time = 0;
            if (build_orders.length) {
                const last_order = build_orders[build_orders.length - 1];
                return last_order.cells[2].innerText;
            }
            return build_queue_time;
        },
        get_build_queue_time_mobile: function () {
            const build_orders = document.querySelectorAll('#buildqueue_wrap .queueItem > div > div > div:nth-child(2)')
            let build_queue_time = 0;
            if (build_orders.length) {
                const last_order = build_orders[build_orders.length - 1];
                return last_order.innerText.split('-')[1];
            }
            return build_queue_time;
        },
        add_handlers: function () {
            const controls = ['buy', 'sell', 'additional', 'max_trade'];
            for (const resource of HermitowskiPlanerBudowy.resources) {
                for (const control_name of controls) {
                    const control = Helper.get_control([resource, control_name]);
                    control.addEventListener('input', function () {
                        HermitowskiPlanerBudowy.calculate_trades();
                        HermitowskiPlanerBudowy.save_settings();
                    });
                }
            }
            for (const build_target of HermitowskiPlanerBudowy.build_targets) {
                const control = Helper.get_control([build_target.id, 'export']);
                control.addEventListener('click', HermitowskiPlanerBudowy.export_text_info);
            }
            for (const resource of HermitowskiPlanerBudowy.resources) {
                for (const control_name of ['additional', 'max_trade']) {
                    const control = Helper.get_control([resource, control_name]);
                    control.addEventListener('paste', function (event) {
                        let data = event.clipboardData.getData('text');
                        if (data && data.length) {
                            data = data.trim();
                            const parts = data.split(/\s+/);
                            let offset = HermitowskiPlanerBudowy.resources.indexOf(resource);
                            const length = Math.min(HermitowskiPlanerBudowy.resources.length, parts.length);
                            for (let i = 0; i + offset < length; i++) {
                                Helper.get_control([HermitowskiPlanerBudowy.resources[i + offset], control_name]).value = parts[i].replace(/\./g, '');
                            }
                        }
                        HermitowskiPlanerBudowy.save_settings();
                        HermitowskiPlanerBudowy.calculate_trades();
                        event.preventDefault();
                    });
                }
            }
        },
        export_text_info: function (event) {
            const id_parts = event.target.id.split('.');
            const build_target_id = id_parts[id_parts.length - 2];
            const to_sell = {};
            const to_buy = {};
            for (const resource of HermitowskiPlanerBudowy.resources) {
                const surplus = Number(Helper.get_control([build_target_id, resource, 'optimal']).innerText);
                if (surplus > 0) {
                    to_sell[resource] = surplus;
                } else if (surplus < 0) {
                    to_buy[resource] = -surplus;
                }
            }

            if (Object.keys(to_buy).length) {
                const resource_name = {
                    wood: 'drewna',
                    stone: 'gliny',
                    iron: '\u{17C}elaza'
                }
                let export_text = '';
                export_text += 'Potrzebuj\u0119: ';
                export_text += Object.keys(to_buy).map(resource => `${to_buy[resource]} sztuk ${resource_name[resource]}`).join(", ");
                export_text += '. Oferuj\u0119: ';
                export_text += Object.keys(to_sell).map(resource => `${to_sell[resource]} sztuk ${resource_name[resource]}`).join(", ");

                navigator.clipboard.writeText(export_text).then(function () {
                    UI.SuccessMessage(i18n.LABEL.copied);
                }, Helper.handle_error);
            } else {
                UI.ErrorMessage(i18n.ERROR.nothing_to_buy);
            }
        },
        get_resources_schedule: async function () {
            if (typeof (BuildingMain) !== "undefined") {
                HermitowskiPlanerBudowy.resources_schedule = JSON.parse(JSON.stringify(BuildingMain.res_schedule));
            } else {
                const url = TribalWars.buildURL('GET', 'api', { ajax: 'resources_schedule', id: game_data.village.id });
                const response = await fetch(url);
                HermitowskiPlanerBudowy.resources_schedule = await response.json();
            }
        },
        fix_discrepancy: function () {
            for (const resource of HermitowskiPlanerBudowy.resources) {
                const rates_schedule = HermitowskiPlanerBudowy.resources_schedule.rates.schedules[resource];
                let production_rate = NaN;
                for (const timestamp_str in rates_schedule) {
                    if (Number(timestamp_str) < now / 1000) {
                        production_rate = Number(rates_schedule[timestamp_str]);
                    }
                }
                const amounts = HermitowskiPlanerBudowy.resources_schedule.amounts.schedules[resource];
                let amount = NaN;
                for (const timestamp_str in amounts) {
                    const timestamp = Number(timestamp_str);
                    if (timestamp < now / 1000) {
                        amount = Number(amounts[timestamp_str]) + (now / 1000 - timestamp) * production_rate;
                    }
                }
                const discrepancy = amount - game_data.village[`${resource}_float`];
                for (const key in HermitowskiPlanerBudowy.resources_schedule.amounts.schedules[resource]) {
                    HermitowskiPlanerBudowy.resources_schedule.amounts.schedules[resource][key] -= discrepancy;
                }
            }
        },
        get_production_rate: function (resource, offset_s) {
            const delivery_timestamp = now / 1000 + offset_s;
            const rates_schedule = HermitowskiPlanerBudowy.resources_schedule.rates.schedules[resource];
            let production_rate = game_data.village[`${resource}_prod`];
            for (const timestamp_str in rates_schedule) {
                const timestamp = Number(timestamp_str);
                if (now / 1000 < timestamp && timestamp < delivery_timestamp) {
                    production_rate = Number(rates_schedule[timestamp_str]);
                }
            }
            return production_rate;
        },
        get_village_resources: function (resource, offset_s) {
            const delivery_timestamp = now / 1000 + offset_s;
            const amounts_schedule = HermitowskiPlanerBudowy.resources_schedule.amounts.schedules[resource];
            const production_rate = HermitowskiPlanerBudowy.get_production_rate(resource, offset_s);
            let resource_amount = game_data.village[`${resource}_float`] + (delivery_timestamp - now / 1000) * production_rate;
            for (const timestamp_str in amounts_schedule) {
                const timestamp = Number(timestamp_str);
                if (now / 1000 < timestamp && timestamp < delivery_timestamp) {
                    resource_amount = Number(amounts_schedule[timestamp_str]) + production_rate * (delivery_timestamp - timestamp);
                }
            }
            return resource_amount;
        },
        save_settings: function () {
            const settings = {};
            const inputs = ['additional', 'max_trade'];
            const checkboxes = ['buy', 'sell'];
            for (const resource of HermitowskiPlanerBudowy.resources) {
                settings[resource] = {};
                for (const control_name of inputs) {
                    settings[resource][control_name] = Helper.get_control([resource, control_name]).value;
                }
                for (const control_name of checkboxes) {
                    settings[resource][control_name] = Helper.get_control([resource, control_name]).checked;
                }
            }
            localStorage.setItem(namespace, JSON.stringify(settings));
        },
        load_settings: function () {
            let settings = {};
            const item = localStorage.getItem(namespace);
            if (item !== null) {
                settings = JSON.parse(item);
            } else {
                for (const resource of HermitowskiPlanerBudowy.resources) {
                    settings[resource] = {
                        buy: true,
                        sell: true,
                        additional: null,
                        max_trade: null
                    };
                }
            }
            const inputs = ['additional', 'max_trade'];
            const checkboxes = ['buy', 'sell'];
            for (const resource of HermitowskiPlanerBudowy.resources) {
                for (const control_name of inputs) {
                    Helper.get_control([resource, control_name]).value = settings[resource][control_name];
                }
                for (const control_name of checkboxes) {
                    Helper.get_control([resource, control_name]).checked = settings[resource][control_name];
                }
            }
        },
        get_world_info: async function () {
            HermitowskiPlanerBudowy.world_info = await get_world_info({ configs: ['config'] });
        },
        main: function () {
            $.ajax({
                url: 'https://media.innogamescdn.com/com_DS_PL/skrypty/HermitowskiePlikiMapy.js?_=' + ~~(Date.now() / 9e6),
                dataType: 'script',
                cache: true
            }).then(() => {
                HermitowskiPlanerBudowy.init().catch(Helper.handle_error);
            });
        },
        init: async function () {
            await Promise.all([HermitowskiPlanerBudowy.get_resources_schedule(), HermitowskiPlanerBudowy.get_world_info()]);
            HermitowskiPlanerBudowy.get_build_targets();
            HermitowskiPlanerBudowy.get_build_queue_time();
            HermitowskiPlanerBudowy.fix_discrepancy();
            HermitowskiPlanerBudowy.create_gui();
            HermitowskiPlanerBudowy.create_planner_table();
            HermitowskiPlanerBudowy.load_settings();
            HermitowskiPlanerBudowy.calculate_trades();
            HermitowskiPlanerBudowy.add_handlers();
        },
        build_targets: [],
        resources: ['wood', 'stone', 'iron']
    };

    try {
        HermitowskiPlanerBudowy.main();
    } catch (error) {
        Helper.handle_error(error);
    }
    console.log(`${namespace} | Elapsed time: ${Date.now() - start} [ms]`);
})();