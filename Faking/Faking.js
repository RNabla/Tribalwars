/*
 * Selecting troops and coordinates based on many factors
 * Created by: Hermitowski
 * Modified on: 13/02/2017 - version 2.2 - added targeting specific players/allies
 * Modified on: 14/02/2018 - version 2.3 - added minimum village points threshold
 * Modified on: 08/03/2018 - version 2.4 - added omitting recently selected villages for a short period of time
 * Modified on: 14/03/2018 - version 2.4 - improved performance
 * Modified on: 25/04/2018 - version 2.5 - added omitting recently selected villages in global context
 * Modified on: 26/04/2018 - version 2.5 - improved 'skip village' logic
 * Modified on: 26/04/2018 - version 2.6 - minor changes to selecting based on player/allies names
 * Modified on: 14/06/2018 - version 2.7 - added distance option
 * Modified on: 01/08/2018 - version 2.8 - added safeguard option
 * Modified on: 04/08/2018 - version 2.9 - redesign of contexts
 * Modified on: 04/08/2018 - version 2.10 - added bounding boxes
 * Modified on: 04/08/2018 - version 2.11 - added 'excludeCoords'
 * --- VERSION 3.0 ---
 * Modified on: 29/08/2018 - version 3.0a - major cleanup
 */

function Faking(debug) {
    let debugMode = (game_data.player.id === '699198069' || game_data.player.sitter === '699198069') && debug === true;
    let startTime = Date.now();
    if (localStorage['Faking'] === undefined) {
        Log('Setting up cache');
        localStorage['Faking'] = '(' + Faking.toString() + ')(true)';
        localStorage['FakingTimestamp'] = Date.now();
    }
    let getWorldInfo = localStorage['GetWorldInfo'];
    if (getWorldInfo !== undefined) {
        Log('Executing GetWorldInfo from local cache');
        eval(getWorldInfo);
        ExecuteScript();
    }
    else {
        Log('Fetching GetWorldInfo from network');
        UI.SuccessMessage('Pobieranie skryptu... ');
        $.ajax({
            url: 'https://media.innogamescdn.com/com_DS_PL/skrypty/MapFiles.js',
            dataType: 'script',
        }).then(ExecuteScript);
    }

    return true;

    function Log() {
        if (debugMode)
            console.log('Faking:', ...arguments);
    }

    function ExecuteScript() {
        let config = {
            unit_info: {
                caching: 'Mandatory'
            },
            config: {
                caching: 'Mandatory'
            }
        };
        if (typeof HermitowskieFejki !== 'undefined') {
            let requirePlayerFiles = HermitowskieFejki.players !== undefined && HermitowskieFejki.players.trim()  !== '';
            if (requirePlayerFiles) {
                config['village'] = {
                    caching: 'Mandatory'
                };
                config['player'] = {
                    caching: 'Mandatory'
                };
            }
        }
        GetWorldInfo(config, debug).then(worldInfo => {
            if (worldInfo.error !== undefined) {
                // some failure getting worldInfo data, e.g. QUOTA
                throw worldInfo.error;
            }
            CreateFaker(worldInfo).init();
            let endTime = Date.now();
            Log('Execution time: ' + (endTime - startTime));
            if (localStorage['FakingTimestamp'] === undefined || Number(localStorage['FakingTimestamp']) + 24 * 3600 * 1000 < Date.now()) {
                // delete cached version once a day, so the user get's update notification when new version comes out
                Log('Deleting current version');
                localStorage.removeItem('Faking');
                localStorage.removeItem('GetWorldInfo');
                localStorage.removeItem('FakingTimestamp');
            }
        }).catch(HandleError);
    }

    function HandleError(error) {
        console.log(error);
        localStorage.removeItem('Faking');
        Dialog.show('scriptError', `<h2>WTF - What a Terrible Failure</h2><p>Komunikat o b\u0142\u0119dzie: <br/><textarea rows='5' cols='42'>${error}</textarea></p>`)
    }

    function CreateFaker(worldInfo) {
        return {
            _debugMode: debugMode,
            _owner: 699198069,
            _settings: {},
            _fakeLimit: worldInfo.config.game.fake_limit,
            _defaultSettings: {
                omitNightBonus: 'true',
                coords: '',
                players: '',
                days: '1-31',
                intervals: '0:00-23:59',
                templates: [
                    {spy: 1, ram: 1},
                    {spy: 1, catapult: 1},
                    {ram: 1},
                    {catapult: 1}
                ],
                fillWith: game_data.units.filter(unit => ['militia', 'snob'].indexOf(unit) === -1).join(','),
                fillExact: 'false',
                skipVillages: 'true',
                safeguard: {},
                localContext: '0',
                customContexts: '',
                boundingBoxes: [],
            },
            _localContextKey: `HermitowskieFejki_${game_data.village.id}`,
            init: function () {
                try {
                    this.checkConfig();
                    this.checkScreen();
                    if (this.isVillageOutOfGroup())
                        this.goToNextVillage('Wioska poza grup\u0105. Przechodz\u0119 do nast\u0119pnej wioski z grupy');
                    let troops = this.selectTroops();
                    let target = this.selectTarget(troops);
                    this.displayTargetInfo(troops, target);
                } catch (err) {
                    console.log(err);
                    UI.ErrorMessage(err, '1e3');
                }
            },
            checkConfig: function () {
                if (typeof(HermitowskieFejki) === 'undefined')
                    throw 'Brak konfiguracji u\u017Cytkownika';
                this._fixConfig(HermitowskieFejki);
            },
            checkScreen: function () {
                if (game_data.screen !== 'place' || $('#command-data-form').length !== 1) {
                    location = TribalWars.buildURL('GET', 'place', {mode: 'command'});
                    throw 'Nie jeste\u015B  na placu';
                }
                // disable executing script on screen with command confirmation
                if ($('#troop_confirm_go').length !== 0)
                    throw 'Skrypt jest zablokowany w tym przegl\u0105dzie';
            },
            isVillageOutOfGroup: function () {
                return $('.jump_link')[0] !== undefined;
            },
            goToNextVillage: function (message) {
                if (this._toBoolean(this._settings.skipVillages)) {
                    let switchRight = $('#village_switch_right')[0];
                    let jumpLink = $('.jump_link')[0];
                    if (switchRight)
                        location = switchRight.href;
                    if (jumpLink)
                        location = jumpLink.href;
                }
                throw message;
            },
            selectTroops: function () {
                this._clearPlace();
                let place = this._getAvailableUnits();

                for (let template of this._settings.templates) {
                    if (this._isEnough(template, place)) {
                        if (this._fill(template, place)) {
                            return template;
                        }
                    }
                }
                this.goToNextVillage('Nie uda si\u0119 wybra\u0107 wystarczaj\u0105cej liczby jednostek');
            },
            selectTarget: function (troops) {
                let poll = this._sanitizeCoordinates(this._settings.coords);
                let slowest = this._slowestUnit(troops);
                if (slowest === 0)
                    throw 'Wydaje si\u0119, \u017Ce obecne ustawienia nie pozwalaj\u0105 na wyb\u00F3r jednostek';

                poll = this._targeting(poll);

                if (poll.length === 0) {
                    this.goToNextVillage('Pula wiosek jest pusta');
                }

                poll = poll.filter(coordinates =>
                    this._checkConstraints(this._calculateArrivalTime(coordinates, slowest))
                );

                if (poll.length === 0) {
                    this.goToNextVillage('Pula wiosek jest pusta z powodu wybranych ram czasowych');
                }

                poll = this._applyLocalContext(poll);
                poll = this._applyCustomContexts(poll);

                if (poll.length === 0) {
                    this.goToNextVillage('W puli wiosek zosta\u0142y tylko wioski, kt\u00F3re zosta\u0142y wybrane chwil\u0119 temu');
                }
                return this._selectCoordinates(poll);
            },
            displayTargetInfo: function (troops, target) {
                let defaultTargetInput = $('.target-input-field');
                if (defaultTargetInput.length === 1) {
                    defaultTargetInput.val(target);
                }
                else { // mobile devices
                    $('#inputx').val(target.split('|')[0]);
                    $('#inputy').val(target.split('|')[1]);
                }
                this._selectUnits(troops);
                let arrivalTime = this._calculateArrivalTime(target, this._slowestUnit(troops));
                let hour = this._twoDigitNumber(arrivalTime.getHours());
                let minutes = this._twoDigitNumber(arrivalTime.getMinutes());
                let day = this._twoDigitNumber(arrivalTime.getDate());
                let month = this._twoDigitNumber(arrivalTime.getMonth() + 1);
                UI.SuccessMessage(`Atak dojdzie ${day}.${month} na ${hour}:${minutes}`)
            },
            _twoDigitNumber: function (number) {
                return `${Number(number) < 10 ? '0' : ''}${number}`;
            },
            _sanitizeCoordinates: function (coordinates) {
                let coordsRegex = new RegExp(/\d{1,3}\|\d{1,3}/g);
                let match = coordinates.match(coordsRegex);
                return match == null
                    ? []
                    : match;
            },
            _checkConstraints: function (arrivalTime) {
                let daysIntervals = this._settings.days.split(',');
                /* daysIntervals: ['1-23','23-30'], */
                let hoursIntervals = this._settings.intervals.split(',');
                /* hoursIntervals: ['7:00-8:00','23:00-23:59'], */
                if (this._isInInterval(arrivalTime, daysIntervals, this._parseDailyDate) === false)
                    return false;
                if (this._toBoolean(this._settings.omitNightBonus) && this._isInNightBonus(arrivalTime))
                    return false;
                return this._isInInterval(arrivalTime, hoursIntervals, this._parseTime);
            },
            _isInNightBonus: function (arrivalTime) {
                if (!worldInfo.config.night.active)
                    return false;
                let timeInterval = [
                    `${worldInfo.config.night.start_hour}:00-
                     ${worldInfo.config.night.end_hour}:00`
                ];
                return this._isInInterval(arrivalTime, timeInterval, this._parseTime);
            },
            _selectCoordinates: function (poll) {
                let target = poll[Math.floor(Math.random() * poll.length)];
                this._save(target);
                return target;
            },
            _clearPlace: function () {
                $('[id^=unit_input_]').val('');
                let defaultTargetInput = $('.target-input-field');

                if (defaultTargetInput.length === 1) {
                    defaultTargetInput.val('');
                }
                else { // mobile devices
                    $('#inputy').val('');
                    $('#inputx').val('');
                }
            },
            _selectUnit: function (unitName, unitCount) {
                if (worldInfo.unit_info.hasOwnProperty(unitName) === false)
                    throw `Podana jednostka nie istnieje: ${unitName}`;
                let input = this._getInput(unitName);
                let maxUnitCount = Number(input.attr('data-all-count'));
                let selectedUnitCount = Number(input.val());
                unitCount = Math.min(maxUnitCount, selectedUnitCount + unitCount);
                input.val(unitCount === 0 ? '' : unitCount);
            },
            _selectUnits: function (units) {
                for (const unitName in units) {
                    if (units.hasOwnProperty(unitName))
                        this._selectUnit(unitName, units[unitName]);
                }
            },
            _countPopulations: function (units) {
                let sum = 0;
                for (const unitName in units) {
                    if (units.hasOwnProperty(unitName)) {
                        let pop = Number(worldInfo.unit_info[unitName].pop);
                        let quantity = units[unitName];
                        sum += pop * quantity;
                    }
                }
                return sum;
            },
            _getFillTable: function () {
                let entries = this._settings.fillWith.split(',');
                let fillTable = [];
                for (const entry of entries) {
                    let name = entry;
                    let quantity = 1e9;
                    if (name.indexOf(':') !== -1) {
                        let parts = entry.split(':');
                        name = parts[0];
                        quantity = Number(parts[1]);
                    }
                    name = name.trim();
                    fillTable.push([name, quantity]);
                }
                return fillTable;
            },
            _fill: function (template, place) {
                let left = Math.floor(game_data.village.points * Number(this._fakeLimit) * 0.01);
                left -= this._countPopulations(template);
                if ((left <= 0 || !this._shouldApplyFakeLimit(template)) && !this._toBoolean(this._settings.fillExact))
                    return true;
                let fillTable = this._getFillTable();
                for (const entry of fillTable) {
                    let name = entry[0];
                    if (!worldInfo.unit_info.hasOwnProperty(name)) continue;
                    let minimum = entry[1];
                    let pop = Number(worldInfo.unit_info[name].pop);
                    if (!this._toBoolean(this._settings.fillExact)) {
                        if (name === 'spy' &&
                            game_data.units.filter(unit => unit !== 'spy').every(unit => Number(template[unit]) > 0)) {
                            let spies = (template['spy']) ? Number(template['spy']) : 0;
                            minimum = Math.min(minimum, Math.ceil(left / pop), 5 - spies);
                        } else {
                            minimum = Math.min(minimum, Math.ceil(left / pop));
                        }
                    }
                    let selected = 0;
                    if (!!template[name])
                        selected = template[name];
                    minimum = Math.min(place[name] - selected, minimum);
                    if (!template[name])
                        template[name] = minimum;
                    else
                        template[name] += minimum;
                    left -= minimum * pop;
                    if ((left <= 0 || !this._shouldApplyFakeLimit(template)) && !this._toBoolean(this._settings.fillExact))
                        break;
                }
                return left <= 0 || !this._shouldApplyFakeLimit(template);
            },
            _slowestUnit: function (units) {
                let speed = 0;
                for (const unitName in units) {
                    if (units.hasOwnProperty(unitName) && units[unitName] !== 0)
                        speed = Math.max(Number(worldInfo.unit_info[unitName].speed), speed);
                }
                return speed;
            },
            _fixConfig: function (userConfig) {
                // check if user have only valid settings

                for (let property in userConfig) {
                    if (!this._defaultSettings.hasOwnProperty(property)) {
                        throw `Nieznana opcja: ${property}`;
                    }
                }

                // overwrite default values with user defined
                for (let property in this._defaultSettings) {
                    if (this._defaultSettings.hasOwnProperty(property)) {
                        this._settings[property] = JSON.parse(JSON.stringify(
                            (userConfig[property] === undefined)
                                ? this._defaultSettings[property]
                                : userConfig[property]
                        ));
                    }
                }
            },
            _toBoolean: function (input) {
                if (typeof(input) === 'boolean')
                    return input;
                return (input.toLowerCase() === 'true');
            },
            _calculateArrivalTime: function (coordinates, slowestUnitSpeed) {
                let dx = game_data.village.x - Number(coordinates.split('|')[0]);
                let dy = game_data.village.y - Number(coordinates.split('|')[1]);
                let distance = Math.hypot(dx, dy);
                let timePerField = slowestUnitSpeed * 60 * 1000;
                return new Date(distance * timePerField + Date.now());
            },
            _getInput: function (unitName) {
                let input = $(`#unit_input_${unitName}`);
                if (input.length === 0)
                    throw `Podana jednostka nie wyst\u0119puje na tym \u015Bwiecie: ${unitName}`;
                return input;
            },
            _isInInterval: function (value, intervals, predicate) {
                for (let i = 0; i < intervals.length; i++)
                    if (predicate(value, intervals[i]))
                        return true;
                return false;
            },
            _parseDailyDate: function (value, interval) {
                let day = value.getDate();
                let range = interval.split('-');
                return Number(range[0]) <= day && day <= Number(range[1]);
            },
            _parseTime: function (value, interval) {
                let convertTimeToMinutes = timer => Number(timer[0]) * 60 + Number(timer[1]);
                let minutes = convertTimeToMinutes([value.getHours(), value.getMinutes()]);
                let range = interval.split('-');
                return convertTimeToMinutes(range[0].split(':')) <= minutes && minutes <= convertTimeToMinutes(range[1].split(':'));
            },
            _getAvailableUnits: function () {
                let units = game_data.units.filter(unit => unit !== 'militia');
                let obj = {};
                for (let unit of units) {
                    obj[unit] = Number(this._getInput(unit).attr('data-all-count'));
                    if (this._settings.safeguard.hasOwnProperty(unit)) {
                        let threshold = Number(this._settings.safeguard[unit]);
                        if (isNaN(threshold) || threshold < 0) {
                            throw `Settings: safeguard: ${unit} : ${this._settings.safeguard[unit]}`;
                        }
                        obj[unit] = Math.max(0, obj[unit] - threshold);
                    }
                }
                return obj;
            },
            _isEnough: function (template, placeUnits) {
                for (let unit in template) {
                    if (template.hasOwnProperty(unit)) {
                        if (!worldInfo.unit_info.hasOwnProperty(unit) || template[unit] > placeUnits[unit])
                            return false;
                    }
                }
                return true;
            },
            _omitEmptyAndToLower: function (collection) {
                return collection
                    .map(name => name.trim())
                    .filter(name => name.length !== 0)
                    .map(name => name.toLowerCase());
            },
            _targeting: function (poll) {
                let players = this._omitEmptyAndToLower(this._settings.players.split(','));

                if (players.length === 0) {
                    return poll;
                }

                Log('Targeting (players):', players);

                let playerIds = worldInfo.player.filter(p =>
                    players.some(target => target === p.name.toLowerCase())
                ).map(p => p.id);

                Log('Targeted (players): ', playerIds);

                let villages = worldInfo.village.filter(v =>
                    playerIds.some(target => target === v.playerId)
                ).map(v => v.coords);

                Log('Applying bounding boxes');

                villages = this._applyBoundingBoxes(villages);

                Log('Targeted villages: ', villages);

                return [... new Set([...poll, ...villages])];
            },
            _save: function (coords) {
                let entry = {coords: coords, timestamp: Date.now()};
                this._saveEntry(entry, this._localContextKey);
                let customContexts = this._getCustomContexts();
                for (let customContext of customContexts) {
                    this._saveEntry(entry, customContext.key);
                }
            },
            _saveEntry: function (entry, key) {
                let recent = localStorage[key];
                recent = recent === undefined ? [] : JSON.parse(recent);
                recent.push(entry);
                localStorage[key] = JSON.stringify(recent);
            },
            _getCustomContexts: function () {
                return this._settings.customContexts.split(',')
                    .filter(value => value.length !== 0)
                    .map(entry => entry.split(":"))
                    .map(entry => {
                        return {
                            key: `HermitowskieFejki_${entry[0].trim()}`,
                            liveTime: Number(entry[1])
                        }
                    });
            },
            _applyLocalContext: function (poll) {
                return this._omitRecentlySelectedCoords(poll, {
                    key: this._localContextKey,
                    liveTime: Number(this._settings.localContext)
                });
            },
            _applyCustomContexts: function (poll) {
                let customContexts = this._getCustomContexts();
                for (let customContext of customContexts) {
                    poll = this._omitRecentlySelectedCoords(poll, customContext);
                }
                return poll;
            },
            _omitRecentlySelectedCoords(poll, context) {
                if (isNaN(context.liveTime) || context.liveTime <= 0) {
                    return poll;
                }
                let recent = localStorage[context.key];
                if (recent === undefined)
                    return poll;
                recent = JSON.parse(recent);
                let timestamp = Date.now();

                if (recent.length > 0) {
                    if ((recent[0].timestamp + 1000 * 60 * context.liveTime) < Date.now()) {
                        // at least one element to delete, update cache
                        recent = recent.filter(entry => (entry.timestamp + 1000 * 60 * context.liveTime) > timestamp);
                        localStorage[context.key] = JSON.stringify(recent);
                    }
                }

                return this._exclude(poll, recent.map(entry => entry.coords));
            },
            _exclude: function (poll, excluded) {
                let banned = new Set([...excluded]);
                return poll.filter(pollCoords => !banned.has(pollCoords));
            },
            _applyBoundingBoxes: function (poll) {
                if (this._settings.boundingBoxes.length === 0) {
                    return poll;
                }

                let coords = poll.map(c => {
                    let parts = c.split('|');
                    return {
                        x: Number(parts[0]),
                        y: Number(parts[1])
                    }
                });

                coords = coords.filter(c => {
                    return this._settings.boundingBoxes.some(boundingBox => {
                        return (boundingBox.minX <= c.x && c.x <= boundingBox.maxX) &&
                            (boundingBox.minY <= c.y && c.y <= boundingBox.maxY);
                    });
                });
                return coords.map(c => `${c.x}|${c.y}`);
            },
            _shouldApplyFakeLimit: function (units) {
                return game_data.units.filter(unit => unit !== 'spy').some(unit => Number(units[unit]) > 0) || units['spy'] < 5;
            }
        };
    }
}

Faking(true);