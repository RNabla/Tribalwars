var HermitowskieSurki = {
    nearTimeThreshold: 30,
    resourceThreshold: [100000, 100000, 100000],
    populationAvailableThreshold: 200,
    tradersSafeguard: 10,
};

(function (TribalWars, options) {

    let fetchProductionTable = function () {
        let url = TribalWars.buildURL('GET', 'overview_villages', {
            mode: 'prod',
            group: '0',
            page: '-1'
        });
        return fetch(url, {
            credentials: 'include'
        }).then(t => t.text()).then(text => {
            let page = document.createElement('trades_table');
            page.innerHTML = text;
            let table = $(page).find('#production_table')[0];
            let villages = [];
            for (let i = 1; i < table.rows.length; i++) {
                let row = table.rows[i];
                let resources = [];
                for (let j = 0; j < 3; j++) {
                    resources.push(Number(row.cells[3].children[j].innerText.replace(".", "")))
                }
                let name = row.cells[1].innerText.trim();
                let coords = name.match(/\d+\|\d+/);
                coords = coords[coords.length - 1].split("|").map(coord => Number(coord));
                let population = row.cells[6].innerText.match(/\d+/g).map(e => Number(e));
                villages.push({
                    id: row.cells[1].children[0].attributes['data-id'].value,
                    name: name,
                    coords: coords,
                    resources: resources,
                    needs: [0, 0, 0],
                    incomes: {
                        near: [0, 0, 0],
                        far: [0, 0, 0]
                    },
                    frees: [0, 0, 0],
                    storage: Number(row.cells[4].innerText.match(/\d+/)[0]),
                    traders: Math.max(0, Number(row.cells[5].innerText.match(/\d+/)[0]) - options.tradersSafeguard),
                    farm: {
                        current: population[0],
                        maximum: population[1]
                    }
                });
            }
            return villages;
        });
    };

    let fetchTradesTable = function () {
        let url = TribalWars.buildURL('GET', 'overview_villages', {
            mode: 'trader',
            type: 'inc',
            group: '0',
            page: '-1'
        });
        return fetch(url, {
            credentials: 'include'
        }).then(t => t.text()).then(text => {
            let page = document.createElement('trades_table');
            page.innerHTML = text;
            let table = $(page).find('#trades_table')[0];
            let trades = [];
            if (table === undefined)
                return [];
            let names = ["wood", "stone", "iron"];

            for (let i = 1; i < table.rows.length; i++) {
                let row = table.rows[i];
                let timeparts = row.cells[5].innerText.match(/\d+/g).map(x => Number(x));
                let duration = convertTimepartsToDuration(timeparts);
                let resources = [0, 0, 0];
                for (let j = 0; j < row.cells[7].childElementCount; j++) {
                    let name = row.cells[7].children[j].outerHTML.match("wood|stone|iron")[0];
                    resources[names.indexOf(name)] = Number(row.cells[7].children[j].innerText.replace(".", ""));
                }
                trades.push({
                    id: row.cells[3].children[0].href.match(/id=(\d+)/)[1],
                    duration: duration,
                    income: resources
                });
            }
            return trades;
        });
    };

    function convertTimepartsToDuration(timeparts) {
        let duration = 0;
        let length = timeparts.length - 1;
        for (let i = 0; i < length; i++) {
            let val = timeparts[i];
            duration += val * 60;
        }
        duration += timeparts[length];
        return duration;
    }

    let nonZeroCell = function (arr) {
        return arr.some(x => x > 0);
    };

    let needs = function (villages, threshold) {
        let output = [];
        for (let i = 0; i < villages.length; i++) {
            let village = villages[i];
            for (let j = 0; j < threshold.length; j++) {
                village.needs[j] = Math.max(Math.min(threshold[j], village.storage) - village.resources[j] - village.incomes.far[j], 0)
            }
            if (nonZeroCell(village.needs)) {
                output.push(villages[i]);
            }
        }
        return output;
    };

    let frees = function (villages, safeguard) {
        let output = [];
        for (const village of villages) {
            for (let i = 0; i < safeguard.length; i++) {
                village.frees[i] = Math.max(0, village.resources[i] - Math.max(0, safeguard[i] - village.incomes.near[i]))
            }
            if (village.traders > 0 && nonZeroCell(village.frees)) {
                output.push(village)
            }
        }
        return output;
    };

    let accumulateIncome = function (trades, production) {
        for (const trade of trades) {
            let village = production.find(v => v.id === trade.id);
            let isNear = trade.duration <= options.nearTimeThreshold * 60;
            for (let i = 0; i < trade.income.length; i++) {
                village.incomes.far[i] += trade.income[i];
                if (isNear)
                    village.incomes.near[i] += trade.income[i];

            }
        }
    };

    let generateTradeEntry = function (suppliers, target, trade_table) {
        for (const village of suppliers) {
            let piece = [];
            for (let i = 0; i < 3; i++) {
                piece.push(Math.min(target.needs[i], village.frees[i]))
            }
            if (!nonZeroCell(piece)) continue;
            village.traders -= normalize(piece, village.traders);
            for (let i = 0; i < 3; i++) {
                target.needs[i] -= piece[i];
                village.frees[i] -= piece[i];
            }
            trade_table.push({
                form: {target_id: target.id, target_name: target.name, iron: piece[2], stone: piece[1], wood: piece[0]},
                village: {
                    id: village.id,
                    name: village.name
                }
            });
        }
    };

    let generateTradeTable = function () {
        return Promise.all([fetchTradesTable(), fetchProductionTable()]).then(a => {
            let trades = a[0];
            let production = a[1];
            accumulateIncome(trades, production);
            let takers = needs(production, options.resourceThreshold);
            let suppliers = frees(production, options.resourceThreshold);
            takers = takers.filter(e => e.farm.maximum - e.farm.current > options.populationAvailableThreshold);
            takers.sort((lhs, rhs) => {
                return lhs.farm.current - rhs.farm.current;
            });

            let trade_table = [];

            for (const target of takers) {
                suppliers.sort((a, b) => distance(a.coords, target.coords) - distance(b.coords, target.coords));
                generateTradeEntry(suppliers, target, trade_table);
                suppliers = suppliers.filter(v => v.traders > 0);
            }
            return trade_table;
        });
    };

    function normalize(arr, traders) {
        let sum = arr[0] + arr[1] + arr[2];
        let capacity = traders * 1000;
        if (sum > capacity) {
            let ratio = capacity / sum;
            for (let i = 0; i < 3; i++)
                arr[i] = Math.floor(ratio * arr[i]);
        }
        return Math.ceil((arr[0] + arr[1] + arr[2]) / 1000);
    }

    function distance(A, B) {
        let dx = A[0] - B[0];
        let dy = A[1] - B[1];
        return Math.hypot(dx, dy);
    }

    function createGui() {
        let div$ = $('<div>', {
            id: 'HermitianResources',
            class: 'vis vis_item',
            style: 'overflow-y:auto;height:200px'
        });
        let table$ = $('<table>', {
            width: '100%',
        });
        let thead$ = $('<thead>');
        let header$ = $('<tr>', {
            html:
            `<th>Z</th>` +
            `<th>Do</th>` +
            `<th><img src="${image_base}holz.png"/>Drewno</th>` +
            `<th><img src="${image_base}lehm.png"/>Glina</th>` +
            `<th><img src="${image_base}eisen.png"/>Żelazo</th>` +
            `<th><img src="${image_base}buildings/market.png"/>Transport</th>`
        });
        thead$.append(header$);

        let tbody$ = $('<tbody>', {
            id: 'HermitianResourcesResults'
        });

        table$.append(thead$);
        table$.append(tbody$);
        div$.append(table$);
        $('#contentContainer').prepend(div$);
    }

    if ($('#HermitianResources').length) {
        $('#HermitianResources > table > tbody').empty()
    } else {
        createGui();
    }

    generateTradeTable().then(trade_table => {
        try {
            let results$ = $('#HermitianResourcesResults');
            let generate_popup = function (trade_entry, anchor) {
                let coords = trade_entry.form.target_name.match(/\d{3}\|\d{3}/).pop().split('|');
                TribalWars.post('market', {ajax: 'confirm'}, {
                    village: trade_entry.village.id,
                    iron: trade_entry.form.iron,
                    stone: trade_entry.form.stone,
                    wood: trade_entry.form.wood,
                    x: coords[0],
                    y: coords[1],
                    h: game_data.csrf
                }, function (result) {
                    Dialog.show('map_market', result.dialog);
                    let market_confirm = $('#market-confirm-form');
                    market_confirm.on('submit', function() {
                        return TribalWars.post("market", {ajaxaction: "map_send"}, trade_entry.form, function (e) {
                            Dialog.close();
                            UI.SuccessMessage(e.message);
                            anchor.closest('tr').remove();
                        }), !1;
                    });
                });
            };

            if (!trade_table.length) {
                $('#HermitianResources').remove();
                return UI.SuccessMessage('Brak sugerowanych transportów');
            }

            for (const entry of trade_table) {
                let villageFromAnchor = $('<a>', {
                    text: entry.village.name,
                    href: TribalWars.buildURL('GET', 'info_village', {id: entry.village.id})
                });
                let villageToAnchor = $('<a>', {
                    text: entry.form.target_name,
                    href: TribalWars.buildURL('GET', 'info_village', {id: entry.form.target_id})
                });
                let tr$ = $('<tr>');
                tr$.append($('<td>').append(villageFromAnchor));
                tr$.append($('<td>').append(villageToAnchor));
                tr$.append($('<td>', {text: entry.form.wood}));
                tr$.append($('<td>', {text: entry.form.stone}));
                tr$.append($('<td>', {text: entry.form.iron}));
                let commandAnchor = $('<a>', {href: '#', text: 'Wykonaj'});
                commandAnchor.on('click', () => {
                    generate_popup(entry, commandAnchor);
                });
                tr$.append($('<td>').append(commandAnchor));
                results$.append(tr$);
            }
        }
        catch (e) {
            UI.ErrorMessage('upsi ', e);
            console.error(e);
        }
    });

})(TribalWars, HermitowskieSurki);