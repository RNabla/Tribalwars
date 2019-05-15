/**
 * Aggregating troops
 * Created by: Hermitowski
 * Created on:  14/05/2019 - version 1.0
 */


!(function (TribalWars) {
    const i18n = {
        loading: "\u0141adowanie",
        downloading: "Pobieranie",
        own: "W wioskach (w\u0142asne)",
        defense: "W wioskach (obce)",
        in_village: 'W wioskach (wszystkie)',
        outwards: 'Poza wiosk\u0105 (stacjonuj\u0105ce)',
        in_transit: 'Poza wiosk\u0105 (w drodze)',
        total_own: 'Wszystkie (w\u0142asne)',
        total: 'Wszystkie (w\u0142asne + obce)',
        no_villages_in_group: 'Wybrana grupa nie ma wiosek',
        export: "Eksport",
        group: "Grupa",
        type: "Typ wojsk",
        unexpected_error: "Niespodziewany b\u0142ad",
        villages_count: "Liczba wiosek"
    };
    const Helper = {
        count_units_in_row: function (row, start) {
            let units = [];
            for (let i = 0; i < game_data.units.length; i++) {
                units.push(Number(row.cells[i + start].innerText.match(/\d+/).pop()));
            }
            return units;
        },
        rows_sum: function (rows, type) {
            const sum = Array(game_data.units.length).fill(0);
            for (let i = 0; i < rows.length; i++) {
                for (let j = 0; j < game_data.units.length; j++) {
                    sum[j] += rows[i][type][j];
                }
            }
            return sum;
        },
        add_rows: function (row1, row2) {
            const result = Array(game_data.units.length).fill(0);
            for (let j = 0; j < game_data.units.length; j++) {
                result[j] = row1[j] + row2[j];
            }
            return result;
        },
        subtract_rows: function (row1, row2) {
            const result = Array(game_data.units.length).fill(0);
            for (let j = 0; j < game_data.units.length; j++) {
                result[j] = row1[j] - row2[j];
            }
            return result;
        },
        add_options: function (id, values, names, selected_value) {
            const select_list = document.querySelector(`#${id}`);
            for (let i = 0; i < values.length; i++) {
                let option = document.createElement('option');
                option.value = values[i];
                option.innerText = names[i];
                option.selected = selected_value == values[i];
                select_list.add(option);
            }
        },
        get_selected_label: function (id) {
            const select_list = document.querySelector(`#${id}`);
            return select_list.options[select_list.selectedIndex].innerText;
        }
    }
    const HermitowskiLicznikWojsk = {
        namespace: 'HermitowskiLicznikWojsk',
        types: {
            'own': i18n.own,
            'defense': i18n.defense,
            'in_village': i18n.in_village,
            'outwards': i18n.outwards,
            'in_transit': i18n.in_transit,
            'total_own': i18n.total_own,
            'total': i18n.total,
        },
        group2result: new Map(),
        init: function () {
            HermitowskiLicznikWojsk.create_gui();
        },
        fetch_groups: function () {
            let url = TribalWars.buildURL('GET', 'groups', { mode: 'overview', ajax: 'load_group_menu' });
            return fetch(url, { credentials: 'include' }).then(t => t.text()).then(response => {
                let groups = JSON.parse(response);
                groups.result.filter(x => x.type !== 'separator').map(x => {
                    return x.group_id;
                });
                return groups;
            });
        },
        fetch_units: function (group_id) {
            if (HermitowskiLicznikWojsk.group2result.has(group_id)) {
                return new Promise((resolve) => resolve(HermitowskiLicznikWojsk.group2result.get(group_id)));
            }
            let url = TribalWars.buildURL('GET', 'overview_villages', { mode: 'units', group: group_id, page: -1 });
            return fetch(url, { credentials: 'include' }).then(t => t.text()).then(response => {
                try {
                    let responseBody = document.createElement('body');
                    responseBody.innerHTML = response;
                    const table = responseBody.querySelector('#units_table');
                    if (!table) { throw i18n.no_villages_in_group; }
                    let rows = [];
                    for (let i = 1; i < table.rows.length; i += 5) {
                        rows.push({
                            own: Helper.count_units_in_row(table.rows[i + 0], 2),
                            in_village: Helper.count_units_in_row(table.rows[i + 1], 1),
                            outwards: Helper.count_units_in_row(table.rows[i + 2], 1),
                            in_transit: Helper.count_units_in_row(table.rows[i + 3], 1),
                        })
                    }

                    const own = Helper.rows_sum(rows, 'own');
                    const in_village = Helper.rows_sum(rows, 'in_village');
                    const outwards = Helper.rows_sum(rows, 'outwards');
                    const in_transit = Helper.rows_sum(rows, 'in_transit');

                    const defense = Helper.subtract_rows(in_village, own);

                    const total_own = Helper.add_rows(Helper.add_rows(own, outwards), in_transit);
                    const total = Helper.add_rows(defense, total_own);

                    const result = { own, in_transit, in_village, outwards, total, defense, total_own, villages_count: rows.length };
                    HermitowskiLicznikWojsk.group2result.set(group_id, result);
                    return result;

                } catch (e) {
                    const result = { error: e };
                    HermitowskiLicznikWojsk.group2result.set(group_id, result);
                    return result;
                }
            });
        },
        create_gui: function () {
            Dialog.show(HermitowskiLicznikWojsk.namespace, i18n.loading);
            let create_html = function () {
                let create_unit_cell = function (unit) {
                    let html = '<div style="flex:0 0 50%;max-width:50%">'
                    html += `<img src="${image_base}/unit/unit_${unit}.png" alt="${unit}" title="${unit}"></span>`;
                    html += `<span id="${HermitowskiLicznikWojsk.namespace}_${unit}">0</span>`;
                    html += '</div>';
                    return html;
                }
                let html = '<h2>Hermitowski Licznik Wojsk</h2>';
                html += '<table style="width:100%">';
                html += '<thead>'
                html += `<tr><th style="width:50%">${i18n.group}:</th><th><select id="${HermitowskiLicznikWojsk.namespace}_group"/></th></tr>`
                html += `<tr><th style="width:50%">${i18n.type}:</th><th><select id="${HermitowskiLicznikWojsk.namespace}_type"/></th></tr>`
                html += '</thead><tbody>';
                html += '<tr><td colspan="2">';
                html += `<div id="${HermitowskiLicznikWojsk.namespace}_results" style="display:flex;flex-wrap: wrap;">`
                for (let i = 0; i < game_data.units.length; i++) {
                    if (game_data.units[i] !== 'militia') {
                        html += create_unit_cell(game_data.units[i]);
                    }
                }
                html += `</div></td></tr></tbody><tfoot><tr><th colspan="2"><div id="${HermitowskiLicznikWojsk.namespace}_status"></div></th></tr></tfoot>`;
                html += '</table>';
                return html;
            };

            let add_on_change_handler = function (id, handler) {
                const select_list = document.querySelector(`#${id}`);
                select_list.addEventListener('change', handler);
            };
            HermitowskiLicznikWojsk.fetch_groups().then(groups => {
                const html = create_html();
                Dialog.show(HermitowskiLicznikWojsk.namespace, html);
                setTimeout(() => {
                    Helper.add_options(`${HermitowskiLicznikWojsk.namespace}_group`, groups.result.map(x => x.group_id), groups.result.map(x => x.group.name), groups.group_id);
                    Helper.add_options(`${HermitowskiLicznikWojsk.namespace}_type`, Object.keys(HermitowskiLicznikWojsk.types), Object.values(HermitowskiLicznikWojsk.types));
                    add_on_change_handler(`${HermitowskiLicznikWojsk.namespace}_group`, HermitowskiLicznikWojsk.on_change);
                    add_on_change_handler(`${HermitowskiLicznikWojsk.namespace}_type`, HermitowskiLicznikWojsk.on_change);
                    HermitowskiLicznikWojsk.switch(groups.group_id, Object.keys(HermitowskiLicznikWojsk.types)[0]);
                });
            })
        },
        on_change: function () {
            HermitowskiLicznikWojsk.switch(
                document.querySelector(`#${HermitowskiLicznikWojsk.namespace}_group`).value,
                document.querySelector(`#${HermitowskiLicznikWojsk.namespace}_type`).value
            );
        },
        switch: function (group_id, type) {
            HermitowskiLicznikWojsk.change_status(i18n.downloading);
            HermitowskiLicznikWojsk.disable_ui(true);
            HermitowskiLicznikWojsk.clear_results();
            HermitowskiLicznikWojsk.fetch_units(group_id).then(result => {
                if (result.error) {
                    if (typeof (result.error) === 'string') {
                        HermitowskiLicznikWojsk.change_status(result.error);
                    } else {
                        console.error(result.error);
                        HermitowskiLicznikWojsk.change_status(i18n.unexpected_error);
                    }
                }
                else {
                    HermitowskiLicznikWojsk.show_results(result[type]);
                    const clipboard_text = [
                        `[b]${i18n.group}:[/b] ${Helper.get_selected_label(`${HermitowskiLicznikWojsk.namespace}_group`)}`,
                        `[b]${i18n.type}:[/b] ${Helper.get_selected_label(`${HermitowskiLicznikWojsk.namespace}_type`)}`
                        , ...result[type]
                            .map((x, i) => `[unit]${game_data.units[i]}[/unit]${x}`)
                            .filter(x => x.indexOf('militia') === -1)
                    ].join('&nbsp;');
                    const export_html = `<span style="float:right"><a href="javascript:prompt('CTRL + C', '${clipboard_text}');void(0);">${i18n.export}<a></span>`;
                    HermitowskiLicznikWojsk.change_status(`${i18n.villages_count}: ${result.villages_count} ${export_html}`, true);
                }
                HermitowskiLicznikWojsk.disable_ui(false);
            });
        },
        disable_ui: function (disabled) {
            document.querySelector(`#${HermitowskiLicznikWojsk.namespace}_group`).disabled = disabled;
            document.querySelector(`#${HermitowskiLicznikWojsk.namespace}_type`).disabled = disabled;
        },
        clear_results: function () {
            HermitowskiLicznikWojsk.show_results(Array(game_data.units.length).fill(0));
        },
        show_results: function (units) {
            for (let i = 0; i < game_data.units.length; i++) {
                if (game_data.units[i] !== 'militia') {
                    document.querySelector(`#${HermitowskiLicznikWojsk.namespace}_${game_data.units[i]}`).innerHTML = `&nbsp;${units[i]} `;
                }
            }
        },
        change_status: function (message, innerHTML) {
            document.querySelector(`#${HermitowskiLicznikWojsk.namespace}_status`)[innerHTML ? 'innerHTML' : 'innerText'] = message;
        }
    };
    HermitowskiLicznikWojsk.init();
})(TribalWars);
