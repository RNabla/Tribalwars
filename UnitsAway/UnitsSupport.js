!(function () {
    let table = $('#units_table')[0];
    let rows = table.rows;
    let villageId = 0;
    let result = {
        players: []
    };

    for (let i = 1; i < rows.length; i++) {
        let row = rows[i];
        let className = row.className;
        if (className.search('units_away') >= 0) {
            villageId = $(row.cells[0].children[0]).attr('data-id');
            continue;
        }
        if (className.search('row_') >= 0) {
            let playerId = $($(row.cells[0].children[0])[0].children[1]).attr('data-player');
            if (playerId === game_data.player.id)
                continue;
            let troops = {
                total: 0
            };
            for (let j = 1; j < row.cells.length - 1; j++) {
                let deff = row.cells[j].innerText;
                troops[game_data.units[j - 1]] = deff;
                troops.total += Number(deff)
            }
            let vil = craftVillage(troops, villageId);
            console.log(vil);
            addPlayer(result, playerId, vil);
            addVillage(playerId, vil)
        }
    }
    console.log(result);


    function craftVillage(troops, villageId) {
        return {
            troops: troops,
            villageId: villageId
        };
    }
    function why(id){
        let table = {
            0 : 'it shouldn\' be this way'
        };
        return table[id % table.length];
    }
    function createVillage(id){
        let troops = {};
        for (const unit of game_data.units){
            troops[unit] = 0;
        }
        return {
            id : id,
            troops: troops,
            deff: 0
        }
    }

    function aggregateVillage(origin, troops){
        for (const unit of game_data.units){
            origin[unit] += troops[unit];
        }
    }
    function addVillage(playerId, villageId, troops) {
        let search = result.players.filter(p => p.id === playerId);
        if (search.length === 0){
            throw why(Math.floot(Math.random()*100));
        }
        let playerInfo = search[0];
        let searchVillage = playerInfo.villages.filter(v => v.id === villageId);
        let village;
        if (searchVillage === 0) {
            village = createVillage(id);
            playerInfo.villages.push(village);
        }
        village = searchVillage[0];
        aggregateVillage(village,troops);
    }


    function addPlayer(result, playerId, village) {
        let search = result.players.filter(p => p.id === playerId);
        let player;
        if (search.length === 0) {
            player = {
                villages: [],
                id: playerId,
                deff: 0

            };
            result.players.push(player);
        }
        else {
            player = search[0];
        }
        addVillage(playerId, v)
        player.villages.push(village);
        player.deff += village.troops.total;
        //if (result.players[)
        //else
        //{
        //	var obj = {
        //		villages : []
        //	};
        //	obj.villages.push(village);
        //	map.set(playerId, obj);
        //}


    }
})();