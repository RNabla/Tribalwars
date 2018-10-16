/**
 * Created by Izomorfizom on 29.06.2017.
 */

function getNeeds() {
    let needs = [];
    let storage = game_data.village.storage_max;
    for (let i = 0; i < ResourceCallerManager.resources.length; i++) {
        let aux = Math.floor(Math.min(
            ResourceCallerManager.perc_limit * storage / 100,
            ResourceCallerManager.hard_limit,
            (storage - ResourceCallerManager.idleTime * 3600 * game_data.village[ResourceCallerManager.resources[i] + '_prod']),
            storage));
        aux -= Math.floor(Number($('#total_' + ResourceCallerManager.resources[i])[0].innerText.replace('.', ''))) + game_data.village[ResourceCallerManager.resources[i]];
        needs.push(aux < 0 ? 0 : aux);
    }
    return needs;
}

function removeUselessVillages() {
    let needs = getNeeds();
    let list = $('#village_list')[0].rows;
    for (let i = list.length; --i > 0;) {
        let enoughResources = false;
        let maximum_transport = 0;
        for (let j = 0; j < ResourceCallerManager.resources.length; j++) {
            let freeResource = Math.floor($($(list[i]).find('.' + ResourceCallerManager.resources[j])[0]).attr('data-res')) - ResourceCallerManager.safeguard[ResourceCallerManager.resources[j]];
            if (freeResource > 0 && needs[j] !== 0) {
                maximum_transport += freeResource;
                enoughResources += needs[j] !== 0;
            }
        }
        if (maximum_transport < ResourceCallerManager.minimum_transport)
            enoughResources = false;
        if ($(list[i]).attr('data-capacity') === "0" || !enoughResources)
            list[i].remove();
    }
}

function normalize(needs) {
    let sum = needs.reduce((a, b) => a + b, 0);
    if (sum === 0) return 0;
    for (let i = 0; i < needs.length; i++)
        needs[i] /= sum;
    return sum;
}

function takeSome(taken, needs, free, capacity) {
    let ratio = free.slice(0);
    if (!normalize(ratio)) return 0;
    let take = [];
    for (let i = 0; i < ratio.length; i++) {
        take[i] = Math.floor(Math.min(ratio[i] * capacity, free[i], needs[i]));
        if (take[i] > needs[i])
            take[i] = needs[i];
        taken[i] += take[i];
        needs[i] -= take[i];
        free[i] -= take[i];
        if (needs[i] === 0)
            free[i] = 0;
    }
    return normalize(take);
}

function balanse(needs, free, cap) {
    let needsCopy = needs.slice();
    let freeCopy = free.slice();
    let capCopy = cap;
    let taken = [];
    for (let j = 0; j < ResourceCallerManager.resources.length; j++)
        taken.push(0);
    let rescue = 0;
    while (true) {
        let piece = takeSome(taken, needs, free, cap);
        cap -= piece;
        if (cap === 0 || piece === 0) break;
        if (rescue++ === 42) throw "EndlessLoop\tN: " + needsCopy + "\tF: " + freeCopy + "\tcap: " + capCopy;
    }
    return taken;
}

function recalculate() {
    let needs = getNeeds();
    if (normalize(needs.slice(0)) === 0) {
        $('.supply_location').each(function () {
            this.remove();
        });
        let successMessage = "Wezwano wystarczającą ilość surowców";
        UI.SuccessMessage(successMessage, 2500);
        return;
    }
    let list = $('#village_list')[0].rows;
    for (let i = list.length; --i > 0;) {

        let free = [];
        for (let j = 0; j < ResourceCallerManager.resources.length; j++) {
            let aux = $($(list[i]).find('.' + ResourceCallerManager.resources[j])[0]).attr('data-res') - ResourceCallerManager.safeguard[ResourceCallerManager.resources[j]];
            free.push(aux < 0 ? 0 : aux);
        }
        let taken = balanse(needs.slice(0), free, parseInt($(list[i]).attr('data-capacity')));
        for (let j = 0; j < ResourceCallerManager.resources.length; j++) {
            $(list[i]).find('.' + ResourceCallerManager.resources[j] + ' input')[0].value = taken[j];
        }
    }
}

try {
    if (game_data.screen !== 'market' || game_data.mode !== 'call')
        location = game_data.link_base_pure + "market&mode=call";
    else {
        if ($('.hermiSurki').length === 0) {
            let villageList = $('#village_list');
            villageList.addClass('hermiSurki');
            let needs = getNeeds();
            removeUselessVillages();
            let callButtons = $('.call_button');
            if ($(villageList).find('input:text').length === 0) {
                callButtons.trigger('\x63\x6c\x69\x63\x6b');
                setTimeout(function () {
                    recalculate();
                }, 42);
                setTimeout(function () {
                    callButtons.on('\x63\x6c\x69\x63\x6b', function () {
                        this.parentNode.parentNode.remove();
                        setTimeout(function () {
                            removeUselessVillages();
                            recalculate();
                        }, 500);
                    });
                }, 2 * 42);
            }
            else {
                UI.ErrorMessage('Aby skrypt zadziałał przeładuj stronę i spróbuj ponownie.\r\nAutomatycznie przeładowanie strony za <strong>1s</strong>', 5000);
                setTimeout(() => location.reload(true), 1000);
            }
        }
    }
} catch (err) {
    let message = "Wystąpił&nbspnieoczekiwany&nbspbłąd. Spróbuj&nbspponownie,&nbspjeżeli&nbspbłąd&nbspsię&nbsppowtarza&nbspto napisz&nbspdo&nbsp<strong>Hermitowski</strong>ego albo na&nbspforum&nbspw&nbspwątku&nbsptego&nbspskryptu. Załącz&nbspkomunikat&nbspo&nbspbłędzie,&nbspktóry&nbspjest&nbspw&nbspkonsoli&nbspprzeglądarki.";
    console.log(err);
    UI.ErrorMessage(message, 5000);
}