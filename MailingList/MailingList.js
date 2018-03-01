/**
 * Created by Izomorfizom on 2017-06-22.
 * Generowanie listy mailingowej do wzywania pomocy.
 * Changelog:
 * Revisited on 2017-07-13. :
 * Revisited on 2017-09-22. : obsolute selector
 * Revisited on 2017-10-15. : fixed attack info on worlds without milliseconds AND AGAIN SELECTOR
 * Revisited on 2017-10-24. : initial support for mobile devices
 * Revisited on 2017-11-04. : end of support for mobile devices
 */


if (typeof MailingList === "undefined") {
    var MailingList = {
        ownTribe: {},
        diplomacy: {},
        players: {},
        villages: {},
        tribes: {},
        generateMailingList: () => {
            let tags = $('#MailingListTribes')[0].value.split(' ');
            let tribes = new Set();
            for (const Tribe of MailingList.tribes) {
                if (tags.includes(Tribe[1].tag))
                    tribes.add(Tribe[0]);
            }
            let allies = new Set();
            for (const Player of MailingList.players) {
                if (tribes.has(Player[1].allyId))
                    allies.add(Player[0]);
            }
            let chosenOnes = new Set();
            let coords = $('#MailingListCoordinates')[0].value;
            let impactTime = $('#MailingListTime')[0].value;
            if (impactTime.length === 5)
                impactTime += ":00";
            let velocity = $("#MailingListVelocity")[0];
            let amulet = $("#MailingListAmulet")[0];
            let X = Number(coords.split('|')[0]);
            let Y = Number(coords.split('|')[1]);
            let distance = (x, y) => {
                let dx = Number(x) - X;
                let dy = Number(y) - Y;
                return Math.sqrt(dx * dx + dy * dy);
            };
            let convertTime = time => {
                time = time.split(':');
                return (((Number(time[0]) * 60) + Number(time[1])) * 60) + Number(time[2]);
            };
            let timeLeft = convertTime(impactTime) - convertTime($('#serverTime')[0].innerText);
            let jutro = false;
            if (timeLeft <= 0) {
                jutro = true;
                timeLeft += 86400;
            }
            let maximumDistance = timeLeft / (velocity.value * amulet.value);
            for (const Village of MailingList.villages) {
                if (distance(Village[1].x, Village[1].y) < maximumDistance)
                    if (allies.has(Village[1].playerId))
                        chosenOnes.add(Village[1].playerId);
            }
            let names = [];
            chosenOnes.forEach(chosenOne => {
                names.push(MailingList.players.get(chosenOne).name)
            });
            let receiver = names.join(';');
            let OpenWindow = window.open('/game.php?screen=mail&mode=new');
            let MailingListTemplate = () => {
                $(OpenWindow.document.body).find('.vis').find('input')[0].value = receiver;
                $(OpenWindow.document.body).find('.vis').find('input')[1].value = '[DO OKOLICY] : ';
                let message = '';
                message += 'Wioska: ' + coords;
                if (game_data.screen === "overview") {
                    message += '\nPoziom muru: [b]' + game_data.village.buildings.wall + '[/b]';
                    message += '\nWojska: ';

                    let unitsInVillage = $('#show_units').find('.unit_link');
                    for (let i = 0, j = 0; i < game_data.units.length; i++) {
                        if ($(unitsInVillage[j]).attr('data-unit') === game_data.units[i]) {
                            message += '[unit]' + game_data.units[i] + '[/unit]';
                            message += $(unitsInVillage[j])[0].parentNode.innerText.match(/\d+/)[0];
                            j++;
                        }
                    }
                    let mood = $('#show_mood')[0].innerText.match(/\d+/);
                    if (mood != null){
                        message += `\nPoparcie: [b]${mood[0]}[/b]`;
                    }
                    message += '\nPotrzebna pomoc na: ' + impactTime;
                    if (jutro)
                        message += ' [b](jutro)[/b]';
                }
                message += '\n\nParametry:';
                message += '\nTyp jednostki: [b]' + velocity.options[velocity.selectedIndex].text + '[/b]';
                if (amulet.selectedIndex !== 0)
                    message += '\nAmulet: [b]' + amulet.options[amulet.selectedIndex].text + '[/b]';
                message += '\nZasięg: [b]' + Math.round(maximumDistance) + '[/b]';
                if (game_data.screen === "overview") {
                    message += '\n\n[spoiler=Zrzut ataków (' + MailingList._commandCount + ')]' + MailingList._dumpAttackInfo() + '[/spoiler]';
                }
                message += '\n\n[spoiler=Lista mailingowa]' + receiver + '[/spoiler]';
                $(OpenWindow.document.body).find('.easy-submit')[0].value = message;
            };
            OpenWindow.addEventListener('load', MailingListTemplate, true);
        },
        fetchDiplomacy: () => {
            let storageKey = game_data.world + 'contracts';
            return ((sessionStorage.getItem(storageKey) === null) ?
                fetch(TribalWars.buildURL('','ally',{mode:'contracts'}), {credentials: 'include'}).then(response => {
                    return response.text();
                }).then(text => {
                    sessionStorage.setItem(storageKey, JSON.stringify(text));
                    return text;
                }) : new Promise((resolve) => resolve(JSON.parse(sessionStorage.getItem(storageKey))))).then(text => {
                let a = document.createElement('contracts');
                a.innerHTML = text;
                let allies = [];
                let nop = [];
                let enemies = [];
                try {
                    let partners = $(a).find('#partners')[0].rows;
                    let select;
                    for (const partner of partners) {
                        if (partner.innerText.indexOf('Sprzymierzeńcy') !== -1) {
                            select = allies;
                            continue;
                        }
                        else if (partner.innerText.indexOf('Pakty o nieagresji') !== -1) {
                            select = nop;
                            continue;
                        }
                        else if (partner.innerText.indexOf('Wrogowie') !== -1) {
                            select = enemies;
                            continue;
                        }
                        try {
                            let tribe = {
                                tag: partner.cells[0].innerText.trim(),
                                id: partner.cells[0].children[0].href.match(/(id=\d+)/)[0].substring(3)
                            };
                            if (tribe.tag.trim().length === 0) continue;
                            select.push(tribe);
                        }
                        catch (err) {
                        }
                    }
                }
                catch (err) {
                }
                return {allies: allies, nop: nop, enemies: enemies};
            }).catch(error => console.log('Processing contracts failed ', error));
        },
        fetchOwnTribe: () => {
            let storageKey = game_data.world + 'properties';
            return ((sessionStorage.getItem(storageKey) === null) ?
                fetch(TribalWars.buildURL('','ally',{mode:'properties'}), {credentials: 'include'}).then(response => {
                    return response.text();
                }).then(text => {
                    sessionStorage.setItem(storageKey, JSON.stringify(text));
                    return text;
                }) : new Promise((resolve) => resolve(JSON.parse(sessionStorage.getItem(storageKey))))).then(text => {
                let a = document.createElement('properties');
                a.innerHTML = text;
                let tribe = {};
                let selector = mobile ? '#content_value' : '#ally_content';
                try {
                    tribe = {
                        tag: $(a).find(selector).find('.vis')[0].rows[2].cells[1].innerText,
                        id: game_data.player.ally
                    };
                }
                catch (err) {
                    tribe = {
                        tag: 'BRAK PLEMIENIA',
                        id: -1
                    };
                }
                return tribe;
            }).catch(error => console.log('Processing properties failed ', error));
        },
        init: () => {
            MailingList._createGUI().then((GUI) => {
                Dialog.show('MailingList', GUI);
                let serverTime = $('span#serverTime')[0].innerText;
                $('#MailingListTime')[0].value = (serverTime[1] === ":" ? '0' : '') + serverTime;
                $('#MailingListCoordinates')[0].value = (game_data.screen === 'info_village' ? $('#content_value').find('.vis')[0].innerHTML.match(/\d+\|\d+/)[0] : game_data.village.coord);
                Promise.all([MailingList.fetchDiplomacy(), MailingList.fetchOwnTribe()]).then(response => {
                    MailingList.diplomacy = response[0];
                    MailingList.ownTribe = response[1];
                    $('#MailingListTribes')[0].value = response[1].tag;
                    $('#MailingListDiplomacy')[0].disabled = false;
                }).catch(err => console.log(err));
                Promise.all([MailingList.fetchVillages(), MailingList.fetchPlayers(), MailingList.fetchTribes()]).then(response => {
                    MailingList.villages = response[0];
                    MailingList.players = response[1];
                    MailingList.tribes = response[2];
                    $('#MailingListLoading').html("");
                    $('#MailingListGenerate')[0].disabled = false;
                }).catch(err => console.log(err));
                if (game_data.screen === "overview") {
                    Promise.all([MailingList.fetchTroopsMovements()]).then(response => {
                        if (response[0].attacks.length !== 0) {
                            $('#MailingListIncomingTable').css('display', 'table');
                            //$('#MailingListIncomingTable').css('display', 'block');
                            //$('#MailingListIncomingTable').css('width', '100%');
                            //$
                            MailingList._selectedCommand = response[0].selected;
                            MailingList._attacks = response[0].attacks;
                            MailingList._commandCount = response[0].attacks.length;
                            $('#MailingListIncomingCount')[0].innerText = response[0].attacks.length;
                            if (response[0].selected !== -1)
                                MailingList._selectCommand(response[0].selected);
                        }

                    }).catch(err => {
                        console.log('Fetching movements', err);
                    });
                }
            }).catch(err => {
                console.log('Init failed', err);
                Dialog.show('MailingList', 'Wystąpił błąd xD\r\nNapisz na forum co się stało');
            });
        },
        _buildLabel: (commandIcon, unitIcon, name) => {
            let command = '<span>' + commandIcon + '</span>';
            if (unitIcon !== null)
                command += '<span>' + unitIcon + '</span>';
            command += name;
            return command;
        },
        _mailingDiplomacy: () => {
            $('#MailingListTribes')[0].value = MailingList.diplomacy.allies.reduce((a, b) => a += " " + b.tag, MailingList.ownTribe.tag);
        },
        fetchPlayers: () => {
            let storageKey = game_data.world + 'player';
            return ((sessionStorage.getItem(storageKey) === null) ?
                fetch('/map/player.txt', {credentials: 'omit'}).then(response => {
                    return response.text();
                }).then(text => {
                    sessionStorage.setItem(storageKey, JSON.stringify(text));
                    return text;
                }) : new Promise((resolve) => resolve(JSON.parse(sessionStorage.getItem(storageKey))))).then(text => {
                let Players = new Map();
                let playersRaw = text.split('\n');
                for (const playerRaw of playersRaw) {
                    if (playerRaw.trim().length === 0) continue;
                    let raw = playerRaw.split(',');
                    Players.set(raw[0], {
                        name: decodeURIComponent(raw[1]).replace(/\+/g, ' '),
                        allyId: raw[2],
                        villages: raw[3],
                        points: raw[4],
                        rank: raw[5]
                    });
                }
                return Players;
            }).catch(error => console.log('Processing players failed ', error));
        },
        fetchTribes: () => {
            let storageKey = game_data.world + 'ally';
            return ((sessionStorage.getItem(storageKey) === null) ?
                fetch('/map/ally.txt', {credentials: 'omit'}).then(response => {
                    return response.text();
                }).then(text => {
                    sessionStorage.setItem(storageKey, JSON.stringify(text));
                    return text;
                }) : new Promise((resolve) => resolve(JSON.parse(sessionStorage.getItem(storageKey))))).then(text => {
                let Allies = new Map();
                let alliesRaw = text.split('\n');
                for (const allyRaw of alliesRaw) {
                    if (allyRaw.trim().length === 0) continue;
                    let raw = allyRaw.split(',');
                    Allies.set(raw[0], {
                        name: decodeURIComponent(raw[1]),
                        tag: decodeURIComponent(raw[2]),
                        members: raw[3],
                        villagesCount: raw[4],
                        top40points: raw[5],
                        points: raw[6],
                        rank: raw[7]
                    });
                }
                return Allies;
            }).catch(error => console.log('Processing allies failed ', error));
        },
        fetchVillages: () => {
            let storageKey = game_data.world + 'village';
            return ((sessionStorage.getItem(storageKey) === null) ?
                fetch('/map/village.txt', {credentials: 'omit'}).then(response => {
                    return response.text();
                }).then(text => {
                    sessionStorage.setItem(storageKey, JSON.stringify(text));
                    return text;
                }) : new Promise((resolve) => resolve(JSON.parse(sessionStorage.getItem(storageKey))))).then(text => {
                let Villages = new Map();
                let villagesRaw = text.split('\n');
                for (const villageRaw of villagesRaw) {
                    if (villageRaw.trim().length === 0) continue;
                    let raw = villageRaw.split(',');
                    Villages.set(raw[0], {
                        name: decodeURIComponent(raw[1].replace(/\+/g, ' ')),
                        x: raw[2],
                        y: raw[3],
                        playerId: raw[4],
                        points: raw[5],
                        bonus: raw[6]
                    });
                }
                return Villages;
            }).catch(error => console.log('Processing villages failed ', error));
        },
        fetchTroopsMovements: () => {
            return new Promise((resolve, reject) => {
                try {
                    let incomings = $('#commands_incomings').find('.command-row');
                    let table = $('#MailingListIncoming')[0];
                    let enemiesIncomings = 0;
                    let snobDetected = false;
                    let attacks = [];
                    let selected = -1;
                    for (let i = 0; i < incomings.length; i++) {
                        let hoverDetails = $(incomings[i]).find('.command_hover_details');
                        let noneDetails = $(incomings[i]).find('.quickedit-content span');
                        let commandIcon = "";
                        let unitIcon = "";
                        let name = "";
                        let arrivalTime = "";
                        if (hoverDetails.length !== 0) {
                            commandIcon = hoverDetails[0].innerHTML;
                            unitIcon = (hoverDetails.length > 1) ? hoverDetails[1].innerHTML : null;
                        }
                        else if (noneDetails.length !== 0) {
                            commandIcon = noneDetails[0].innerHTML;
                            if (noneDetails.length === 2)
                                unitIcon = null;
                            else
                                unitIcon = noneDetails[1].innerHTML;
                        }
                        if (commandIcon.match(/attack/) === null) continue;
                        name = incomings[i].cells[0].innerText.trim();
                        arrivalTime = incomings[i].cells[1].innerText;
                        if (Number(incomings[i].cells[2].innerText.match(/\d+/)[0]) >= 24) continue;
                        if (snobDetected === false && unitIcon !== null) {
                            if (unitIcon.match(/snob/) !== null) {
                                selected = enemiesIncomings;
                                snobDetected = true;
                            }
                        }
                        attacks.push({
                            unitType: unitIcon,
                            arrival: arrivalTime.match(/\d+:\d+:\d+(:\d+)?/)[0],
                            name: name
                        });
                        let r = table.insertRow(-1);
                        let c = r.insertCell(-1);
                        c.innerHTML = MailingList._buildLabel(commandIcon, unitIcon, name);
                        c = r.insertCell(-1);
                        c.innerHTML = arrivalTime;
                        c = r.insertCell(-1);
                        c.innerHTML = '<span style="cursor: pointer; display: block; width: 16px; height: 22px; overflow: hidden; background: transparent url(' + image_base + 'index/group-jump.png) no-repeat;"><img src=' + image_base + '/blank-16x22.png onclick="MailingList._selectCommand(' + enemiesIncomings + ');"></span>';
                        enemiesIncomings++;
                        c = r.insertCell(-1);
                    }
                    resolve({selected: selected, attacks: attacks});
                }
                catch (err) {
                    reject(err);
                }
            });
        },
        _commandCount: 0,
        _commandSelected: -1,
        _attacks: [],
        _shiftRight: () => {
            if (MailingList._commandSelected !== -1) {
                if (MailingList._commandSelected < MailingList._commandCount - 1) {
                    MailingList._selectCommand(MailingList._commandSelected + 1);
                }

            }
        },
        _shiftLeft: () => {
            if (MailingList._commandSelected !== -1) {
                if (MailingList._commandSelected > 0) {
                    MailingList._selectCommand(MailingList._commandSelected - 1);
                }

            }
        },
        _selectCommand: (index) => {
            MailingList._commandSelected = index;
            $('#MailingListTime')[0].value = MailingList._attacks[MailingList._commandSelected].arrival.match(/\d+:\d+:\d+/)[0];
        },
        _dumpAttackInfo: () => {
            let output = '';
            for (let i = 0; i < MailingList._commandCount; i++) {
                let containsSnob = false;
                let unitName = "";
                if (MailingList._attacks[i].unitType !== null) {
                    let unitType = MailingList._attacks[i].unitType.match(/((tiny)|(command))\/\w+(?=\.png)/);
                    if (unitType !== null)
                        unitName = unitType[0].split('/')[1];
                    if (unitName === 'snob')
                        containsSnob = true;
                }
                if (containsSnob)
                    output += '[b]';
                let times = MailingList._attacks[i].arrival.split(':');
                output += times[0] + ':' + times[1] + ':' + times[2];
                if (times.length > 3)
                    output += ':[color=grey]' + times[3] + '[/color]';
                output += '[unit]' + unitName + '[/unit] ' + MailingList._attacks[i].name + '\n';
                if (containsSnob)
                    output += '[/b]';
            }
            return output;
        },
        _createGUI: () => {
            return new Promise(resolve => {
                let gui =
                    '<div id="MailingList">' +
                    '<table>' +
                    '<tr>' +
                    '<th width="50">Cel</th>' +
                    '<th colspan="3">Atak dotrze o:</th>' +
                    '<th>Prędkość pomocy</th><th>Amulet</th>' +
                    '<th id="MailingListLoading"><img src=' + image_base + 'loading2.gif></th>' +
                    '</tr>' +
                    '<tr>' +
                    '<td><input type="text" maxLength="7" id="MailingListCoordinates" placeholder="123|456"></td>' +
                    '<td><input type="time" id="MailingListTime" step="1"></td>' +
                    '<td><span id="MailingListArrowRight" style="cursor: pointer; display: block; width: 16px; height: 22px; overflow: hidden; background: transparent url(' + image_base + 'index/arrow-left.png) no-repeat;"><img src=' + image_base + 'blank-16x22.png onclick="MailingList._shiftLeft();"></span></td>' +
                    '<td><span style="cursor: pointer; display: block; width: 16px; height: 22px; overflow: hidden; background: transparent url(' + image_base + 'index/arrow-right.png) no-repeat;"><img src=' + image_base + 'blank-16x22.png onclick="MailingList._shiftRight();"></span></td>' +
                    '<td>' +
                    '<select id="MailingListVelocity">' +
                    '<option value="540" >Zwiad</option>' +
                    '<option value="600" >LK</option>' +
                    '<option value="660" selected="selected">CK</option>' +
                    '<option value="1080">Pikinier</option>' +
                    '<option value="1320">Miecznik</option>' +
                    '<option value="1800">Taran</option>' +
                    '<option value="2100">Szlachcic</option>' +
                    '</select>' +
                    '</td>' +
                    '<td>' +
                    '<select id="MailingListAmulet">' +
                    '<option value="1.0" selected="selected">Bez amuletu</option>' +
                    '<option value="0.9">Amulet 10%</option>' +
                    '<option value="0.8">Amulet 20%</option>' +
                    '<option value="0.7">Amulet 30%</option>' +
                    '</select>' +
                    '</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<th colspan="7">Plemiona</th>' +
                    '</tr>' +
                    '<tr>' +
                    '<td colspan="5"><input type="text" id="MailingListTribes" style="width:99%;" placeholder="Lista tagów plemion oddzielona spacją"></td>' +
                    '<td><button class="btn" id="MailingListDiplomacy" onclick="MailingList._mailingDiplomacy()" disabled="true">Dyplomacja</td>' +
                    '<td><button class="btn" id="MailingListGenerate" onclick="MailingList.generateMailingList()" disabled="true">Generuj</td>' +
                    '</tr>' +
                    '</table> ' +
                    '<table id="MailingListIncomingTable" style="display:none; width:100%;">' +
                    '<tr>' +
                    '<th>Przybywające (<span id="MailingListIncomingCount">0</span>)</th>' +
                    '<th>Przybycie</th><th></th></tr>' +
                    '<tbody id="MailingListIncoming"></tbody></table>' +
                    '</div>';
                resolve(gui);
            });
        }
    };
    MailingList.init();
}
else
    MailingList.init();