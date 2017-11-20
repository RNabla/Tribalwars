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
    let playerIdSelector = 'data-player';
    let villageIdSelector = 'data-id';
    let context = '.contexted';
    let sideInfo = '#attack_info_';
    let att = $(sideInfo + 'att');
    let def = $(sideInfo + 'def');
    let attPlayerName = $(att)[0].rows[0].cells[1].innerText.trim();
    let defPlayerName = $(def)[0].rows[0].cells[1].innerText.trim();
    let attPlayerId = $(att).find(context).attr(playerIdSelector);
    let defPlayerId = $(def).find(context).attr(playerIdSelector);
    let attVillageId = $(att).find(context).attr(villageIdSelector);
    let defVillageId = $(def).find(context).attr(villageIdSelector);
    let playerId = TribalWars.getGameData().player.id;
    let forwarder = getOriginPlayer();
    if (playerId !== defPlayerId && playerId !== attPlayerId && forwarder !== attPlayerName && forwarder !== defPlayerName) {
        UI.ErrorMessage('Nie wiem po kt\u00F3rej stronie doda\u0107 raport');
    } else {
        let title = getBattleTime();
        let reportExport = $("#report_export_code").val();
        let villageId = (playerId === attPlayerId || forwarder === attPlayerName) ? defVillageId : attVillageId;
        let role = (villageId === defVillageId) ? "broni\u0105cego" : "atakuj\u0105cego";
        appendInformation(TribalWars, villageId, reportExport, title, role);
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