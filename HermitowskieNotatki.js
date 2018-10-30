/**
 * @param TribalWars                context
 * @param TribalWars.getGameData    function
 */
+function (TribalWars) {
    "use strict";
    if (typeof(TribalWars) === 'undefined') {
        return UI.ErrorMessage("Spr\u00F3buj ponownie");
    }
    if ($('.report_ReportAttack').length !== 1) {
        if ($('[class*=report_Report]').length !== 0)
            return UI.ErrorMessage("Tego typu raporty nie s\u0105 obs\u0142ugiwane");
        return UI.ErrorMessage("Czy aby na pewno jeste\u015B w przegl\u0105dzie raportu?")
    }
    let att = $('#attack_info_att');
    let def = $('#attack_info_def');
    let attPlayerName = $(att)[0].rows[0].cells[1].innerText.trim();
    let defPlayerName = $(def)[0].rows[0].cells[1].innerText.trim();
    let attPlayerId = $(att).find('.contexted').attr('data-player');
    let defPlayerId = $(def).find('.contexted').attr('data-player');
    let attVillageId = $(att).find('.contexted').attr('data-id');
    let defVillageId = $(def).find('.contexted').attr('data-id');
    let playerId = TribalWars.getGameData().player.id;
    let forwarder = getOriginPlayer();
    let context = 'NONE';
    let villageId = undefined;
    if (playerId === attPlayerId || forwarder === attPlayerName) {
        context = 'ATT';
        villageId = defVillageId;
    } else if (playerId === defPlayerId || forwarder === defPlayerName) {
        context = 'DEF';
        villageId = attVillageId;
    }
    else {
        return UI.ErrorMessage('Nie wiem po kt\u00F3rej stronie doda\u0107 raport');
    }
    let title = getBattleTime();

    if (context === 'ATT') {
        let church = getChurch();
        if (church) {
            title += ` | ${church.toUpperCase()}`;
        }
        let troopsType = guessTroopsType();
        if (troopsType !== undefined) {
            title += ` | ${troopsType}`;
        }
        let belief = checkBelief();
        if (belief) {
            title += ` | ${belief}`;
        }
        if (checkIfEmpty()) {
            title += ' | PUSTA';
        }
        let bunkier = checkIfBunkier();
        if (bunkier) {
            title += ` | BUNKIER ${bunkier}`;
        }

    }
    console.log(title);
    let reportExport = $("#report_export_code").val();
    let role = (villageId === defVillageId) ? "broni\u0105cego" : "atakuj\u0105cego";
    appendInformation(TribalWars, villageId, reportExport, title, role);


    function checkIfEmpty() {
        let table = $('#attack_info_def_units')[0];
        let count = table.rows[1];
        let loses = table.rows[2];

        for (let i = 1; i < table.rows[1].cells.length; i++) {
            if (count.cells[i].innerText !== loses.cells[i].innerText) {
               return false;
            }
        }
        return true;
    }

    function checkBelief() {
        if (def[0].rows[3].innerText.indexOf("walczyli bez wsparcia wiary") !== -1) {
            return 'BEZ WIARY';
        }
        return undefined;
    }

    function accumulateTroopsDefense(row) {
        let troops = {};
        for (let i = 1; i < row.cells.length; i++) {
            troops[game_data.units[i-1]] = Number(row.cells[i].innerText);
        }
        return accumulateUnitTypes(troops);
    }

    function checkIfBunkier() {
        let village_troops = accumulateTroopsDefense($('#attack_info_def_units')[0].rows[1]);
        if (village_troops.deffCount > 30000) {
            return `${Math.floor(village_troops.deffCount / 1000)}K`;
        }
        return undefined;
    }

    function guessTroopsType() {
        let units_away = getUnitsAway();
        let units_away_verdict = verdict(units_away, 3000);
        if (units_away_verdict) {
            return units_away_verdict;
        }
        try {
            let village_troops = accumulateTroopsDefense($('#attack_info_def_units')[0].rows[1]);
            let village_troops_verdict = verdict(village_troops, 2000);
            if (village_troops_verdict) {
                return village_troops_verdict;
            }
        }
        catch {

        }
        return undefined;
    }

    function verdict(units, threshold) {
        if (units !== undefined) {
            if (units.deffCount > threshold) {
                return 'DEFF';
            }
            if (units.offCount > threshold) {
                return 'OFF';
            }
            if (units.miscCount > threshold) {
                return 'ZWIAD??';
            }
        }
        return undefined;
    }

}(TribalWars);


