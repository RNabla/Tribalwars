/*
 * Fetching coordinates from map view
 * Created by: Hermitowski
 * Modified on: 26/07/2018 - version 1.0 - initial release
 * Modified on: 27/07/2018 - version 1.1 - minor bug fixes
 */


(function () {
    let getSize = function (size) {
        size -= (size % 2 === 0) ? 2 : 1;
        size /= 2;
        return size;
    };

    let getAllySet = function () {
        let allies = [];
        let positive_relations = ['partner', 'nap'];
        for (const ally in TWMap.allyRelations) {
            if (positive_relations.indexOf(TWMap.allyRelations[ally]) !== -1) {
                allies.push(ally);
            }
        }
        if (game_data.player.ally !== "0") {
            allies.push(game_data.player.ally);
        }
        return new Set(allies.map(x => Number(x)));
    };

    let getFriendsSet = function () {
        return new Set([
            '699198069',
            game_data.player.id,
            ...Object.keys(TWMap.friends),
            ...TWMap.non_attackable_players
        ].map(x => Number(x)));
    };

    let addToOutput = function (village) {
        let coords = TWMap.CoordByXY(village.xy).join("|");
        if (set.has(coords)) return false;
        set.add(coords);
        resetChangesSet.push(village);
        let color = [255, 255, 255];
        $("#map_village_" + village.id).css("background-color", "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")");
        return true;
    };

    let scanMap = function () {
        let xsize = getSize(TWMap.size[0]);
        let ysize = getSize(TWMap.size[1]);
        let count = 0;
        for (let dx = -xsize; dx < xsize; dx++) {
            for (let dy = -ysize; dy < ysize; dy++) {
                let xy = `${TWMap.pos[0] + dx}${TWMap.pos[1] + dy}`;
                let village = TWMap.villages[xy];
                if (village !== undefined) {
                    if (village.img === 51) continue; // ghost village
                    let villageOwner = Number(village.owner);
                    let player = TWMap.players[villageOwner];
                    let IsPlayerAlly = player !== undefined && allies.has(Number(player.ally));
                    let IsPlayerFriend = friends.has(villageOwner);
                    if (IsPlayerAlly || IsPlayerFriend) continue;
                    if (addToOutput(village)) {
                        count++;
                    }
                }
            }
        }
        UI.SuccessMessage(count > 0 ?
            `Dodano ${count} wcześniej niespotkanych wiosek` :
            'Nie znaleziono wcześniej niespotkanych wiosek. Spróbuj przesunać mapkę albo kliknij zakończ, aby wyświetlić zebrane do tej pory wioski');
    };


    let onClickHandler = function (x, y) {
        let village = TWMap.villages[x * 1000 + y];
        if (village !== undefined) {
            if (addToOutput(village)) {
                UI.SuccessMessage(`Dodano wioskę <b>${village.name}</b>`);
            }

        }
        return false; // prevent redirection
    };

    let printCoords = function () {
        if (set.size > 0) {
            Dialog.show('coords', [...set].join(" "));
            for (const village of resetChangesSet) {
                MapHighlighter.colorVillage(village);
            }
        }
        $('#HermitowskieCoordy').remove();
        TWMap.map.handler.onClick = oldClickHandler;
        delete this;
    };

    let friends = getFriendsSet();
    let allies = getAllySet();
    let set = new Set();
    let resetChangesSet = [];
    let oldClickHandler = TWMap.map.handler.onClick;
    let map = $('#HermitowskieCoordy');
    if (!map.length) {
        let scanButton = $('<button>', {
            class: 'btn',
            text: 'Skanuj'
        });
        let endButton = $('<button>', {
            class: 'btn',
            text: 'Zakończ'
        });
        scanButton.click(scanMap);
        endButton.click(printCoords);
        let div = $('<div id="HermitowskieCoordy">');
        $('#content_value').prepend(div);
        div.append(scanButton);
        div.append(endButton);
        TWMap.map.handler.onClick = onClickHandler;
    }
})();
