// ==UserScript==
// @name         Hermitowski Plac Wojska
// @namespace    https://hermitowski.com/
// @version      0.1
// @description  Sortowanie wsparć po odległości
// @author       Hermitowski
// @match        https://pl*.plemiona.pl/game.php?*screen=place&mode=units*
// @match        https://pl*.plemiona.pl/game.php?*screen=place&mode=units
// @grant        none
// ==/UserScript==

(function () {
    let units_home = document.querySelector('#units_home');
    if (!units_home) { return; }
    let rows = units_home.rows;
    let asc = true;
    let comparer = function (row_1, row_2) {
        const dist_1 = Number(row_1.cells[2].innerText);
        const dist_2 = Number(row_2.cells[2].innerText);
        return asc
            ? dist_1 < dist_2
            : dist_2 < dist_1;
    };
    document.querySelector('#units_home > tbody:nth-child(1) > tr:nth-child(1) > th:nth-child(3)').addEventListener('click', function () {
        switchero(rows, 2, rows.length - 4, comparer);
        asc ^= true;
    });


    function switchero(rows, start, end, comparision) {
        let switching = true;

        while (switching) {
            switching = false;
            let i = end;
            for (; i >= start; i--) {
                if (comparision(rows[i + 0], rows[i + 1])) {
                    switching = true; break;
                }
            }
            if (switching) {
                rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            }
        }
    }
})();