/**
 * @param TribalWars
 * @param TribalWars.buildURL
 * @param TribalWars.post
 * @param villageId
 * @param reportExport
 * @param title
 * @param role
 */
function appendInformation(TribalWars, villageId, reportExport, title, role) {
    "use strict";
    reportExport = reportExport.replace('[spoiler]', `[spoiler=${title}]`);
    let villageUrl = TribalWars.buildURL('GET', {screen: 'info_village', id: villageId});
    fetch(villageUrl, {credentials: 'include'}).then(t => t.text()).then(t => {
        try {
            return $(t).find('textarea[name=note]')[0].innerText.trim();
        } catch (e) {
            return "";
        }
    }).then(oldNote => {
        if (oldNote.indexOf(reportExport) !== -1) {
            UI.ErrorMessage("Wydaje si\u0119, \u017Ce wioska ma ju\u017C ten raport");
        } else {
            let fullNote = reportExport + "\r\n" + oldNote;
            TribalWars.post('info_village', {
                ajaxaction: 'edit_notes',
                id: villageId
            }, {
                note: fullNote
            }, function () {
                UI.SuccessMessage(`Raport zosta\u0142 dodany do notatek wioski ${role}`);
                location.href = $('#report-next')[0].href;
            });
        }
    });
}

function getBattleTime() {
    "use strict";
    let table = $('table.vis')[3];
    for (let i = 0; i < table.rows.length; i++) {
        if (table.rows[i].cells[0].innerText === "Czas bitwy")
            return table.rows[i].cells[1].innerText;
    }
    return undefined;
}

function getOriginPlayer() {
    "use strict";
    let table = $('table.vis')[3];
    for (let i = 0; i < table.rows.length; i++) {
        if (table.rows[i].cells[0].innerText === "Przes\u0142ane od:") {
            return table.rows[i].cells[1].innerText;
        }
    }
    return undefined;
}

function getChurch() {
    "use strict";
    let table = $('#attack_spy_building_data');
    if (table.length !== 1) {
        return undefined;
    }
    let buildings = JSON.parse(table.val());
    for (const building of buildings) {
        if (building.id === 'church' || building.id === 'church_f') {
            return building.name + " " + building.level;
        }
    }
    return undefined;
}

function getUnitsAway() {
    let table = $('#attack_spy_away');
    let unitsAway = table.find('.unit-item');
    let units = [];
    for (let i = 0; i < unitsAway.length; i++) {
        let count = Number(unitsAway[i].innerText);
        if (count === 0)
            continue;
        let name = $(unitsAway[i]).attr('class').match('unit-item-[a-z]+')[0].substr(10);
        units[name] = count;
    }
    return accumulateUnitTypes(units);;
}

function accumulateUnitTypes(units) {
    let offUnits = [
        {name: 'axe', population: 1},
        {name: 'light', population: 4},
        {name: 'marcher', population: 5},
        {name: 'ram', population: 5}
    ];
    let deffUnits = [
        {name: 'spear', population: 1},
        {name: 'sword', population: 1},
        {name: 'archer', population: 1},
        {name: 'heavy', population: 6}
    ];
    let miscUnits = [
        {name: 'spy', population: 2},
        {name: 'catapult', population: 8},
        {name: 'knight', population: 10},
        {name: 'snob', population: 100}
    ];

    let offCount = accumulateCount(units, offUnits);
    let deffCount = accumulateCount(units, deffUnits);
    let miscCount = accumulateCount(units, miscUnits);
    return {
        offCount: offCount,
        deffCount: deffCount,
        miscCount: miscCount,
        allCount: offCount + deffCount + miscCount
    };
}

function accumulateCount(units, typeUnits) {
    let acc = 0;
    for (let i = 0; i < typeUnits.length; i++) {
        let name = typeUnits[i].name;
        let count = units[name];
        if (count === undefined)
            continue;
        acc += typeUnits[i].population * count;
    }
    return acc;
}