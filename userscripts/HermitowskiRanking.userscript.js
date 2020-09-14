// ==UserScript==
// @name         Hermitowski Ranking
// @namespace    https://hermitowski.com/
// @version      1.0
// @description  Dodaje nawigację do przesuwania się po kontynentach na widoku rankingu graczy lub plemion na kontynencie
// @author       Hermitowski
// @match        https://*.plemiona.pl/game.php?*screen=ranking&mode=con_player*
// @match        https://*.plemiona.pl/game.php?*screen=ranking&mode=con_ally*
// ==/UserScript==

(function () {
    'use strict'
    const content = document.querySelector('#content_value');
    const parent = content.querySelector('table.vis.modemenu');
    const header = content.querySelector('h3');

    const table = document.createElement('table');
    const url_params = new window.URLSearchParams(location.search);

    const current_continent = Number(url_params.get('con') || header.innerText.match(/\d+/)[0])

    const y_mapping = { 0: 'n', 1: '', 2: 's' };
    const x_mapping = { 0: 'w', 1: '', 2: 'e' };

    for (let y = 0; y < 3; y++) {
        const row = table.insertRow();
        for (let x = 0; x < 3; x++) {
            const cell = row.insertCell();
            const image = document.createElement('img');
            const coords = `${y_mapping[y]}${x_mapping[x]}`;
            if (coords) {
                image.setAttribute('src', `${image_base}/map/map_${coords}.png`);
                if (current_continent % 10 === 0 && x == 0 ||
                    current_continent % 10 === 9 && x == 2 ||
                    current_continent < 10 && y == 0 ||
                    current_continent > 90 && y == 2) {
                    image.style.opacity = 0.5;
                } else {
                    image.style.cursor = 'pointer';
                    image.addEventListener('click', function () {
                        url_params.set('con', current_continent + (x - 1) + (y - 1) * 10);
                        location.search = url_params.toString();
                    });
                }
            }
            cell.append(image);
            row.append(cell);
        }
    }

    parent.append(table);
})();