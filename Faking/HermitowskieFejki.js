var HermitowskieFejki = {
    fakeLimit : 1,
    coords : '123|456 789|123',
    days: ['1-23','23-30'],
    intervals: ['0:00-8:00','23:00-23:59'],
    fillWith : 'spy:5,light:15,axe',
    fillExact: true,
    skipVillages: true
};
var HermitowskieFejkiPodstawka = {
    init: function () {
        try {
            this.checkScreen();
            if (this.isVillageOutOfGroup())
                this.goToNextVillage();
            this.selectTarget();
            this.selectTroops();
            this.displayTargetInfo();
        } catch (err) {
            UI.ErrorMessage(err, '1e3');
        }
    },
    checkScreen: function() {
        if (window.game_data.screen !== 'place' || $('#command-data-form').length !== 1) {
            window.location = window.TribalWars.buildURL('', 'place', {mode: 'command'});
            throw "Nie jesteś na placu";
        }
    },
    isVillageOutOfGroup: function () {
        return $('.jump_link')[0] !== undefined;
    },
    goToNextVillage: function () {
        window.location = $('#village_switch_right')[0].href;
    },
    selectTarget: function () {
        let poll = this.sanitizeCoordinates();
        this.selectCoordinates(poll);
    },
    sanitizeCoordinates: function () {
        let coordinates = HermitowskieFejki.coords.replace(/\s\s+/g, ' ').split(' ');
        let output = [];
        let wrong = [];
        let re = /^\d{0,3}\|\d{0,3}$/;
        for (const coordinate of coordinates) {
            if (re.test(coordinate) && this.checkConstraints(coordinate))
                output.push(coordinate);
            else
                wrong.push(coordinate);
        }
        if (wrong.length > 1) {
            let sample = wrong.slice(0, Math.min(5, wrong.length)).join(' ');
            UI.ErrorMessage(`Nie potrafię tego przeczytać: ${sample}`);
        }
        return output;
    },
    checkConstraints: function(coordinates)  {
        let daysIntervals = HermitowskieFejki.days;
        /* days: ['1-23','23-30'], */
        let hoursIntervals = HermitowskieFejki.intervals;
        /* ['7:00-8:00','23:00-23:59'], */
        let arrivalTime = this._calculateArrivalTime(coordinates);
        if (this._isInInterval(arrivalTime, daysIntervals, this._parseDailyDate) === false)
            return false;
        return this._isInInterval(arrivalTime, hoursIntervals, this._parseTime);
    },
    selectCoordinates: function (poll) {
        if (poll.length === 0)
            throw "Lista wiosek spełniające wymagania jest pusta";
        $(".target-input-field").val(poll[Math.floor(Math.random() * poll.length)]);
    },
    selectTroops: function () {
        this.clearPlace();
        this.selectUnit('ram', 1) || this.selectUnit('catapult', 1) || this.insufficientResources("W wiosce musi być przynajmniej jeden taran albo jedna katapulta");
        if (this.fill() === false)
            this.clearPlace();
    },
    clearPlace: function () {
        $('[id^=unit_input_]').val('');
    },
    selectUnit: function (unitName, unitCount) {
        if (this._unitsPopulation.hasOwnProperty(unitName) === false)
            throw `Podana jednostka nie istnieje: ${unitName}`;
        let input = this._getInput(unitName);
        let maxUnitCount = Number(input.attr('data-all-count'));
        let selectedUnitCount = Number(input.val());
        unitCount = Math.min(maxUnitCount, selectedUnitCount + unitCount);
        input.val(unitCount === 0 ? '' : unitCount);
        return this._unitsPopulation[unitName] * unitCount;
    },
    countUnitsPopulation: function () {
        let sum = 0;
        for (let i = 0; i < window.game_data.units.length; i++) {
            let input = $(`#unit_input_${window.game_data.units[i]}`);
            sum += Number(input.val());
        }
        return sum;
    },
    fill: function () {
        let left = Math.floor(window.game_data.village.points * HermitowskieFejki.fakeLimit * 0.01);
        left -= this.countUnitsPopulation();
        let entries = HermitowskieFejki.fillWith.split(',');
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
        for (const entry of fillTable) {
            let minimum = entry[1];
            if (HermitowskieFejki.fillExact === false) {
                minimum = Math.min(minimum, Math.ceil(left / this._unitsPopulation[entry[0]]));
            }
            left -= this.selectUnit(entry[0], minimum);
            if (left <= 0 && HermitowskieFejki.fillExact === false)
                break;
        }
        if (left > 0) {
            if (HermitowskieFejki.skipVillages)
                this.goToNextVillage();
            throw "Nie uda się wybrać wystarczającej liczby jednostek";
        }
    },
    displayTargetInfo: function () {
        let coordinatesInput = $(".target-input-field").val();
        let arrivalTime = this._calculateArrivalTime(coordinatesInput);
        let travelTime = (arrivalTime - Date.now()) / (1000 * 3600);
        let when = '';
        if (travelTime > 24) {
            when = 'za 1 dzień ';
        } else if (travelTime > 48) {
            when = 'za 2 dni ';
        } else {
            when = 'za ponad 2 dni ';
        }
        UI.SuccessMessage(`Atak dojdzie ${when}na ${arrivalTime.getHours()}:${arrivalTime.getMinutes()}`)
    },


    _calculateArrivalTime: function (coordinates) {
        let dx = window.game_data.village.x - Number(coordinates.split("|")[0]);
        let dy = window.game_data.village.y - Number(coordinates.split("|")[1]);
        let distance = Math.hypot(dx, dy);
        const ram_speed = 30 * 60 * 1000;
        return new Date(distance * ram_speed + Date.now());
    },
    _getInput: function (unitName) {
        let input = $(`#unit_input_${unitName}`);
        if (input.length === 0)
            throw `Podana jednostka nie występuje na tym świecie: ${unitName}`;
        return input;
    },
    insufficientResources: function (text) {
        throw text;
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
    _unitsPopulation: {
        "spear": 1,
        "sword": 1,
        "axe": 1,
        "archer": 1,
        "spy": 2,
        "light": 4,
        "marcher": 5,
        "heavy": 6,
        "ram": 5,
        "catapult": 8,
        "knight": 10,
        "snob": 100
    },
}.init();
