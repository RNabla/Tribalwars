(function () {
    const HermitowskieSurkiCore = {
        i18n: {
            NOTHING_NEEDED: 'Wygl\u{105}da na to, \u{17C}e niczego nie potrzeba'
        },
        res: ['wood', 'stone', 'iron'],
        total: [0, 0, 0],
        calculatedNeeds: [0, 0, 0],
        needs: [28, 30, 25].map(x => x * 1000),
        delta: [0, 0, 0],
        clipToMaxStorage: true,
        storagePercentageLimit: [42, 42, 42],
        storageLimit: [15, 15, 15].map(x => x * 1000),
        idleTime: 15,
        resourcesSafeguard: [28, 30, 25].map(x => x * 1000),
        tradersSafeguard: 0,
        perfectTiming: false,
        clipToTraderCapacity: false,
        traderCapacityClippingValue: 0,
        enableAllByDefault: false,
        init: function (config) {
            this.getUserInput(config);
            this.processNeeds();
            this.misc();
            this.process();
        },
        getUserInput: function (config) {
            if (!config) { return; }
            let settings = ['needs', 'delta', 'clipToMaxStorage', 'storagePercentageLimit',
                'storageLimit', 'idleTime', 'resourcesSafeguard', 'tradersSafeguard',
                'perfectTiming', 'clipToTraderCapacity', 'traderCapacityClippingValue', 'enableAllByDefault'];
            for (const setting of settings) {
                if (config[setting]) {
                    this[setting] = config[setting];
                }
            }
        },
        processNeeds: function () {
            let params = new URLSearchParams(location.href);
            let queryResNames = this.res.map(x => `h${x}`);
            for (let i = 0; i < 3; i++) {
                if (params.has(queryResNames[i])) {
                    let need = parseInt(params.get(queryResNames[i]));
                    this.needs[i] = need;
                    this.needs[i] += this.delta[i];
                }
                if (this.clipToMaxStorage) {
                    let maxStorageLimit = Math.min(
                        parseInt(game_data.village.storage_max * this.storagePercentageLimit[i] / 100),
                        parseInt(game_data.village.storage_max - this.idleTime * 60 * game_data.village[`${this.res[i]}_prod`]),
                        this.storageLimit[i]
                    );
                    if (this.needs[i] > maxStorageLimit) { this.needs[i] = maxStorageLimit; }
                }
                this.needs[i] -= parseInt(document.querySelector(`#total_${this.res[i]}`).innerText.replace('.', ''));
                this.needs[i] -= game_data.village[this.res[i]];
                if (this.needs[i] < 0) { this.needs[i] = 0; }
                this.calculatedNeeds[i] = this.needs[i];
            }

        },
        getDurations: function () {
            let humanFormatToDuration = function (humanFormat) {
                let parts = humanFormat.split(':').map(x => parseInt(x));
                return (parts[0] * 60 + parts[1]) * 60 + parts[2];
            }
            return Array.from(document.querySelectorAll(".supply_location"))
                .map(x => humanFormatToDuration(x.children[1].innerText));
        },
        getAvailableResources: function (supplier) {
            let available = [];
            for (let i = 0; i < 3; i++) {
                available.push(Number(supplier.cells[2 + i].children[0].innerText.replace('.', '')));
                available[i] -= this.resourcesSafeguard[i];
                if (available[i] < 0) { available[i] = 0; }
                if (this.needs[i] <= 0) { available[i] = 0; }
            }
            return available;
        },
        getAvailableTraders: function (supplier) {
            return parseInt(supplier.cells[6].innerText.split('/')[0]) - this.tradersSafeguard;
        },
        selectResources: function (supplier, selected) {
            for (let i = 0; i < 3; i++) {
                this.needs[i] -= selected[i];
                this.total[i] += selected[i];
                supplier.cells[2 + i].children[1].value = selected[i];
            }
        },
        updateSelfProduction: function (durations, step) {
            let timePassed = step === 0
                ? durations[0]
                : durations[step] - durations[step - 1];

            for (let i = 0; i < 3; i++) {
                let production = Math.floor(game_data.village[`${this.res[i]}_prod`] * timePassed);
                this.needs[i] -= production;
                if (this.needs[i] < 0) { this.needs[i] = 0; }
            }
        },
        isSupplierSelected: function (supplier) {
            return supplier.cells[7].children[0].checked;
        },
        misc: function () {
            if (this.enableAllByDefault) {
                let checkbox = document.querySelector('[name=select-all]');
                if (!checkbox.checked) {
                    checkbox.click();
                }
            }
        },
        process: function () {
            let suppliers = document.querySelectorAll(".supply_location");
            let durations = this.getDurations();
            for (let k = 0; k < suppliers.length; k++) {
                let supplier = suppliers[k];
                if (this.perfectTiming) { this.updateSelfProduction(durations, k); }
                if (!this.isSupplierSelected(supplier)) { continue; }
                let availableResources = this.getAvailableResources(supplier);
                let availableResourcesSum = this.sum(availableResources);
                let availableTradersCapacity = this.getAvailableTraders(supplier) * 1000;

                let capacity = Math.min(
                    availableTradersCapacity,
                    availableResourcesSum,
                    this.sum(this.needs)
                );

                if (this.clipToTraderCapacity && capacity < this.traderCapacityClippingValue) {
                    capacity = 0;
                }

                let selected = [0, 0, 0];
                let i = 0;

                while (capacity != 0) {
                    let normalized = this.normalize(availableResources, availableResourcesSum)
                        .map(x => x * capacity);

                    let taken = this.clip(normalized, capacity)

                    for (let i = 0; i < 3; i++) {
                        if (selected[i] + taken[i] > this.needs[i]) {
                            taken[i] = this.needs[i] - selected[i];
                        }
                        selected[i] += taken[i];
                        availableResources[i] -= taken[i];
                        availableTradersCapacity -= taken[i];
                        capacity -= taken[i];

                        if (selected[i] + taken[i] >= this.needs[i]) {
                            availableResources[i] = 0;
                        }

                    }

                    availableResourcesSum = this.sum(availableResources);

                    capacity = Math.min(
                        availableTradersCapacity,
                        availableResourcesSum,
                        this.sum(this.needs)
                    );

                    if (i++ == 42) { throw new Error('Capacity does not converge'); }
                }

                if (this.clipToTraderCapacity) {
                    selected = this.clipTransport(selected);
                }

                this.selectResources(supplier, selected);
            }

            CallResources.checkOverflow();
            this.displayMetrics();

        },
        displayMetrics: function () {
            if (this.sum(this.calculatedNeeds) === 0) {
                UI.SuccessMessage(this.i18n.NOTHING_NEEDED);
            }
            console.log('Needs    ', this.calculatedNeeds);
            console.log('Summoned ', this.total);
            console.log('Available in', this.calculateTime(), '[s]');
        },
        calculateTime: function () {
            let time = 0;
            for (let i = 0; i < 3; i++) {
                let diff = this.calculatedNeeds[i] - this.total[i];
                let res_time = diff / game_data.village[`${this.res[i]}_prod`];
                time = Math.max(time, res_time);
            }
            return Math.ceil(time);
        },
        clipTransport: function (transport) {
            let capacity = this.sum(transport);
            if (capacity % 1000 < this.traderCapacityClippingValue) {
                let threshold = parseInt(capacity / 1000) * 1000;
                return this.clip(this.normalize(transport, capacity).map(x => x * threshold), threshold);
            }
            return transport;
        },
        sum: function (array) {
            return array.reduce((pv, cv) => pv + cv);
        },
        normalize: function (array, threshold) {
            return threshold === 0
                ? array
                : array.map(x => x / threshold);
        },
        clip: function (array, threshold) {
            let wholeParts = array.map(x => parseInt(x));
            let fractions = [];
            let buffer = threshold - this.sum(wholeParts);
            for (let i = 0; i < 3; i++) {
                let fraction = array[i] - wholeParts[i];
                fractions.push(fraction);
                let taken = Math.min(buffer, Math.round(fraction));
                wholeParts[i] += taken;
                buffer -= taken;
            }
            if (buffer) {
                wholeParts[this.argmax(fractions)] += buffer;
            }
            return wholeParts;
        },
        argmax: function (array) {
            let max = Math.max(...array);
            return array.indexOf(max);
        }
    }
    try {
        if (typeof (HermitowskieSurki) === "undefined") {
            HermitowskieSurkiCore.init({});
        }
        else {
            HermitowskieSurkiCore.init(HermitowskieSurki);
        }
    }
    catch (e) {
        UI.ErrorMessage([e, '', e.stack].join('<br>'));
    }
})();