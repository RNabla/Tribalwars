!(function(TribalWars) {

    Dialog.show('FakingHistory', '<div id="FakingHistory"></div>');


    let FakingCacheControlJSON = localStorage.getItem('HermitowskieFejki_CacheControl');

    if (FakingCacheControlJSON !== null) {
        let FakingCacheControl = JSON.parse(FakingCacheControlJSON);
        let keys = Object.keys(FakingCacheControl);
        let select$ = $('<select>');

        for (let key of keys) {
            let id = key.substr(18);
            if (!isNaN(Number(id))) {
                continue;
            }
            let option$ = $('<option>',{value: key, text: id});
            select$.append(option$);
        }
        select$.on('change', function(e) {
            let results$ = $('#FakingHistoryResults');
            results$.empty();
            let fakesJSON = localStorage.getItem(e.target.value);
            if (fakesJSON === null) {
                results$.text('Pusto');
            } else {
                let fakes = JSON.parse(fakesJSON);
                let fakesPlainText = fakes.map(x=>x[0]).join(" ");
                results$.text(fakesPlainText);
            }

        });
        let div_results$ = $('<div>', {id: 'FakingHistoryResults'});
        let popup$ = $('#FakingHistory');
        popup$.append(select$);
        popup$.append(div_results$);
        select$.trigger('change');
    }
    else {
        $('#FakingHistory').append("Brak zapisanej historii");
    }



})(TribalWars);