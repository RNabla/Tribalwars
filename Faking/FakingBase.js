var HermitowskieFejki = {
    omitNightBonus: true,
    days: ['1-31'],
    templates: [
        {
            spear: 1,
        },
    ],
    fillWith: 'spear:1000',
    fillExact: true,
    fakeLimit: 1,
    coords: '441|439 441|441 443|438 443|440 438|439 446|439 442|437 442|438 441|438 446|442 438|442 455|449 436|447 441|448 441|445 432|456 441|453 440|453 439|450 438|449 428|456 458|451 455|447 455|446 454|448 460|448 458|453 458|462 457|459 484|464 460|456 484|466 455|465 453|461 456|467',
    skipVillages: true,
    version: "guava"
};
(typeof(Faker) === 'undefined') ? $.getScript('https://pages.mini.pw.edu.pl/~nowikowskia/dev/Faking.js') : Faker.init();