var HermitowskieFejki = {
    coords: '',
    version: 'Keleris'
};

if (localStorage['Faking'] !== undefined) {
    eval(localStorage['Faking']);
    Faking(true);
}
else {
    $.ajax({
        url: '',
        dataType: 'script',
    }).then(Faking);
}
