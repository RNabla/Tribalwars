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
    const i18n = {
        ERROR_MESSAGE: 'Komunikat o b\u{142}\u{119}dzie: ',
        FORUM_THREAD: 'Link do w\u{105}tku na forum',
        FORUM_THREAD_HREF: 'https://forum.plemiona.pl/index.php?threads/Hermitowski.126840/',
        LABEL: {
            building: 'Budynek',
            wood: 'Drewno',
            stone: 'Glina',
            iron: '\u017Belazo',
            time: 'Czas',
            market: 'Rynek',
            call: 'Wezwij',
            export: 'Export',
            building_level: 'Poziom __0__',
            snob: 'Szlachcic',
            coin: 'Z\u{142}ota moneta',
            copied: 'Skopiowano do schowka',
            DESKTOP: {
                buy: 'Kupno',
                sell: 'Sprzeda\u{17C}',
                additional_resources: '+ surowce',
                additional_consumption: '- produkcja',
                max_trade: 'Max wymiana',
            },
            MOBILE: {
                buy: 'Buy',
                sell: 'Sell',
                additional_resources: 'res',
                additional_consumption: 'prod',
                max_trade: 'trade',
            }
        },
        MESSAGE: {
            consumption_greater_than_production: 'Wydajesz wi\u{119}cej ni\u{17C} wydobywasz'
        },
    };

    const Helper = {
        two_digit: function (value) {
            return value > 9
                ? `${value}`
                : `0${value}`;
        },
        get_duration_text: function (duration /* in seconds */) {
            if (!isFinite(duration)) { return duration; }
            duration = parseInt(duration);
            const seconds = duration % 60;
            duration = (duration - seconds) / 60;
            const minutes = duration % 60;
            duration = (duration - minutes) / 60;
            if (duration > 100) { return '99:99:99+'; }
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
            const gui = `
                <h2>WTF - What a Terrible Failure</h2>
                <p><strong>${i18n.ERROR_MESSAGE}</strong><br/>
                    <textarea rows='5' cols='42'>${error}\n\n${error.stack}</textarea><br/>
                    <a href='${i18n.FORUM_THREAD_HREF}'>${i18n.FORUM_THREAD}</a>
                </p>
            `;
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
                    document.querySelector(`#popup_box_${Helper.get_id()}`.replace(/\./g, '\\.')).style.maxWidth = '90vw';
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
                    for (const checkbox_name of HermitowskiPlanerBudowy.user_checkboxes) {
                        const span = document.createElement('span');
                        span.style.whiteSpace = 'nowrap';
                        const label = document.createElement('label');
                        label.textContent = mobile
                            ? i18n.LABEL.MOBILE[checkbox_name]
                            : i18n.LABEL.DESKTOP[checkbox_name];
                        label.setAttribute('for', Helper.get_id([column.res, checkbox_name]));
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.id = Helper.get_id([column.res, checkbox_name]);
                        checkbox.checked = true;
                        span.append(checkbox);
                        span.append(label);
                        thead_cell.append(span);
                        thead_cell.append(document.createElement('br'));
                    }
                    for (const input_name of HermitowskiPlanerBudowy.user_inputs) {
                        const input = document.createElement('input');
                        input.id = Helper.get_id([column.res, input_name]);
                        input.size = mobile
                            ? 5
                            : 10;
                        input.placeholder = mobile
                            ? i18n.LABEL.MOBILE[input_name]
                            : i18n.LABEL.DESKTOP[input_name];;
                        input.title = input_name;
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
                    cell.style.whiteSpace = 'nowrap';
                }
            }
            if (options.id) {
                cell.id = Helper.get_id(options.id);
            }
            return cell;
        },
        create_planner_table_body_cell_resource: function (target_id, resource_name, time_type) {
            const cell = document.createElement('td');
            const text_span = document.createElement('span');
            text_span.id = Helper.get_id([target_id, resource_name, time_type]);
            cell.append(text_span);
            const icon_span = document.createElement('span');
            icon_span.classList.add('icon', 'header', resource_name);
            icon_span.title = resource_name;
            icon_span.style.marginLeft = '0.5em';
            cell.append(icon_span);
            cell.style.textAlign = 'right';
            return cell;
        },
        create_planner_table_body_cell_market: function (build_target) {
            const market_cell = document.createElement('td');
            const market_anchor = document.createElement('a');
            let params = { mode: 'call' };
            for (const resource of HermitowskiPlanerBudowy.resources) {
                params[resource] = build_target[resource];
            }
            if (HermitowskiPlanerBudowy.build_queue_timestamp) {
                params['delivery_at'] = HermitowskiPlanerBudowy.build_queue_timestamp;
            }
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
                    name: build_row.cells[0].children[1].innerText,
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
        get_build_queue_timestamp: function () {
            let build_queue_timestamp = mobile
                ? HermitowskiPlanerBudowy.get_build_queue_timestamp_mobile()
                : HermitowskiPlanerBudowy.get_build_queue_timestamp_desktop();
            if (build_queue_timestamp) {
                const matches = build_queue_timestamp.match(/(dzisiaj|jutro) o (.*)/);
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
                return finished_at.getTime();
            }
            return null;
        },
        get_build_queue_timestamp_desktop: function () {
            const build_orders = document.querySelectorAll('[class*="buildorder"]');
            if (build_orders.length > 0) {
                const last_order = build_orders[build_orders.length - 1];
                let offset = 2;
                if (BuildingMain.order_count > 2) {
                    offset += 1;
                }
                return last_order.cells[last_order.cells.length - offset].innerText;
            }
            return null;
        },
        get_build_queue_timestamp_mobile: function () {
            const build_orders = document.querySelectorAll('#buildqueue_wrap .queueItem > div > div > div:nth-child(2)')
            if (build_orders.length > 0) {
                const last_order = build_orders[build_orders.length - 1];
                return last_order.innerText.split('-')[1];
            }
            return null;
        },
        get_resource_options: function () {
            const resource_options = {};
            for (const resource of HermitowskiPlanerBudowy.resources) {
                resource_options[resource] = {
                    buy: Helper.get_control([resource, 'buy']).checked,
                    sell: Helper.get_control([resource, 'sell']).checked,
                    additional_resources: Number(Helper.get_control([resource, 'additional_resources']).value),
                    additional_consumption: Number(Helper.get_control([resource, 'additional_consumption']).value) / 3600,
                    max_trade: Helper.get_control([resource, 'max_trade']).value.length == 0
                        ? null
                        : Number(Helper.get_control([resource, 'max_trade']).value)
                };
            }
            return resource_options;
        },
        init_context: function () {
            HermitowskiPlanerBudowy.calculation_timestamp = Date.now();
            HermitowskiPlanerBudowy.build_queue_time = HermitowskiPlanerBudowy.build_queue_timestamp
                ? (HermitowskiPlanerBudowy.build_queue_timestamp - HermitowskiPlanerBudowy.calculation_timestamp) / 1000
                : 0;
            HermitowskiPlanerBudowy.resource_options = HermitowskiPlanerBudowy.get_resource_options();
        },
        calculate_trades: function () {
            HermitowskiPlanerBudowy.init_context();
            for (const build_target of HermitowskiPlanerBudowy.build_targets) {
                const current_time = HermitowskiPlanerBudowy.calculate_trade_current_time(build_target);
                const optimal_time = HermitowskiPlanerBudowy.calculate_trade_optimal_time(build_target, current_time);

                HermitowskiPlanerBudowy.update_duration(build_target, 'current', current_time);
                HermitowskiPlanerBudowy.update_duration(build_target, 'optimal', optimal_time);

                HermitowskiPlanerBudowy.highlight_building(build_target);

                for (const resource of HermitowskiPlanerBudowy.resources) {
                    Helper.get_control([build_target.id, resource, 'current']).innerText =
                        Math.round(HermitowskiPlanerBudowy.get_village_resources(resource, current_time) - build_target[resource]);
                    Helper.get_control([build_target.id, resource, 'optimal']).innerText =
                        Math.round(HermitowskiPlanerBudowy.get_village_resources(resource, optimal_time) - build_target[resource]);
                }
            }
        },
        calculate_trade_current_time: function (build_target) {
            const current_times = [];
            for (const resource of HermitowskiPlanerBudowy.resources) {
                const current_resource_amount = HermitowskiPlanerBudowy.get_village_resources(resource, 0);
                const current_resource_production = HermitowskiPlanerBudowy.get_production_rate(resource, 0);
                if (build_target[resource] > current_resource_amount && current_resource_production <= 0) {
                    current_times.push(NaN);
                } else {
                    current_times.push((build_target[resource] - current_resource_amount) / current_resource_production);
                }
            }

            let current_time = Math.ceil(Math.max(...current_times, 0));

            if (!isFinite(current_time)) { return current_time; }

            const is_time_doable = function (time) {
                return HermitowskiPlanerBudowy.resources.map(resource => {
                    const village_resources = HermitowskiPlanerBudowy.get_village_resources(resource, time);
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
        calculate_trade_optimal_time: function (build_target, current_time) {
            const is_time_doable = function (time) {
                let total_needs = 0;
                let total_surplus = 0;
                let total_buy_capacity = 0;

                for (const resource of HermitowskiPlanerBudowy.resources) {
                    const village_resources = HermitowskiPlanerBudowy.get_village_resources(resource, time);
                    const need = build_target[resource] - village_resources;

                    if (need > 0) {
                        total_needs += need;
                        if (HermitowskiPlanerBudowy.resource_options[resource].buy) {
                            total_buy_capacity += HermitowskiPlanerBudowy.resource_options[resource].max_trade === null
                                ? need
                                : Math.min(need, HermitowskiPlanerBudowy.resource_options[resource].max_trade);
                        }
                    }

                    if (need < 0 && HermitowskiPlanerBudowy.resource_options[resource].sell) {
                        total_surplus += HermitowskiPlanerBudowy.resource_options[resource].max_trade === null
                            ? -need
                            : Math.min(-need, HermitowskiPlanerBudowy.resource_options[resource].max_trade);
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
            let high = optimal_time = (isFinite(current_time)
                ? current_time
                : 100 * 3600
            );

            let production_sum = 0;
            let resources_needed = 0;
            for (const resource of HermitowskiPlanerBudowy.resources) {
                production_sum += HermitowskiPlanerBudowy.get_production_rate(resource, 0);
                resources_needed += build_target[resource] - HermitowskiPlanerBudowy.get_village_resources(resource, 0);
            }

            if (resources_needed > 0 && production_sum <= 0) { return NaN; }

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
        update_duration: function (build_target, time_type, duration) {
            const control = Helper.get_control([build_target.id, time_type]);
            control.innerText = Helper.get_duration_text(duration);
            control.title = new Date(HermitowskiPlanerBudowy.calculation_timestamp + duration * 1000).toLocaleString();
        },
        highlight_building: function (build_target) {
            if (build_target.build_time) {
                let production_sum = 0;
                let building_total_cost = 0;
                for (const resource of HermitowskiPlanerBudowy.resources) {
                    production_sum += HermitowskiPlanerBudowy.get_production_rate(resource, HermitowskiPlanerBudowy.resource_options, HermitowskiPlanerBudowy.build_queue_time);
                    building_total_cost += build_target[resource];
                }

                if (production_sum > 0) {
                    const time_gained = build_target.build_time - (building_total_cost / production_sum);
                    const prefix = time_gained > 0 ? '+' : '-';

                    const control = Helper.get_control([build_target.id, 'name']);
                    control.title = `${prefix}${Helper.get_duration_text(Math.abs(time_gained))}`;
                    control.style.color = time_gained > 0
                        ? 'green'
                        : 'unset';
                } else {
                    const control = Helper.get_control([build_target.id, 'name']);
                    control.title = i18n.MESSAGE.consumption_greater_than_production;
                    control.style.color = 'unset';
                }
            }
        },
        add_handlers: function () {
            const controls = ['buy', 'sell', 'additional_resources', 'additional_consumption', 'max_trade'];
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
                for (const control_name of ['additional_resources', 'additional_consumption', 'max_trade']) {
                    const control = Helper.get_control([resource, control_name]);
                    control.addEventListener('paste', function (event) {
                        let text = event.clipboardData.getData('text');
                        if (text && text.length) {
                            text = text.trim();
                            const parts = text.split(/\s+/);
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

            const resource_name = {
                wood: 'drewna',
                stone: 'gliny',
                iron: '\u{17C}elaza'
            }
            let export_parts = [];
            if (Object.keys(to_buy).length) {
                export_parts.push(
                    'Potrzebuj\u0119: ' +
                    Object.keys(to_buy).map(resource => `${to_buy[resource]} sztuk ${resource_name[resource]}`).join(", ")
                );
            }
            if (Object.keys(to_sell).length) {
                export_parts.push(
                    'Oferuj\u0119: ' +
                    Object.keys(to_sell).map(resource => `${to_sell[resource]} sztuk ${resource_name[resource]}`).join(", ")
                );
            }

            navigator.clipboard.writeText(export_parts.join(". ")).then(function () {
                UI.SuccessMessage(i18n.LABEL.copied);
            }, Helper.handle_error);
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
            const now = Date.now() / 1000;
            for (const resource of HermitowskiPlanerBudowy.resources) {
                const rates_schedule = HermitowskiPlanerBudowy.resources_schedule.rates.schedules[resource];
                let production_rate = NaN;
                for (const timestamp_str in rates_schedule) {
                    if (Number(timestamp_str) < now) {
                        production_rate = Number(rates_schedule[timestamp_str]);
                    }
                }
                const amounts = HermitowskiPlanerBudowy.resources_schedule.amounts.schedules[resource];
                let amount = NaN;
                for (const timestamp_str in amounts) {
                    const timestamp = Number(timestamp_str);
                    if (timestamp < now) {
                        amount = Number(amounts[timestamp_str]) + (now - timestamp) * production_rate;
                    }
                }
                const discrepancy = amount - game_data.village[`${resource}_float`];
                for (const key in HermitowskiPlanerBudowy.resources_schedule.amounts.schedules[resource]) {
                    HermitowskiPlanerBudowy.resources_schedule.amounts.schedules[resource][key] -= discrepancy;
                }
            }
        },
        get_production_rate: function (resource, offset_s) {
            const calculation_timestamp_s = HermitowskiPlanerBudowy.calculation_timestamp / 1000;
            const delivery_timestamp_s = calculation_timestamp_s + offset_s;
            const rates_schedule = HermitowskiPlanerBudowy.resources_schedule.rates.schedules[resource];
            let production_rate = game_data.village[`${resource}_prod`];
            for (const timestamp_str in rates_schedule) {
                const timestamp_s = Number(timestamp_str);
                if (calculation_timestamp_s < timestamp_s && timestamp_s < delivery_timestamp_s) {
                    production_rate = Number(rates_schedule[timestamp_str]);
                }
            }
            return production_rate - HermitowskiPlanerBudowy.resource_options[resource].additional_consumption;
        },
        get_village_resources: function (resource, offset_s) {
            const calculation_timestamp_s = HermitowskiPlanerBudowy.calculation_timestamp / 1000;
            const delivery_timestamp_s = calculation_timestamp_s + offset_s;
            const amounts_schedule = HermitowskiPlanerBudowy.resources_schedule.amounts.schedules[resource];
            const production_rate = HermitowskiPlanerBudowy.get_production_rate(resource, HermitowskiPlanerBudowy.resource_options, offset_s);
            let resource_amount = game_data.village[`${resource}_float`] + (delivery_timestamp_s - calculation_timestamp_s) * production_rate;
            for (const timestamp_str in amounts_schedule) {
                const timestamp_s = Number(timestamp_str);
                if (calculation_timestamp_s < timestamp_s && timestamp_s < delivery_timestamp_s) {
                    resource_amount = Number(amounts_schedule[timestamp_str]) + production_rate * (delivery_timestamp_s - timestamp_s);
                }
            }
            return resource_amount + HermitowskiPlanerBudowy.resource_options[resource].additional_resources;
        },
        save_settings: function () {
            const settings = {};
            for (const resource of HermitowskiPlanerBudowy.resources) {
                settings[resource] = {};
                for (const control_name of HermitowskiPlanerBudowy.user_inputs) {
                    settings[resource][control_name] = Helper.get_control([resource, control_name]).value;
                }
                for (const control_name of HermitowskiPlanerBudowy.user_checkboxes) {
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
                    settings[resource] = {};
                    for (const control_name of HermitowskiPlanerBudowy.user_checkboxes) {
                        settings[resource][control_name] = true;
                    }
                    for (const control_name of HermitowskiPlanerBudowy.user_inputs) {
                        settings[resource][control_name] = null;
                    }
                }
            }
            for (const resource of HermitowskiPlanerBudowy.resources) {
                for (const control_name of HermitowskiPlanerBudowy.user_inputs) {
                    Helper.get_control([resource, control_name]).value = settings[resource][control_name];
                }
                for (const control_name of HermitowskiPlanerBudowy.user_checkboxes) {
                    Helper.get_control([resource, control_name]).checked = settings[resource][control_name];
                }
            }
        },
        get_world_info: async function () {
            await $.ajax({
                url: 'https://media.innogamescdn.com/com_DS_PL/skrypty/HermitowskiePlikiMapy.js?_=' + ~~(Date.now() / 9e6),
                dataType: 'script',
                cache: true
            });
            HermitowskiPlanerBudowy.world_info = await get_world_info({ configs: ['config'] });
        },
        main: async function () {
            await Promise.all([HermitowskiPlanerBudowy.get_resources_schedule(), HermitowskiPlanerBudowy.get_world_info()]);
            HermitowskiPlanerBudowy.build_queue_timestamp = HermitowskiPlanerBudowy.get_build_queue_timestamp();
            HermitowskiPlanerBudowy.get_build_targets();
            HermitowskiPlanerBudowy.fix_discrepancy();
            HermitowskiPlanerBudowy.create_gui();
            HermitowskiPlanerBudowy.create_planner_table();
            HermitowskiPlanerBudowy.load_settings();
            HermitowskiPlanerBudowy.calculate_trades();
            HermitowskiPlanerBudowy.add_handlers();
        },
        build_targets: [],
        resources: ['wood', 'stone', 'iron'],
        user_inputs: ['additional_resources', 'additional_consumption', 'max_trade'],
        user_checkboxes: ['buy', 'sell'],
        build_queue_timestamp: null,
        build_queue_time: null,
        calculation_timestamp: null,
    };

    try {
        await HermitowskiPlanerBudowy.main();
    } catch (error) {
        Helper.handle_error(error);
    }
    console.log(`${namespace} | Elapsed time: ${Date.now() - start} [ms]`);
})();