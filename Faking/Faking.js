if (typeof(WorldInfo) !== 'undefined') {
    ExecuteScript();
}
else {
    let url = 'https://pages.mini.pw.edu.pl/~nowikowskia/dev/MapFiles.js';
    $.ajax({
        url: url,
        dataType: "script",
    }).then(() => {
        GetWorldInfo().then(worldInfo => {
            WorldInfo = worldInfo;
            ExecuteScript();
        }).catch(HandleError);
    });
}


function ExecuteScript() {
    Faker = CreateFaker(WorldInfo);
    Faker.init();
}

function HandleError(error) {
    console.log(error);
    Dialog.show('scriptError', `<h2>B\u0142\u0105d podczas wykonywania skryptu</h2><p>Komunikat o b\u0142\u0119dzie: <br/><textarea>${error}</textarea></p>`)
}

function CreateFaker(worldInfo) {
    return {
        _version: 'guava',
        _settings: {},
        _defaultSettings: {
            fakeLimit: 0,
            omitNightBonus: true,
            coords: '',
            days: ['1-31'],
            intervals: ['0:00-23:59'],
            templates: [
                {
                    spy: 1,
                    ram: 1
                },
            ],
            fillWith: window.game_data.units.filter(unit => unit !== 'militia').join(','),
            fillExact: false,
            skipVillages: true,
        },
        init: function () {
            try {
                this.checkConfig();
                this.checkScreen();
                if (this.isVillageOutOfGroup())
                    this.goToNextVillage();
                let troops = this.selectTroops();
                if (troops) {
                    let target = this.selectTarget(troops);
                    if (target) {
                        this.displayTargetInfo(troops, target);
                    }
                }
            } catch (err) {
                UI.ErrorMessage(err, '1e3');
            }
        },
        checkConfig: function () {
            if (typeof(HermitowskieFejki) === 'undefined')
                throw 'Brak konfiguracji użytkownika';
            this._checkVersion(HermitowskieFejki);
            this._fixConfig(HermitowskieFejki);
        },
        checkScreen: function () {
            if (window.game_data.screen !== 'place' || $('#command-data-form').length !== 1) {
                window.location = window.TribalWars.buildURL('GET', 'place', {mode: 'command'});
                throw "Nie jesteś na placu";
            }
        },
        isVillageOutOfGroup: function () {
            return $('.jump_link')[0] !== undefined;
        },
        goToNextVillage: function () {
            window.location = $('#village_switch_right')[0].href;
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
            throw "Nie uda się wybrać wystarczającej liczby jednostek";
        },
        selectTarget: function (troops) {
            let poll = this._sanitizeCoordinates();
            let slowest = this._slowestUnit(troops);
            let a = worldInfo.village.filter(v => v.playerId === 699198069);
            poll = poll.filter(b => !a.some(v => v.coords === b));
            poll = poll.filter(coordinates => this._checkConstraints(
                this._calculateArrivalTime(coordinates, slowest)));
            return this._selectCoordinates(poll);
        },
        displayTargetInfo: function (troops, target) {
            $(".target-input-field").val(target);
            this._selectUnits(troops);
            let arrivalTime = this._calculateArrivalTime(target, this._slowestUnit(troops));
            let travelTime = (arrivalTime - Date.now()) / (1000 * 3600);
            let days = '';
            if (travelTime > 24) {
                days = 'za 1 dzień ';
            }
            if (travelTime > 48) {
                days = 'za ponad 2 dni ';
            }
            let hour = arrivalTime.getHours();
            let minutes = arrivalTime.getMinutes();
            if (hour < 10)
                hour = '0' + hour;
            if (minutes < 10)
                minutes = '0' + minutes;
            UI.SuccessMessage(`Atak dojdzie ${days}na ${hour}:${minutes}`)
        },
        _sanitizeCoordinates: function () {
            let coordinates = this._settings.coords.replace(/\s\s+/g, ' ').split(' ');
            let output = [];
            let wrong = [];
            let re = /^\d{0,3}\|\d{0,3}$/;
            for (const coordinate of coordinates) {
                if (re.test(coordinate)) {
                    output.push(coordinate);
                }
                else
                    wrong.push(coordinate);
            }
            if (wrong.length > 1) {
                let sample = wrong.slice(0, Math.min(5, wrong.length)).join(' ');
                UI.ErrorMessage(`Nie potrafię tego przeczytać: ${sample}`);
            }
            return output;
        },
        _checkConstraints: function (arrivalTime) {
            let daysIntervals = this._settings.days;
            /* days: ['1-23','23-30'], */
            let hoursIntervals = this._settings.intervals;
            /* ['7:00-8:00','23:00-23:59'], */
            if (this._isInInterval(arrivalTime, daysIntervals, this._parseDailyDate) === false)
                return false;
            if (this._settings.omitNightBonus) {
                if (this._isInNightBonus(arrivalTime))
                    return false;
            }
            return this._isInInterval(arrivalTime, hoursIntervals, this._parseTime);
        },
        _isInNightBonus: function (arrivalTime) {
            if (!worldInfo.config.general.night.active)
                return false;
            let timeInterval = [
                `${WorldInfo.config.general.night.start_hour}:00-${
                    WorldInfo.config.general.night.end_hour}:00`
            ];
            return this._isInInterval(arrivalTime, timeInterval, this._parseTime);
        },
        _selectCoordinates: function (poll) {
            if (poll.length === 0)
                throw "Lista wiosek spełniające wymagania jest pusta";
            return poll[Math.floor(Math.random() * poll.length)];
        },
        _clearPlace: function () {
            $('[id^=unit_input_]').val('');
        },
        _selectUnit: function (unitName, unitCount) {
            if (worldInfo.config.unit.hasOwnProperty(unitName) === false)
                throw `Podana jednostka nie istnieje: ${unitName}`;
            let input = this._getInput(unitName);
            let maxUnitCount = Number(input.attr('data-all-count'));
            let selectedUnitCount = Number(input.val());
            unitCount = Math.min(maxUnitCount, selectedUnitCount + unitCount);
            input.val(unitCount === 0 ? '' : unitCount);
        },
        _selectUnits: function (units) {
            for (const unitName in units) {
                this._selectUnit(unitName, units[unitName]);
            }
        },
        _countPopulations: function (units) {
            let sum = 0;
            for (const unitName in units) {
                let pop = Number(worldInfo.config.unit[unitName].pop);
                let quantity = units[unitName];
                sum += pop * quantity;
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
                fillTable.push([name, quantity]);
            }
            return fillTable;
        },
        _fill: function (template, place) {
            let left = Math.floor(game_data.village.points * this._settings.fakeLimit * 0.01);
            left -= this._countPopulations(template);
            if (left <= 0 && !this._settings.fillExact)
                return true;
            let fillTable = this._getFillTable();
            for (const entry of fillTable) {
                let name = entry[0];
                let minimum = entry[1];
                let pop = Number(worldInfo.config.unit[entry[0]].pop);
                if (!this._settings.fillExact) {
                    minimum = Math.min(minimum, Math.ceil(left / pop));
                }
                minimum = Math.min(place[name], minimum);
                if (!template[name])
                    template[name] = minimum;
                else
                    template[name] += minimum;
                left -= minimum * pop;
                if (left <= 0 && !this._settings.fillExact)
                    break;
            }
            return left <= 0;
        },
        _slowestUnit: function (units) {
            let speed = 0;
            for (const unitName in units) {
                speed = Math.max(Number(worldInfo.config.unit[unitName].speed), speed);
            }
            return speed;
        },
        _checkVersion: function (userConfig) {
            if (!userConfig['version'] || userConfig['version'] !== this._version)
                throw 'Yey! Wyszła nowa wersja skryptu :).\r\nSprawdź nową wersję skryptu w skryptotece na forum plemion.';
        },
        _fixConfig: function (userConfig) {
            for (let property in this._defaultSettings) {
                if (this._defaultSettings.hasOwnProperty(property)) {
                    if (userConfig[property] === undefined)
                        this._settings[property] = this._defaultSettings[property];
                    else
                        this._settings[property] = userConfig[property];
                }
            }
        },
        _calculateArrivalTime: function (coordinates, slowestUnitSpeed) {
            let dx = window.game_data.village.x - Number(coordinates.split("|")[0]);
            let dy = window.game_data.village.y - Number(coordinates.split("|")[1]);
            let distance = Math.hypot(dx, dy);
            let timePerField = slowestUnitSpeed * 60 * 1000;
            return new Date(distance * timePerField + Date.now());
        },
        _getInput: function (unitName) {
            let input = $(`#unit_input_${unitName}`);
            if (input.length === 0)
                throw `Podana jednostka nie występuje na tym świecie: ${unitName}`;
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
            }
            return obj;
        },
        _isEnough: function (template, placeUnits) {
            for (let unit in template) {
                if (template.hasOwnProperty(unit))
                    if (template[unit] > placeUnits[unit])
                        return false;
            }
            return true;
        }
    };
}
