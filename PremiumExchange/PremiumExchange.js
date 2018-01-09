var PremiumExchangeTracker;
!(function () {
    PremiumExchangeTracker = {
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
            console.log('init');
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
        SpawnNotification: function (theBody, theTitle) {
            let options = {
                body: theBody,
                icon: PremiumExchangeTracker.icon
            };
            let n = new Notification(`Hermitowska Giełda - ${game_data.world}`, options);
            setTimeout(n.close.bind(n), 8000);
        },
        DisplaySample: function () {
            PremiumExchangeTracker.SpawnNotification('Tak będzie wyglądać przykładowe okienko', game_data.world);
        },
        Inject: function () {
            PremiumExchange.receiveData = (function () {
                return function (arguments) {
                    //console.log(arguments);
                    if (arguments.bot_protection != undefined) {
                        PremiumExchangeTracker.SpawnNotification('Wymagane zatwierdzenie captchy', `'Hermitowskia giełda ${game_data.world}`);
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
                console.log('local', lIncome);
                console.log('global', gIncome);
            }
            else {
                if (PremiumExchangeTracker.Stock('wood') > 0 || PremiumExchangeTracker.Stock('iron') > 0 || PremiumExchangeTracker.Stock('stone') > 0)
                    console.log('upsi');
            }
        },
        Execute: function () {
            console.log('execute');
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
                    console.log(income, i);
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
    PremiumExchangeTracker.init();
})();


!(function init() {

        let resources = ['wood', 'stone', 'iron'];
        let icon = _SelectIcon();
        try {
            PremiumExchange.histogram = {
                possibleExchanges: new Map()
            };
            if (!AskForPermisssion())
                throw 'Brak pozwolenia na notyfikacje';
            DisplaySample();
            PremiumExchange.receiveData = Patch;
            let ok = function (e, a) {
                console.log(a);
                console.log(e);
                return true;
            };

            PremiumExchange.validateBuyAmount = ok;
            PremiumExchange.validateSellAmount = ok;
        }
        catch (err) {
            UI.ErrorMessage(err, 1e3);
        }

        function Patch(e) {
            let baked = {
                "stock": {"wood": 342788, "stone": 355908, "iron": 351241},
                "capacity": {"wood": 362788, "stone": 355908, "iron": 351241},
                "rates": {"wood": 0.0009732739793, "stone": 0.0009874267108, "iron": 0.0009973257264},
                "tax": {"buy": 0.03, "sell": 0},
                "constants": {
                    "resource_base_price": 0.015,
                    "resource_price_elasticity": 0.0148,
                    "stock_size_modifier": 20000
                },
                "duration": 7200,
                "credit": 0,
                "merchants": 5,
                "status_bar": `\\n\\t\\n\\t\\t\\n\\t\\t\\t
            Kupcy: 5 <\\/span>\\/
            5 <\\/span><\\/
            th >\\n\\t\\t\\t
            Mo\u017cna
            przetransportowa\u0107
            maksymalnie: 5000 <\\/span><\\/
            th >\\n\\t\\t\\t\\t\\t\\t\\t\\t <\\/tr>\\n\\t<\\/
            table >\\n\\n\\t <\\/div>\\n`
            };
            PremiumExchange.data = e;
            PremiumExchange.updateUI();

            Analyze(e);
        }

        function AskForPermisssion() {
            if (window.Notification && window.Notification.permission !== 'granted') {
                window.Notification.requestPermission();
            }
            return window.Notification.permission === 'granted';
        }

        function DisplaySample() {
            SpawnNotification('Tak będzie wyglądać przykładowe okienko', game_data.world);
        }


        function OptimalTrade() {
            let transport = PremiumExchange.data.merchants * 1000;

            let ress = [];
            for (const res of resources) {
                let vector = Exchanges(res, Math.min(transport, game_data.village[res]));
                ress.push(vector);
            }

            let wood = ress[0];
            let stone = ress[1];
            let iron = ress[2];

            let bestW, bestS, bestI;
            let maxPP = -1;
            for (let w = 0; w < wood.length; w++) {
                for (let s = 0; s < stone.length; s++) {
                    for (let i = 0; i < iron.length; i++) {
                        let _ = wood[w];
                        let __ = stone[s];
                        let ___ = iron[i];
                        let sum = _ + __ + ___;
                        if (sum > transport)
                            continue;
                        let pp = w + s + i;
                        console.log('calculating: ', wood[w], stone[s], iron[i], ' gives ', pp, ' PP for ', sum / pp);
                        if (maxPP < pp) {
                            bestI = i;
                            bestW = w;
                            bestS = s;
                            maxPP = pp;
                        }
                    }
                }
            }
            console.log(`
            BEST: 
            wood: ${wood[bestW]} -> ${bestW}
            stone: ${stone[bestS]} -> ${bestS}
            iron: ${iron[bestI]} -> ${bestI}
            total: ${bestW + bestI + bestS}
            `);
        }

        function SpawnNotification(theBody, theTitle) {
            let options = {
                body: theBody,
                icon: icon
            };
            let n = new Notification(theTitle, options);
            setTimeout(n.close.bind(n), 5000);
        }

        function Analyze(data) {


            OptimalTrade();
            console.log(`***************${Date.now()}*****************`);
            let income = _GetIncome();
            if (data.merchants === 0) {
                console.log('brak kupców');
            }
            else if (!_CheckForRoom(data)) {
                console.log('brak miejsca na gieldzie');
            }
            else {
                // if (income < 5)
                //     console.log(`nie korzystne warunki wymiany: ${_GetIncome()}`);
                //else {
                SpawnNotification(`Możliwość zarobienia ${_GetIncome()} PP`, `Giełda Premium ${game_data.world}`);
                //}
            }

        }

        function _SetHistory(income) {
            let value = 0;
            if (PremiumExchange.histogram.possibleExchanges.has(income))
                value = PremiumExchange.histogram.possibleExchanges.get(income);
            value++;
            PremiumExchange.histogram.possibleExchanges.set(income, value);
        }


        function _GetIncome() {

            let free = {};
            let income = {total: 0};
            let merchants = PremiumExchange.data.merchants;
            let maxIncome = 0;
            for (const res of resources) {
                let stock = PremiumExchange.data.capacity[res] - PremiumExchange.data.stock[res];
                let village = game_data.village[res];
                let transport = merchants * 1000;
                free[res] = Math.min(...[stock, village, transport]);
                maxIncome += Math.floor(PremiumExchange.calculateCost(res, -stock));
            }
            for (const res of resources) {
                let inc = Math.floor(PremiumExchange.calculateCost(res, -free[res]));
                income[res] = inc;
                income.total += inc;
            }
            _SetHistory(maxIncome);
            return income.total;
        }

        function _CheckForRoom(data) {
            for (const res of resources) {
                console.log(res, data.capacity[res], data.stock[res]);
                if (data.capacity[res] > data.stock[res]) {
                    return true;
                }
            }
            return false;
        }

        function _SelectIcon(data) {
            let lvl = game_data.village.buildings.market;
            let iconId = 1;
            if (lvl >= 5)
                iconId = 2;
            else if (lvl >= 20)
                iconId = 3;

            let icon = `${image_base}big_buildings/market${iconId}.png`;
            return icon;
        }
    }

)();

//
var PremiumExchange;
!function () {
    "use strict";
    PremiumExchange = {
        TYPE_BUY: "buy",
        TYPE_SELL: "sell",
        data: {},
        errors: {},
        icons: {},
        graph: null,
        init: function () {
            $(".premium-exchange-input").on("keyup input", PremiumExchange.inputChanged), $("#premium_exchange_form").on("submit", PremiumExchange.beginBuy), setInterval(PremiumExchange.loadData, 1e4), $("#premium_exchange_credit_help").on("click", function () {
                return Dialog.fetch("premium_exchange_credit_help", "market", {ajax: "exchange_credit_help"}), !1
            }), $("#premium_exchange_help").on("click", function () {
                return Dialog.fetch("premium_exchange_help", "market", {ajax: "exchange_help"}), !1
            }), this.graph && (this.graph.graph(), UI.onResizeEnd(window, function () {
                PremiumExchange.graph.graph()
            }))
        },
        beginBuy: function (e) {
            if (e.preventDefault(), Object.keys(PremiumExchange.errors).length) return void UI.ErrorMessage(PremiumExchange.errors[Object.keys(PremiumExchange.errors)[0]]);
            var a = $(this).attr("disabled", "disabled"), r = $("#premium_exchange_form").serializeArray(), t = {};
            $.each(r, function (e, a) {
                a.value && (t[a.name] = parseInt(a.value))
            }), TribalWars.post("market", {ajaxaction: "exchange_begin"}, t, function (e) {
                a.removeAttr("disabled"), PremiumExchange.showConfirmationDialog(e)
            }, function () {
                a.removeAttr("disabled")
            })
        },
        showConfirmationDialog: function (e) {
            var a = {}, r = 0, t = 0, c = 0, i = 0, n = [],
                m = s('<img src="%1" />', Format.image_src("resources/premium.png")),
                u = '<div style="text-align: left">';
            u += '<h3 style="margin-top: 0">' + _("61a141a577b07aaea4618a4e3690f2c0") + '</h3><table class="vis" style="width: 100%"><tr><th>' + _("5238bd0d26ee4c221badd6e6c6475412") + "</th><th>" + _("077c2a977fca766982052f10bcf21cc2") + "</th></tr>", $.each(e, function (e, n) {
                a["rate_" + n.resource] = n.rate_hash, n.error ? c++ : (n.amount > 0 ? (a["buy_" + n.resource] = n.amount, t += n.cost) : (a["sell_" + n.resource] = Math.abs(n.amount), r += -n.cost), i += n.merchants_required);
                var o = n.amount > 0 ? _("886911e57fa3ee3994a663623a3b9d10") : _("bdbaf050407e81714408289ba3c6941b");
                u += n.error ? '<tr class="error">' : '<tr class="row_a">', u += s("<td>" + o + "</td>", s('<img src="%1" /> %2', Format.image_src("resources/" + n.resource + "_18x16.png"), Math.abs(n.original_amount)), s("%1 %2", m, Math.round(Math.abs(n.cost)))), u += s("<td>" + o + "</td>", s('<img src="%1" /> %2', Format.image_src("resources/" + n.resource + "_18x16.png"), Math.abs(n.amount)), s("%1 %2", m, Math.round(Math.abs(n.cost)))), u += "</tr>", n.error && (u += '<tr><td colspan="2" class="warn">' + n.error + "</td></tr>"), n.original_rate_hash && n.original_rate_hash !== n.rate_hash && (u += '<tr><td colspan="2" class="warn">' + _("51bff152db3085d061ab05ff18929d0e") + "</td></tr>")
            }), u += "</table>", i && (u += "<p>", u += _("1571a73d0961e52173c82da0df8035b8") + " " + i + "<br />", u += _("e206dc0ee33cef21157162c292bed800") + " " + Format.timeSpan(1e3 * PremiumExchange.data.duration), u += "</p>");
            var o = t;
            u += "<p>";
            var h = PremiumExchange.data.credit > t ? t : PremiumExchange.data.credit;
            t && r ? u += s(_("6069c7a2d0b5c182414b09705e179599"), m, t, r) : t ? u += s(_("c940e94d64f0ca5a359b0901b72f0087"), m, t) : r && (u += s(_("7e18147925200d1d4878df9d9e372167"), m, r)), u += "</p>", h && (u += "<p>", u += s(_("42544aa81540d049c6e3d824db1a0726"), m, h), o = t - h, o && (u += "<br />" + s(_("6da2e509a8b5e4f74e7d6f4409f9ea40"), m, o)), u += "</p>"), o > 0 && parseInt(game_data.player.pp) < o && (u += "<p>" + _("36eac82c264e62a0ae560f533928dbd7") + "</p>"), u += "</div>", o > 0 && parseInt(game_data.player.pp) < o ? n.push({
                text: _("de18d7ebba08f2bf851b460ac724b4ce"),
                callback: function () {
                    Premium.buy()
                },
                confirm: !0
            }) : c || n.push({
                text: _("70d9be9b139893aa6c69b5e77e614311"), callback: function (e) {
                    a.mb = e.hasOwnProperty("which") ? e.which : -1, PremiumExchange.confirmOrder(a)
                }, confirm: !0
            }), UI.ConfirmationBox(u, n, "premium_exchange", null, !0)
        },
        confirmOrder: function (e) {
            Dialog.close(), TribalWars.post("market", {ajaxaction: "exchange_confirm"}, e, function (e) {
                return e.data && PremiumExchange.receiveData(e.data), e.success === !0 ? (UI.SuccessMessage(_("42dbf2b07cb8e68771c8ab41737aa0ef")), void $(".premium-exchange input").val("").each(function () {
                    PremiumExchange.inputChanged.call(this)
                })) : void PremiumExchange.showConfirmationDialog(e.transactions)
            })
        },
        loadData: function (e) {
            TribalWars.get("market", {ajax: "exchange_data"}, function (a) {
                PremiumExchange.receiveData(a), e && e()
            })
        },
        receiveData: function (e) {
            PremiumExchange.data = e, PremiumExchange.updateUI()
        },
        updateUI: function () {
            $.each(PremiumExchange.data.stock, function (e, a) {
                var r = $("#premium_exchange_stock_" + e).text(a);
                a >= PremiumExchange.data.capacity[e] ? r.addClass("warn") : r.removeClass("warn"), $("#premium_exchange_buy_" + e).find("input[name='buy_" + e + "']").prop("disabled", a < 1), $("#premium_exchange_sell_" + e).find("input[name='sell_" + e + "']").prop("disabled", a >= PremiumExchange.data.capacity[e])
            }), $.each(PremiumExchange.data.capacity, function (e, a) {
                $("#premium_exchange_capacity_" + e).text(a)
            }), $.each(PremiumExchange.data.rates, function (e, a) {
                $("#premium_exchange_rate_" + e).children().eq(0).html(window.s('<img src="%1" alt="" /> %2', Format.image_src("resources/" + e + "_18x16.png"), PremiumExchange.calculateRateForOnePoint(e)))
            }), $("#premium_exchange_credit").text(PremiumExchange.data.credit), $("#market_merchant_available_count").text(PremiumExchange.data.merchants), $("#market_status_bar").replaceWith(PremiumExchange.data.status_bar)
        },
        inputChanged: function () {
            var e = $(this), a = e.data("resource"), r = e.data("type"),
                t = (r === PremiumExchange.TYPE_BUY ? PremiumExchange.TYPE_SELL : PremiumExchange.TYPE_BUY, e.val()),
                c = $("#premium_exchange_" + r + "_" + a + " .cost-container");
            if (!t) return $(".premium-exchange-input").removeAttr("disabled"), c.find(".icon").show(), c.find(".cost").text("0"), void(PremiumExchange.errors.hasOwnProperty(a) && delete PremiumExchange.errors[a]);
            $(".premium-exchange-input:not([name=" + e.attr("name") + "])").attr("disabled", "disabled"), t = parseInt(t), isNaN(t) && (t = 0);
            var i, n;
            if (r === PremiumExchange.TYPE_BUY ? (n = PremiumExchange.validateBuyAmount(a, t), i = Math.ceil(PremiumExchange.calculateCost(a, t))) : (n = PremiumExchange.validateSellAmount(a, t), i = Math.abs(Math.floor(PremiumExchange.calculateCost(a, -t)))), n === !0) c.find(".icon").show(), c.find(".cost").text(i), PremiumExchange.errors.hasOwnProperty(a) && delete PremiumExchange.errors[a], window.mobile && e.parents("table").eq(0).find(".premium-exchange-error").hide(); else {
                var m = $('<img src="%1" alt="" class="tooltip" />').attr("src", Format.image_src("error.png")).attr("title", n);
                c.find(".icon").hide(), c.find(".cost").html(m), UI.ToolTip(c.find(".tooltip")), PremiumExchange.errors[a] = n, window.mobile && e.parents("table").eq(0).find(".premium-exchange-error").show().find("td").text(n)
            }
        },
        validateBuyAmount: function (e, a) {
            return a <= 0 ? _("7221852782e515e01af552806f0fc5a3") : window.game_data.village.storage_max < a ? _("90f92270724ba1b89f8e243c44e2513f") : !(a > PremiumExchange.data.stock[e]) || _("01ac228f8bc0b2ba1dc93594270c40fe")
        },
        validateSellAmount: function (e, a) {
            return a <= 0 ? _("7221852782e515e01af552806f0fc5a3") : window.game_data.village[e] < a ? _("7f0a8636061a93e0516ae14b94cf9a2c") : !(a + PremiumExchange.data.stock[e] > PremiumExchange.data.capacity[e]) || _("0e1d9c5e4f6152d5cab2fff4aa5b0d22")
        },
        calculateCost: function (res, quantity) {
            var r = PremiumExchange.data.stock[res], t = PremiumExchange.data.capacity[res],
                c = quantity >= 0 ? PremiumExchange.data.tax.buy : PremiumExchange.data.tax.sell;
            return (1 + c) * (PremiumExchange.calculateMarginalPrice(r, t) + PremiumExchange.calculateMarginalPrice(r - quantity, t)) * quantity / 2
        },
        calculateMarginalPrice: function (e, cap) {
            var r = PremiumExchange.data.constants;
            return r.resource_base_price - r.resource_price_elasticity * e / (cap + r.stock_size_modifier)
        },
        marginalInverse: function (res, price) {
            var consts = PremiumExchange.data.constants;
            return (PremiumExchange.data.capacity[res] + consts.stock_size_modifier) * (consts.resource_base_price - price) / consts.resource_price_elasticity;
        },
        calculateRateForOnePoint: function (e) {
            var stock = PremiumExchange.data.stock[e];
            var cap = PremiumExchange.data.capacity[e];
            for (var t = (PremiumExchange.data.tax.buy, PremiumExchange.calculateMarginalPrice(stock, cap)), c = Math.floor(1 / t), i = PremiumExchange.calculateCost(e, c), n = 0; i > 1 && n < 50;)
                c--, n++, i = PremiumExchange.calculateCost(e, c);
            return c
        },
        robertReadableRate: function (e, a) {
            var r = Market.getPremiumRate(a, 1), t = this.icons[e] + r.resources, c = this.icons.premium + r.premium;
            return s("%1 = %2", t, c)
        }
    }
}();


var result = new Map();
for (var i = 1; i < 235000; i *= 2)
    result.set(i, PremiumExchange.calculateCost('wood', i));


prev = PremiumExchange.calculateCost('wood', 1)
for (var i = 2; i < 235000; i++) {
    result.set(i, PremiumExchange.calculateCost('wood', i));
