let table = $('#units_table')[0];
let originVillageLength = table.rows[0].cells.length;
let originVillage = NaN;
let rows = [];
let checkboxes = $(table).find(":checkbox");
let checkboxId = 0;
for (let i = 1; i < table.rows.length - 1; i++) {
    try {
        if (table.rows[i].cells.length === originVillageLength) {
            originVillage = {
                id: $(table.rows[i].cells[0].children[0]).attr('data-id'),
                href: $(table.rows[i].cells[0]).find('a')[0].href,
                name: $(table.rows[i].cells[0]).find('span')[0].innerText.trim(),
            }
        }
        else {
            let mode = table.rows[i].cells[0].children[0].children.length;
            let supportedAllyId = game_data.player.ally;
            let supportedAllyName = "";
            let supportedAllyTag = "";
            let supportedAllyHref = "";

            let supportedPlayerHref = "0";
            let supportedPlayerName = game_data.player.name;
            let supportedPlayerId = game_data.player.id;

            let supportedVillageId = "";
            let supportedVillageName = "";
            let supportedVillageHref = "";
            let supportedVillageCoords = "";
            let innerText = table.rows[i].cells[0].children[0].innerText;
            let barbarianVillage = innerText.length > 5 && innerText.substr(innerText.length - 5) === "(---)";
            if (innerText.length > 5 && innerText.substr(innerText.length - 5) === "(---)") {

            }
            if (table.rows[i].cells[0].children[0].innerText.substring(table.rows[i].cells[0].children[0].innerText.indexOf(
                    table.rows[i].cells[0].children[0].children[1].innerText) + table.rows[i].cells[0].children[0].children[1].innerText.length).trim() === "(---)") {
                // wojsko w wiosce barbarzynskiej
             //   checkboxes[checkboxId].checked = true;

            }

            if (4 === mode) {
                --mode;
                supportedAllyTag = table.rows[i].cells[0].children[0].children[mode].innerText;
                supportedAllyHref = table.rows[i].cells[0].children[0].children[mode].href;
                supportedAllyId = supportedAllyHref.match(/id=\d+/)[0].match(/\d+/)[0];
            }
            if (3 === mode) {
                --mode;
                supportedAllyName = $(table.rows[i].cells[0].children[0].children[mode]).prop('title');
                supportedPlayerName = table.rows[i].cells[0].children[0].children[mode].innerText;
                supportedPlayerHref = table.rows[i].cells[0].children[0].children[mode].href;
                supportedPlayerId = supportedPlayerHref.match(/id=\d+/)[0].match(/\d+/)[0];
            }
            if (2 === mode) {
                --mode
                let innerText = table.rows[i].cells[0].children[0].children[1].children[0].innerText.trim();
                supportedVillageName = innerText.substr(0, innerText.length - 13);
                supportedVillageCoords = innerText.substr(innerText.length - 13);
                supportedVillageHref = table.rows[i].cells[0].children[0].children[1].children[0].href;
                supportedVillageId = supportedVillageHref.match(/id=\d+/)[0].match(/\d+/)[0];
            }

            rows.push({
                supportedPlayer: {
                    Id: supportedPlayerId,
                    Name: supportedPlayerName,
                    Href: supportedPlayerHref
                },
                supportedVillage: {
                    Id: supportedVillageId,
                    Name: supportedVillageName,
                    Href: supportedVillageHref,
                    Coords: supportedVillageCoords
                },
                supportedAlly: {
                    Id: supportedAllyId,
                    Name: supportedAllyName,
                    Href: supportedAllyHref,
                    Tag: supportedAllyTag
                },
                checkbox: checkboxes[checkboxId++],
                originVillage: originVillage,
            });
        }
    }
    catch (e) {
        console.log(e, i);
    }
}

