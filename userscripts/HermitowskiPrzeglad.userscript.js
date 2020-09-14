// ==UserScript==
// @name         Hermitowski Filtr Rozkazów
// @namespace    https://hermitowski.com/
// @version      1.0
// @description  Filtr wychodzących rozkazów na podstawie wielkości idących wojsk
// @author       Hermitowski
// @include      https://pl*.plemiona.pl/game.php?*screen=overview_villages
// @include      https://pl*.plemiona.pl/game.php?*screen=overview_villages&mode=commands*
// @grant        none
// ==/UserScript==

(function () {
    let filters = [{
        image_name: 'attack_large.png',
        hint: 'Duży atak (5000+ jednostek)',
        enabled: false
    }, {
        image_name: 'attack_medium.png',
        hint: 'Średni atak (1000-5000 jednostek)',
        enabled: false
    }, {
        image_name: 'attack_small.png',
        hint: 'Mały atak (1-1000 jednostek)',
        enabled: false
    }, {
        image_name: 'snob.png',
        hint: 'Zawiera szlachcica',
        enabled: false
    }];
    let table = $('#commands_table')[0];
    if (!table) { return; }
    let th$ = $(table.rows[0].cells[0]);

    function recalculate() {
        let enabledFilters = filters.filter(filter => filter.enabled);
        for (let i = table.rows.length - 1; i > 0; --i) {
            let row = table.rows[i];
            let children = row.cells[0].children;
            let hidden = false;
            for (const filter of enabledFilters) {
                let filterIsApplied = false;
                for (const child of children) {
                    if (child.className === 'own_command') {
                        if (filter.hint === child.getAttribute('data-icon-hint').trim()) {
                            filterIsApplied = true;
                        }
                    }
                }
                if (!filterIsApplied) {
                    hidden = true;
                    continue;
                }
            }
            row.hidden = hidden;
        }
    }

    for (let filter of filters) {
        let img$ = $('<img>', {
            src: `${image_base}command/${filter.image_name}`
        });
        img$.on('click', function () {
            filter.enabled = !filter.enabled;
            img$.css('filter', !filter.enabled ? 'grayscale(1.0)' : 'grayscale(0.0)');
            recalculate();
        });
        img$.css('filter', 'grayscale(1.0)');
        th$.append(img$);
    }
    recalculate();
})();