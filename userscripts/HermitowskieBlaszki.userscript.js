// ==UserScript==
// @name         Hermitowskie Blaszki
// @namespace    https://hermitowski.com/
// @version      1.0
// @description  Z dedykacją dla wszystkich nie-wygranych :)
// @author       Hermitowski
// @match        https://*.plemiona.pl/pregame.php?*screen=info_player*
// @match        https://*.plemiona.pl/game.php?*screen=info_player*
// @match        https://*.plemiona.pl/guest.php?*screen=info_player*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const player_id = ''; // Ustaw na swój id jeżeli chcesz widzieć blaszki również z poziomu dostępu gościnnego
    const hide_others_awards = true;

    // Dostosuj wpisy według własnego uznania
    const awards = [
        { title: 'Zwycięskie plemię', description: 'Zwycięstwo na Świat 158 z plemieniem Hermitowski GuROM!', img: 'ally_victory' },
        { title: 'Mistrz walki', description: 'Pokonałeś najwięcej przeciwników na Świat 158.', img: 'top_player_kills_all' },
        { title: 'Bezlitosny', description: 'Jako agresor pokonałeś najwięcej przeciwników na Świat 158.', img: 'top_player_kills_att' },
        { title: 'Nie do zdobycia', description: 'Jako obrońca pokonałeś najwięcej przeciwników na Świat 158.', img: 'top_player_kills_def' },
        { title: 'Nie na moich oczach', description: 'Jako wspierający pokonałeś najwięcej przeciwników na Świat 158.', img: 'top_player_kills_support' },
    ];

    const i18n = {
        VICTORY_ACHIEVEMENTS: 'Odznaczenia zwycięzcy'
    };

    const HermitowskieBlaszki = {
        init: function () {
            if (HermitowskieBlaszki.check_screen()) {
                const award_group = HermitowskieBlaszki.get_or_create_award_group_victory_achievements();
                for (const award of awards) {
                    HermitowskieBlaszki.create_award_box(award_group, award);
                }
            }
        },
        get_container: function () {
            switch (document.location.pathname) {
                case '/guest.php':
                    return document.querySelector('#content_value > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(11) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2)');
                case '/pregame.php':
                case '/game.php':
                    return document.querySelector('#content_value > table:nth-child(7) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2)');
            }
            return null;
        },
        get_or_create_award_group_victory_achievements: function () {
            const award_group_template = `
            <div class="award-group-head">${i18n.VICTORY_ACHIEVEMENTS}</div>
            <div class="award-group-content"></div>
            <div class="award-group-foot">&nbsp;</div>`;
            const container = HermitowskieBlaszki.get_container();

            const award_groups_existing = container.querySelectorAll('.award-group');

            if (award_groups_existing.length && award_groups_existing[0].children[0].innerText === i18n.VICTORY_ACHIEVEMENTS) {
                return award_groups_existing[0];
            }

            const award_group_new = document.createElement('div');
            award_group_new.innerHTML = award_group_template;
            award_group_new.classList.add('award-group');
            container.prepend(award_group_new);
            return award_group_new;
        },
        create_award_box: function (award_group, award) {
            const level = award.level || '4';
            const image_extension = ['ally_victory', 'top_player_kills_all'].includes(award.img)
                ? 'jpg'
                : 'png';
            const award_box_template = `
            <div class="award level${level}"><img src="${image_base}badges/${award.img}.${image_extension}" class="award-img"></div>
            <div class="award-desc">
                <strong>${award.title}</strong>
                <p>${award.description}</p>
            </div>`;
            const award_box = document.createElement('div');
            award_box.classList.add('award-box', 'clearfix');
            award_box.innerHTML = award_box_template;
            const award_group_content = award_group.querySelector('.award-group-content');
            award_group_content.append(award_box);
        },
        check_screen: function () {
            const url_params = new URLSearchParams(window.location.search);
            const target_player_id = (typeof (game_data) !== "undefined" && typeof (game_data.player) !== "undefined" && typeof (game_data.player.id) !== "undefined")
                ? game_data.player.id
                : player_id;
            return url_params.get('screen') === 'info_player' && url_params.get('id') == target_player_id;
        }
    };

    HermitowskieBlaszki.init();

})();