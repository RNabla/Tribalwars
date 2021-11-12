export const Settings = {
    "safeguard": {},
    "troops_templates": [
        { "spy": 1, "ram": 1 },
        { "spy": 1, "catapult": 1 },
        { "ram": 1 },
        { "catapult": 1 }
    ],
    "fill_exact": false,
    "fill_troops": 'spear,sword,axe,archer,spy,light,marcher,heavy,ram,catapult',
    "changing_village_enabled": true,
    "coords": '',
    "players": '',
    "allies": '',
    "ally_tags": '',
    "include_barbarians": false,
    "boundaries": [
        // { min_x: 400, max_x: 500, min_y: 400, max_y: 500 },
        // { r: 30, center: [500, 500] }
    ],
    "forum_config": {
        "thread_id": null,
        "page": 0,
        "spoiler_name": null,
        "ttl": 300
    },
    "blocking_enabled": false,
    "blocking_local": { "time_s": 5, "count": 1, "block_players": true, "scope": 'village' },
    "blocking_global": [
        // { time_s: 10, count: 1, name: 'global_1', block_players: false }
    ],
    "skip_night_bonus": true,
    "date_ranges": [
        // [dd.mm.yyyy hh:ss - dd.mm.yyyy hh:ss]
        // [hh:ss - hh:ss]
    ]
}