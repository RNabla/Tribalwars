/**
 * Helper for calling resources from Market
 * Created by: Hermitowski
 * Modified on: 23/10/2018 - version 2.0 - initial release
 */

(function () {
    const start = Date.now();
    const namespace = 'Hermitowski.ResourceCaller';
    const i18n = {
        NOTHING_NEEDED: 'Wygl\u{105}da na to, \u{17C}e niczego nie potrzeba',
        NOT_ON_MARKET: 'Nie jeste\u{15B} na rynku.',
        DELIVERY_TIME: 'Surowce b\u{119}d\u{105} dost\u{119}pne __DAY__.__MONTH__ o __HOURS__:__MINUTES__',
    };
    const Helper = {
        two_digit: function (value) {
            return value > 9
                ? `${value}`
                : `0${value}`;
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
        sum_resources: function (resources_obj) {
            return Object.values(resources_obj).reduce((cv, pv) => cv + pv);
        },
        normalize_resource: function (resources_obj) {
            const sum = Helper.sum_resources(resources_obj);
            const result = {};
            for (const resource in resources_obj) {
                result[resource] = resources_obj[resource] / sum;
            }
            return result;
        },
        scale_resources: function (resources_obj, scale) {
            const sum = Helper.sum_resources(resources_obj);
            const result = {};
            for (const resource in resources_obj) {
                result[resource] = resources_obj[resource] / sum * scale;
            }
            return Helper.round_resources(result, scale);
        },
        round_resources: function (resources_obj, target_sum) {
            const whole_parts = {};
            const fractions = {};
            for (const resource in resources_obj) {
                whole_parts[resource] = Math.floor(resources_obj[resource]);
                fractions[resource] = resources_obj[resource] - whole_parts[resource];
            }
            let buffer = target_sum - Helper.sum_resources(whole_parts);
            while (buffer > 0) {
                const max_resource = Object.keys(fractions).reduce((a, b) => fractions[a] > fractions[b] ? a : b);
                whole_parts[max_resource] += 1;
                fractions[max_resource] -= 1;
                buffer -= 1;
            }
            return whole_parts;
        },
    };
    const ResourceCaller = {
        resources: ['wood', 'stone', 'iron'],
        settings: {
            target_resources: {
                'wood': 28000,
                'stone': 30000,
                'iron': 25000
            },
            storage_percentage_limit: {
                'wood': 95,
                'stone': 95,
                'iron': 95
            },
            resources_safeguard: {
                'wood': 28000,
                'stone': 30000,
                'iron': 25000
            },
            delta: {
                'wood': 0,
                'stone': 0,
                'iron': 0
            },
            trim_to_storage_capacity: true,
            traders_safeguard: 0,
            idle_time: 5,
            trader_capacity_threshold: 0
        },
        main: function () {
            this.check_screen();
            this.get_user_input();
            const needs = this.calculate_needs();
            if (Helper.sum_resources(needs) == 0) {
                UI.SuccessMessage(i18n.NOTHING_NEEDED);
                return;
            }
            const suppliers = this.get_suppliers();
            this.calculate_delivery(needs, suppliers);
        },
        check_screen: function () {
            if (!document.querySelector('#village_list')) {
                location.href = TribalWars.buildURL('GET', 'market', { mode: 'call' });
                throw i18n.NOT_ON_MARKET;
            }
        },
        get_user_input: function () {
            if (typeof (HermitowskieSurki) !== "undefined") {
                for (const key in this.settings) {
                    if (HermitowskieSurki.hasOwnProperty(key)) {
                        this.settings[key] = HermitowskieSurki[key];
                    }
                }
            }
        },
        calculate_needs: function () {
            const url_params = new URLSearchParams(location.href);
            const needs = {}
            for (const resource of this.resources) {
                needs[resource] = this.settings.target_resources[resource];
                if (url_params.has(resource)) {
                    needs[resource] = Number(url_params.get(resource));
                    needs[resource] += this.settings.delta[resource];
                }
                if (this.settings.trim_to_storage_capacity) {
                    let storage_capacity = Math.min(
                        parseInt(game_data.village.storage_max * this.settings.storage_percentage_limit[resource] / 100),
                        parseInt(game_data.village.storage_max - this.settings.idle_time * game_data.village[`${resource}_prod`]),
                    );
                    if (needs[resource] > storage_capacity) {
                        needs[resource] = storage_capacity;
                    }
                }
                needs[resource] -= parseInt(document.querySelector(`#total_${resource}`).innerText.replace('.', ''));
                needs[resource] -= game_data.village[resource];
                if (needs[resource] < 0) {
                    needs[resource] = 0;
                }
            }
            return needs;
        },
        get_suppliers: function () {
            const supply_locations = [...document.querySelector('#village_list').querySelectorAll('.supply_location')];
            if (!supply_locations.filter(x => x.cells[7].children[0].checked).length) {
                supply_locations.forEach(x => {
                    x.cells[7].children[0].click();
                });
            }
            return supply_locations.filter(x => x.cells[7].children[0].checked).map(x => {
                const available_traders = Number(x.cells[6].innerText.split('/')[0]) - this.settings.traders_safeguard;
                const available_resources = {};
                const selected_resources = {};
                const parts = x.cells[1].innerText.split(':').map(x => Number(x));
                const delivery_time = (parts[0] * 60 + parts[1]) * 60 + parts[2];
                const anchors = {};
                for (const resource of this.resources) {
                    const village_resources = Number(x.querySelector(`span.${resource}`).innerText.replace('.', ''))
                    available_resources[resource] = Math.max(village_resources - this.settings.resources_safeguard[resource], 0);
                    anchors[resource] = x.querySelector(`td.${resource}`).children[1];
                }
                return { available_traders, available_resources, selected_resources, anchors, delivery_time }
            });
        },
        calculate_delivery: function (needs, suppliers) {
            const url_params = new URLSearchParams(location.href);
            let max_delivery_time = Math.round(Math.max(...this.resources.map(resource => needs[resource] / game_data.village[`${resource}_prod`])));
            let min_delivery_time = url_params.has('delivery_at')
                ? (Number(url_params.get('delivery_at')) - Date.now()) / 1000
                : 0;

            while (max_delivery_time - min_delivery_time > 1) {
                let delivery_time = min_delivery_time + (max_delivery_time - min_delivery_time) / 2;
                if (this.try_select_resources(needs, suppliers, delivery_time)) {
                    max_delivery_time = delivery_time;
                } else {
                    min_delivery_time = delivery_time;
                }
            }

            this.try_select_resources(needs, suppliers, max_delivery_time);
            this.fill_input_fields(suppliers);
            this.display_info(max_delivery_time);
        },
        calculate_demand: function (needs, delivery_time) {
            const demand = {};
            for (const resource of this.resources) {
                demand[resource] = needs[resource];
                demand[resource] -= Math.round(game_data.village[`${resource}_prod`] * delivery_time);
                if (demand[resource] < 0) {
                    demand[resource] = 0;
                }
            }
            return demand;
        },
        try_select_resources: function (needs, suppliers, delivery_time) {
            const demand = this.calculate_demand(needs, delivery_time);
            for (const supplier of suppliers) {
                for (const resource of this.resources) {
                    supplier.selected_resources[resource] = 0;
                }
            }
            return this.select_resources(demand, suppliers.filter(x => x.delivery_time <= delivery_time));
        },
        select_resources: function (demand, suppliers) {
            for (const supplier of suppliers) {
                const available_resources = Object.assign({}, supplier.available_resources);
                let available_traders_capacity = supplier.available_traders * Market.Data.Trader.carry;

                let supplier_capacity = Math.min(Helper.sum_resources(available_resources), available_traders_capacity);

                while (supplier_capacity > 0) {
                    const scaled_resources = Helper.scale_resources(available_resources, supplier_capacity);

                    for (const resource of this.resources) {
                        if (scaled_resources[resource] + supplier.selected_resources[resource] > demand[resource]) {
                            scaled_resources[resource] = demand[resource] - supplier.selected_resources[resource];
                        }
                        supplier.selected_resources[resource] += scaled_resources[resource];
                        available_resources[resource] -= scaled_resources[resource];
                        if (demand[resource] == supplier.selected_resources[resource]) {
                            available_resources[resource] = 0;
                        }
                        available_traders_capacity -= scaled_resources[resource];
                    }

                    supplier_capacity = Math.min(Helper.sum_resources(available_resources), available_traders_capacity);
                }

                const selected_sum = Helper.sum_resources(supplier.selected_resources);

                if (selected_sum > 0 && selected_sum % Market.Data.Trader.carry < this.settings.trader_capacity_threshold) {
                    const target_transport = Math.floor(selected_sum / Market.Data.Trader.carry) * Market.Data.Trader.carry;
                    supplier.selected_resources = Helper.scale_resources(supplier.selected_resources, target_transport);
                }
                for (const resource of this.resources) {
                    demand[resource] -= supplier.selected_resources[resource];
                }
            }

            for (const resource of this.resources) {
                if (demand[resource] > this.settings.trader_capacity_threshold) {
                    return false;
                }
            }
            return true;
        },
        fill_input_fields: function (suppliers) {
            for (const supplier of suppliers) {
                for (const resource of this.resources) {
                    supplier.anchors[resource].value = supplier.selected_resources[resource];
                }
            }
        },
        display_info: function (delivery_time) {
            const delivery_date = new Date(Date.now() + delivery_time * 1000);
            UI.SuccessMessage(i18n.DELIVERY_TIME
                .replace('__DAY__', Helper.two_digit(delivery_date.getDate()))
                .replace('__MONTH__', Helper.two_digit(delivery_date.getMonth() + 1))
                .replace('__HOURS__', Helper.two_digit(delivery_date.getHours()))
                .replace('__MINUTES__', Helper.two_digit(delivery_date.getMinutes())));
        }
    };

    try { ResourceCaller.main(); } catch (ex) { Helper.handle_error(ex); }
    console.log(`${namespace} | Elapsed time: ${Date.now() - start} [ms]`);
})();
