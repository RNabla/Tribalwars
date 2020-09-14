// ==UserScript==
// @name         Hermitowski Rynek
// @namespace    https://hermitowski.com/
// @version      1.0
// @description  Synchronizacja pól sprzedaż/kupno przy tworzenie ofert na rynku
// @author       Hermitowski
// @include      https://pl*.plemiona.pl/game.php*screen=market&mode=own_offer
// ==/UserScript==

!(function () {
    const querySelectors = ['#res_sell_amount', '#res_buy_amount'];

    const inputs = querySelectors.map(x => ({
        'field': document.querySelector(x),
        'name': x
    }));

    const sync = function (origin, value) {
        const other_fields = inputs.filter(i => i['name'] !== origin).map(x => x['field']);
        other_fields.forEach(x => {
            if (x.value != value) {
                x.value = value;
            }
        });
    }

    for (const input of inputs) {
        const field = input['field'];
        if (field) {
            field.addEventListener('input', function (event) {
                sync(input['name'], event.target.value);
            });
        }
    }
})();