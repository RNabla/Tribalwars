/**
 * Created by Izomorfizom on 29.06.2017.
 */

let ResourceCallerManager = {
    resources: ['wood', 'stone', 'iron'],
    safeguard: {
        wood: 28000,
        stone: 30000,
        iron: 25000,
    },
    idleTime: 0,
    hard_limit: 150000,
    perc_limit: 95,
    minimum_transport: 1000
};