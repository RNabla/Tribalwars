!(function () {
    if (window.PremiumExchangeTracker) {
        return;
    }
    window.PremiumExchangeTracker = {
        resources: ['wood', 'stone', 'iron'],
        dictionary: {
            'wood' : '6e4dd7ce4ea3c1d4a90edb289e22da98',
            'stone' : 'ed5eace1bd098cdced7685864b09c291',
            'iron' : 'cefa8a9606819ed409dc761ca6080887'
        },
        ev : {
            global: 0,
            local : 0,
        },
        icon: '',
        init: function () {
            PremiumExchangeTracker.CheckPermission();
            PremiumExchangeTracker.SetUpIcon();
        },
        SetUpIcon: function () {
            let lvl = game_data.village.buildings.market;
            let iconId = 1;
            if (lvl >= 5)
                iconId = 2;
            else if (lvl >= 20)
                iconId = 3;
            PremiumExchangeTracker.icon = `${image_base}big_buildings/market${iconId}.png`;
        },
        SpawnNotification: function (theBody) {
            let options = {
                body: theBody,
                icon: PremiumExchangeTracker.icon
            };
            let n = new Notification(`Hermitowska Giełda - ${game_data.world}`, options);
            setTimeout(n.close.bind(n), 8000);
        },
        DisplaySample: function () {
            PremiumExchangeTracker.SpawnNotification('Tak będzie wyglądać przykładowe okienko');
        },
        Inject: function () {
            PremiumExchange.receiveData = (function () {
                return function (arguments) {
                    if (arguments.hasOwnProperty('bot_protect') || !arguments.hasOwnProperty('stock') ) {
                        PremiumExchangeTracker.SpawnNotification('Wymagane zatwierdzenie captchy');
                    }
                    else{
                        PremiumExchange.data= arguments;
                        PremiumExchange.updateUI();
                        PremiumExchangeTracker.Analyze();
                    }
                };
            })();
        },
        Analyze: function () {
            let gIncome = PremiumExchangeTracker.GlobalIncome();
            let lIncome = PremiumExchangeTracker.OptimalTrade();
            if (lIncome.totalIncome > 0) {
                PremiumExchangeTracker.Announce(lIncome);
                console.log(gIncome);
            }
            else {
                if (PremiumExchangeTracker.Stock('wood') > 0 || PremiumExchangeTracker.Stock('iron') > 0 || PremiumExchangeTracker.Stock('stone') > 0) {
                    console.log('upsi');
                }
            }
        },
        Execute: function () {
            PremiumExchangeTracker.Inject();
        },
        Exchanges: function (res, limit) {
            let exchanges = [];
            let stock_limit = PremiumExchange.data.capacity[res] - PremiumExchange.data.stock[res];
            limit = Math.min(limit, stock_limit);
            let lastIncome = -1;
            for (let i = 0; i < limit; i++) {
                let income = -Math.ceil(PremiumExchange.calculateCost(res, -i));
                if (lastIncome < income) {
                    lastIncome = income;
                    exchanges.push(i);
                }
            }
            if (limit === stock_limit) {
                let income = PremiumExchangeTracker.VaBank(res);
                exchanges[income] = stock_limit;
            }
            return exchanges;
        },
        GlobalIncome: function () {
            let exchange = [];
            let income = [];
            for (const res of PremiumExchangeTracker.resources) {
                exchange.push(PremiumExchangeTracker.Stock(res));
                income.push(PremiumExchangeTracker.VaBank(res));
            }
            return {
                totalIncome: income.reduce((a, b) => a + b, 0),
                income: income,
                exchange: exchange

            };
        },
        VaBank: function (res) {
            return -Math.floor(PremiumExchange.calculateCost(res, -PremiumExchangeTracker.Stock(res)));
        },
        Stock: function (res) {
            return PremiumExchange.data.capacity[res] - PremiumExchange.data.stock[res];
        },
        BruteForce: function (woodCount, stoneCount, ironCount, transport) {
            let wood = PremiumExchangeTracker.Exchanges('wood', woodCount);
            let stone = PremiumExchangeTracker.Exchanges('stone', stoneCount);
            let iron = PremiumExchangeTracker.Exchanges('iron', ironCount);
            let max = -1;
            let sum = -1;
            let exchange = [];
            let income = [];
            for (let w = 0; w < wood.length; w++) {
                sum = Math.ceil(wood[w]/1000)*1000;
                for (let s = 0; s < stone.length; s++) {
                    sum += Math.ceil(stone[s]/1000)*1000;
                    if (sum > transport)
                        break;
                    for (let i = 0; i < iron.length; i++) {
                        sum += Math.ceil(iron[i]/1000)*1000;
                        if (sum > transport)
                            break;
                        let pp = w + s + i;
                        if (max < pp) {
                            income = [w, s, i];
                            exchange = [wood[w], stone[s], iron[i]];
                            max = pp;
                        }
                        sum -= Math.ceil(iron[i]/1000)*1000;
                    }
                    sum -= Math.ceil(stone[s]/1000)*1000;
                }
            }
            return {
                totalIncome: max,
                income: income,
                exchange: exchange
            }
        },
        OptimalTrade: function () {
            let available = [];
            let transport = PremiumExchange.data.merchants * 1000;
            for (const res of PremiumExchangeTracker.resources) {
                available.push(Math.min(...[
                    transport,
                    game_data.village[res],
                    PremiumExchangeTracker.Stock(res)
                ]));
            }
            return PremiumExchangeTracker.BruteForce(...available, transport);
        },
        CheckPermission: function () {
            if (window.Notification && window.Notification.permission !== 'granted') {
                UI.InfoMessage('Powinno wyskoczyć okienko z pytaniem o możliwość wyświetlania powiadomień');
            }
            window.Notification.requestPermission().then(result => {
                switch (result) {
                    case 'granted':
                        UI.SuccessMessage('Script online');
                        PremiumExchangeTracker.DisplaySample();
                        this.Execute();
                        break;
                    default:
                        UI.ErrorMessage('Brak pozwolenia. Kończę pracę');
                        break;
                }
            });
        },
        Announce: function (income) {
            let text = `Możliwy zarobek: ${income.totalIncome}\r\n`;
            for (const i in PremiumExchangeTracker.resources){
                let res = window.lang[PremiumExchangeTracker.dictionary[PremiumExchangeTracker.resources[i]]];
                let xchg = income.exchange[i];
                let inc = income.income[i];
                text += `${res} : ${xchg} -> ${inc} PP\r\n`;
            }
            PremiumExchangeTracker.SpawnNotification(text);
        }
    };
    window.PremiumExchangeTracker.init();
})();
