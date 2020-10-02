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
    const remove_awards_from_other_profiles = true;

    // Dostosuj wpisy według własnego uznania
    const awards = [
        { title: 'Zwycięskie plemię', description: 'Zwycięstwo na Świat 158 z plemieniem NP!', img: 'ally_victory' },
        { title: 'Zwycięskie plemię', description: 'Zwycięstwo na Świat XXX z plemieniem Hermitowski GuROM!', img: 'ally_victory' },
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
            const url_params = new URLSearchParams(window.location.search);
            const target_player_id = (typeof (game_data) !== "undefined" && typeof (game_data.player) !== "undefined" && typeof (game_data.player.id) !== "undefined")
                ? game_data.player.id
                : player_id;
            if (url_params.get('screen') === 'info_player') {
                if (url_params.get('id') == target_player_id) {
                    const award_group = HermitowskieBlaszki.get_or_create_award_group_victory_achievements(true);
                    for (const award of awards) {
                        HermitowskieBlaszki.create_award_box(award_group, award);
                    }
                }
                else if (remove_awards_from_other_profiles) {
                    const award_group = HermitowskieBlaszki.get_or_create_award_group_victory_achievements(false);
                    award_group.remove();
                }
            }
        },
        get_container: function (own_profile) {
            const award_group = document.querySelector('.award-group');
            if (award_group) {
                return award_group.parentNode;
            }
            switch (document.location.pathname) {
                case '/guest.php':
                    return document.querySelector('#content_value > table > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(11) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2)');
                case '/pregame.php':
                case '/game.php':
                    return own_profile
                        ? document.querySelector('#content_value > table:nth-child(7) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2)')
                        : document.querySelector('#content_value > table:nth-child(5) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2)')
            }
            return null;
        },
        get_or_create_award_group_victory_achievements: function (own_profile) {
            const award_groups_existing = document.querySelectorAll('.award-group');

            if (award_groups_existing.length && award_groups_existing[0].children[0].innerText === i18n.VICTORY_ACHIEVEMENTS) {
                return award_groups_existing[0];
            }

            const container = HermitowskieBlaszki.get_container(own_profile);
            const award_group_new = document.createElement('div');
            const award_group_template = `
            <div class="award-group-head">${i18n.VICTORY_ACHIEVEMENTS}</div>
            <div class="award-group-content"></div>
            <div class="award-group-foot">&nbsp;</div>`;
            award_group_new.innerHTML = award_group_template;
            award_group_new.classList.add('award-group');
            let i = 0;
            for (; i < container.children.length; i++) {
                if (container.children[i].classList.contains('award-group')) {
                    container.insertBefore(award_group_new, container.children[i]);
                    break;
                }
            }
            if (i == container.children.length) {
                container.append(award_group_new);
            }
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
    };

    HermitowskieBlaszki.init();

})();