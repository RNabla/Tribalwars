/**
 * Helper for calling resources from Market
 * Created by: Hermitowski
 * Modified on: 23/10/2019 - version 2.0 - initial release
 */

var HermitowskieSurki = {
    idle_time: 0,
    storage_percentage_limit: { 'wood': 100, 'stone': 100, 'iron': 100 },
    resources_safeguard: { 'wood': 0, 'stone': 0, 'iron': 0 }
};
(async function () {
    const start = Date.now();
    const now = start;
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
        main: async function () {
            this.check_screen();
            this.get_user_input();
            this.suppliers = this.get_suppliers();
            this.resources_schedule = await this.get_resources_schedule();
            this.calculate_delivery();
        },
        check_screen: function () {
            if (!document.querySelector('#village_list')) {
                location.href = TribalWars.buildURL('GET', 'market', { mode: 'call' });
                throw i18n.NOT_ON_MARKET;
            }
        },
        get_resources_schedule: async function () {
            const url = TribalWars.buildURL('GET', 'api', { ajax: 'resources_schedule', id: game_data.village.id });
            const response = await fetch(url);
            const content = response.json();
            return content;
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
        get_production_rate: function (resource, delivery_timestamp) {
            const rates_schedule = this.resources_schedule.rates.schedules[resource];
            let production_rate = Number(Object.values(rates_schedule)[0]);
            for (const timestamp in rates_schedule) {
                if (Number(timestamp) < delivery_timestamp) {
                    production_rate = Number(rates_schedule[timestamp]);
                }
            }
            return production_rate;
        },
        get_village_resources: function (resource, delivery_timestamp) {
            const amounts_schedule = this.resources_schedule.amounts.schedules[resource];
            const production_rate = this.get_production_rate(resource, delivery_timestamp);
            let resource_amount = Number(Object.values(amounts_schedule)[0]);
            for (const timestamp in amounts_schedule) {
                if (Number(timestamp) < delivery_timestamp) {
                    resource_amount = Number(amounts_schedule[timestamp]) + production_rate * (delivery_timestamp - Number(timestamp));
                }
            }
            return resource_amount;
        },
        get_suppliers: function () {
            const supply_locations = [...document.querySelector('#village_list').querySelectorAll('.supply_location')];
            if (!supply_locations.filter(x => x.cells[7].children[0].checked).length) {
                supply_locations.forEach(x => {
                    x.cells[7].children[0].click();
                });
            }
            return supply_locations.filter(x => x.cells[7].children[0].checked).map(x => {
                const available_capacity = (Number(x.cells[6].innerText.split('/')[0]) - this.settings.traders_safeguard) * Market.Data.Trader.carry;
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
                return { available_capacity, available_resources, selected_resources, anchors, delivery_time }
            });
        },
        calculate_needs: function (delivery_time) {
            const url_params = new URLSearchParams(location.href);
            const delivery_timestamp = now / 1000 + delivery_time;
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
                        parseInt(game_data.village.storage_max - this.settings.idle_time * this.get_production_rate(resource, delivery_timestamp)),
                    );
                    if (needs[resource] > storage_capacity) {
                        needs[resource] = storage_capacity;
                    }
                }
                needs[resource] -= Math.round(this.get_village_resources(resource, delivery_timestamp));
                if (needs[resource] < 0) {
                    needs[resource] = 0;
                }
            }
            return needs;
        },
        calculate_delivery: function () {
            const url_params = new URLSearchParams(location.href);
            const base_needs = this.calculate_needs(0);
            let max_delivery_time = Math.round(Math.max(...this.resources.map(resource => base_needs[resource] / game_data.village[`${resource}_prod`])));
            let min_delivery_time = url_params.has('delivery_at')
                ? (Number(url_params.get('delivery_at')) - now) / 1000
                : 0;

            while (max_delivery_time - min_delivery_time > 1) {
                const delivery_time = min_delivery_time + (max_delivery_time - min_delivery_time) / 2;
                if (this.select_resources(delivery_time)) {
                    max_delivery_time = delivery_time;
                } else {
                    min_delivery_time = delivery_time;
                }
            }

            this.select_resources(max_delivery_time);
            this.fill_input_fields();
            this.display_info(max_delivery_time);
        },
        select_resources: function (delivery_time) {
            for (const supplier of this.suppliers) {
                for (const resource of this.resources) {
                    supplier.selected_resources[resource] = 0;
                    supplier.selected_capacity = 0;
                }
            }
            const needs = this.calculate_needs(delivery_time);
            const delivery_timestamp = now / 1000 + delivery_time;
            const production_rates = {};
            for (const resource of this.resources) {
                production_rates[resource] = this.get_production_rate(resource, delivery_timestamp);
            }
            let suppliers = this.suppliers.filter(x => x.delivery_time <= delivery_time);

            while (Helper.sum_resources(needs)) {
                const supplier = this.select_supplier(suppliers, needs, production_rates);
                if (!supplier) {
                    break;
                }
                this.select_resources_from_supplier(supplier, needs);
                const needed_resources = this.resources.filter(resource => needs[resource] > 0);
                suppliers = suppliers.filter(x => x.selected_capacity < x.available_capacity && needed_resources.some(resource =>
                    x.selected_resources[resource] < x.available_resources[resource]
                ));
            }

            for (const resource of this.resources) {
                if (needs[resource] > this.settings.trader_capacity_threshold) {
                    return false;
                }
            }
            return true;
        },
        select_supplier: function (suppliers, needs, production_rates) {
            let wait_time = -1;
            let most_valuable_resource = null;
            for (const resource of this.resources) {
                const resource_wait_time = needs[resource] / production_rates[resource];
                if (resource_wait_time > wait_time) {
                    wait_time = resource_wait_time;
                    most_valuable_resource = resource;
                }
            }
            let most_available_resources = -1;
            let best_supplier = null;
            for (const supplier of suppliers) {
                const supplier_available_resources = supplier.available_resources[most_valuable_resource] - supplier.selected_resources[most_valuable_resource];
                if (supplier_available_resources > most_available_resources) {
                    most_available_resources = supplier_available_resources;
                    best_supplier = supplier;
                }
            }
            return best_supplier;
        },
        select_resources_from_supplier: function (supplier, needs) {
            const available_resources = Object.assign({}, supplier.available_resources);
            const selected_resources = {};
            for (const resource of this.resources) {
                available_resources[resource] -= supplier.selected_resources[resource];
                selected_resources[resource] = 0;
            }

            let available_traders_capacity = Math.min(supplier.available_capacity - supplier.selected_capacity, Market.Data.Trader.carry);

            let supplier_capacity = Math.min(Helper.sum_resources(available_resources), available_traders_capacity);

            while (supplier_capacity > 0) {
                const scaled_resources = Helper.scale_resources(available_resources, supplier_capacity);

                for (const resource of this.resources) {
                    if (scaled_resources[resource] + selected_resources[resource] > needs[resource]) {
                        scaled_resources[resource] = needs[resource] - selected_resources[resource];
                    }
                    selected_resources[resource] += scaled_resources[resource];
                    available_resources[resource] -= scaled_resources[resource];
                    if (needs[resource] == selected_resources[resource]) {
                        available_resources[resource] = 0;
                    }
                    supplier.selected_capacity += scaled_resources[resource];
                    available_traders_capacity -= scaled_resources[resource];
                }

                supplier_capacity = Math.min(Helper.sum_resources(available_resources), available_traders_capacity);
            }

            const selected_sum = Helper.sum_resources(selected_resources);

            if (selected_sum > 0 && selected_sum % Market.Data.Trader.carry < this.settings.trader_capacity_threshold) {
                const target_transport = Math.floor(selected_sum / Market.Data.Trader.carry) * Market.Data.Trader.carry;
                selected_resources = Helper.scale_resources(selected_resources, target_transport);
            }
            for (const resource of this.resources) {
                needs[resource] -= selected_resources[resource];
                supplier.selected_resources[resource] += selected_resources[resource];
            }
        },
        fill_input_fields: function () {
            for (const supplier of this.suppliers) {
                for (const resource of this.resources) {
                    supplier.anchors[resource].value = supplier.selected_resources[resource];
                }
            }
        },
        display_info: function (delivery_time) {
            const delivery_date = new Date(now + delivery_time * 1000);
            UI.SuccessMessage(i18n.DELIVERY_TIME
                .replace('__DAY__', Helper.two_digit(delivery_date.getDate()))
                .replace('__MONTH__', Helper.two_digit(delivery_date.getMonth() + 1))
                .replace('__HOURS__', Helper.two_digit(delivery_date.getHours()))
                .replace('__MINUTES__', Helper.two_digit(delivery_date.getMinutes())));
        }
    };

    try { await ResourceCaller.main(); } catch (ex) { Helper.handle_error(ex); }
    console.log(`${namespace} | Elapsed time: ${Date.now() - start} [ms]`);
})();