function aggregate() {
    let villagesPlaced = new Set();
    let realRows = [];
    for (const row of rows) {
        if (villagesPlaced.has(row.supportedVillage.Id))
            continue;
        villagesPlaced.add(row.supportedVillage.Id);
        realRows.push(row);
    }
    //rows = realRows;
    realRows.sort((a, b) => Number(a.supportedPlayer.Id) - Number(b.supportedPlayer.Id));


}

function createTable() {

    let filters = "";
    filters += "<div class='filter_targets'>";
    filters += "<label><input type='radio' name='filter_target' onchange='updatePlaceholders(this)' value='any'/></td>Dowolny</label>";
    filters += "<label><input type='radio' name='filter_target' onchange='updatePlaceholders(this)' value='village'/></td>Nazwa wioski</label>";
    filters += "<label><input type='radio' name='filter_target' onchange='updatePlaceholders(this)' value='coords'/></td>Koordynaty</label>";
    filters += "<label><input type='radio' name='filter_target' onchange='updatePlaceholders(this)' value='player'/></td>Nazwa gracza</label>";
    filters += "<label><input type='radio' name='filter_target' onchange='updatePlaceholders(this)' value='ally'/></td>Nazwa plemienia</label>";
    filters += "<input onkeyup='myFilter()' size='93' maxlength='93'/>";
    filters += "</div>";
    let tab = "<table id='tabID'><tr class='header'><th></th><th>Nazwa wioski</th><th>Coord</th><th>Gracz</th><th>Plemie</th></tr>";
    // TODO: aggregate
    tab += "<tfoot class='header'><td><input type='checkbox' onchange='selectAllVisible()'/></td><td colspan='4'>Zaznacz wszystkie</td></tfoot>"
    aggregate();
    for (const row of rows) {
        tab += "<tr data-id='" + row.supportedVillage.Id + "'>";
        //console.log(row);
        tab += "<td><input type='checkbox' onchange='toogleThis("+ row.checkbox +")'></td>"
        tab += "<td><span class='village_anchor contexted' data-player='0' data-id='"+ row.supportedVillage.Id+"'>" +
            "<a href='/game.php?screen=info_village&id='"+row.supportedVillage.Id+">"+ row.supportedVillage.Name+"</a>" +
            "<a class='ctx' href='#'></a></span></td>";
        tab += "<td>" + row.supportedVillage.Coords + " </td>";
        tab += "<td>" + row.supportedPlayer.Name + " </td>";
        tab += "<td>" + row.supportedAlly.Tag + " </td>";
        tab += "</tr>"
    }
    tab += "</table>";
    return filters + tab;
}

function updatePlaceholders(element) {
    let placeholders = {
        any: "Szukaj wszędzie",
        village: "Szukaj w nazwach wiosek",
        coords: "Szukaj w koordynatach wiosek",
        player: "Szukaj w nazwach graczy",
        ally: "Szukaj w nazwach plemion"
    };
    $('.filter_targets').find('input:text')[0].placeholder = placeholders[element.value];
    myFilter();
}
function toogleThis(element) {
        element.checked = !element.checked;
        this.checked = !this.checked;
}
function selectAllVisible()
{
    let table = $('#tabID')[0];
    for (let i = table.rows.length;--i>0;)
    {
        if (table.rows[i].style.display === "")
            $(table.rows[i].cells[0]).trigger('change');
    }
}

function myFilter() {
    let input = $('.filter_targets').find('input:text')[0];
    let filter = input.value.toUpperCase();
    let table = $("#tabID")[0];
    let cellMap = {
        any: [1, 2, 3,4],
        village: [1],
        coords: [2],
        player: [3],
        ally: [4],
    };
    let cellLookup = cellMap[$('.filter_targets').find('input:checked')[0].value];
    for (let i = table.rows.length; --i > 0;) {
        table.rows[i].style.display =
            cellLookup.some(cell => table.rows[i].cells[cell].innerText.toUpperCase().indexOf(filter) > -1) ?
                "" : "none";

    }

}

Dialog.show('cos', createTable());
$(".popup_box").css('width', "630px");


function init() {
    $('.filter_targets')
}