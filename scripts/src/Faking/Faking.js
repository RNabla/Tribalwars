import { Logger } from '../inf/Logger'
import { MapFiles } from '../inf/MapFiles';
import { Settings } from './Faking.settings';
import { two_digit_number, get_timestamp_s } from '../inf/Helper'

const resources = require('./Faking.resources')
const LAYOUT_BLOCK_ENTRY = { EXPIRATION_TIME: 0, TARGET: 1 };
const LAYOUT_TARGET = { X: 0, Y: 1, PLAYER_ID: 2, PLAYER_NAME: 3, ALLY_TAG: 4 };
const LAYOUT_DATE_RANGE = { FROM: 0, TO: 1 };
const LAYOUT_DATE_RANGE_PART = { DAY: 0, MONTH: 1, YEAR: 2, HOUR: 3, MINUTE: 4 };
const PLAYER_ID_BARBARIAN = "0";
const ALLY_ID_NONE = "0";

export const Faking = {
    map_files: null,
    logger: null,
    world_info: null,
    units: null,
    settings: {},
    input_data: async function (troops, target) {
        Faking.logger.entry(arguments);

        for (const unit in troops) {
            document.querySelector(`#unit_input_${unit}`).value = troops[unit] > 0
                ? troops[unit]
                : '';
        }

        const target_input = document.querySelector('.target-input-field');
        if (target_input) {
            target_input.value = `${target[LAYOUT_TARGET.X]}|${target[LAYOUT_TARGET.Y]}`;
        }
        else {
            document.querySelector('#inputx').value = target[LAYOUT_TARGET.X];
            document.querySelector('#inputy').value = target[LAYOUT_TARGET.Y];
        }

        const troops_speed = Faking.get_troops_speed(troops);
        const arrival_time = Faking.calculate_arrival_time(target, troops_speed);

        Faking.logger.log('Speed: ', troops_speed, 'Arrival time', arrival_time);

        let player_info = '';
        if (target[LAYOUT_TARGET.PLAYER_NAME]) {
            player_info += target[LAYOUT_TARGET.PLAYER_NAME];
        }
        if (target[LAYOUT_TARGET.ALLY_TAG]) {
            player_info += ` [${target[LAYOUT_TARGET.ALLY_TAG]}]`;
        }

        const notification = resources["ATTACK_TIME"]
            .replace('__DAY__', two_digit_number(arrival_time.getDate()))
            .replace('__MONTH__', two_digit_number(arrival_time.getMonth() + 1))
            .replace('__HOURS__', two_digit_number(arrival_time.getHours()))
            .replace('__MINUTES__', two_digit_number(arrival_time.getMinutes()))
            .replace('__PLAYER_INFO__', player_info)
            .replace('__TARGET__', `${target[LAYOUT_TARGET.X]}|${target[LAYOUT_TARGET.Y]}`);

        await Faking.add_to_block_tables(target);

        UI.SuccessMessage(notification);
        Faking.logger.exit();
    },
    calculate_arrival_time: function (target, troops_speed) {
        const distance = Faking.calculate_distance(target);
        return new Date((Faking.current_timestamp_s + distance * troops_speed * 60) * 1000);
    },
    calculate_distance: function (target) {
        return Math.hypot(
            game_data.village.x - target[LAYOUT_TARGET.X],
            game_data.village.y - target[LAYOUT_TARGET.Y]
        );
    },
    load_config: async function (user_configuration) {
        Faking.logger.entry(arguments);

        if (typeof (user_configuration) !== "object") {
            throw resources["ERROR_CONFIGURATION_MISSING"];
        }

        if (user_configuration.forum_config != undefined) {
            const forum_config = user_configuration.forum_config;
            if (typeof (forum_config.spoiler_name) !== "string") {
                throw resources["ERROR_FORUM_CONFIG_SPOILER_NAME"];
            }
            if (isNaN(parseInt(forum_config.thread_id))) {
                throw resources["ERROR_FORUM_CONFIG_THREAD_ID"];
            }
            forum_config.thread_id = parseInt(forum_config.thread_id);
            Faking.logger.log(forum_config);
            user_configuration = await Faking.load_config_from_forum(forum_config);
        }

        const default_settings = Settings;

        for (const option_name in user_configuration) {
            if (!default_settings.hasOwnProperty(option_name)) {
                throw resources["ERROR_CONFIGURATION_OPTION_UNKNOWN"];
            }
        }

        const converters = {
            date_ranges: function (option_value) {
                // [dd.mm.yyyy hh:ss - dd.mm.yyyy hh:ss] | [hh:ss - hh:ss]
                const parse_date_range = function (template) {
                    const parts = template.match(/\d+/g) || [];
                    if (parts.length == 5 || parts.length == 2) {
                        return [-1, -1, -1, ...parts.map(Number)].slice(-5);
                    }
                    return null;
                }

                const templates = [];

                if (Array.isArray(option_value)) {
                    for (const template of option_value) {
                        if (typeof (template) == "string") {
                            const parts = template.split('-');
                            if (parts.length == 2) {
                                const result = [
                                    parse_date_range(parts[0]),
                                    parse_date_range(parts[1])
                                ];
                                if (result[0] && result[1]) {
                                    templates.push(result);
                                }
                            }
                        }
                    }

                    return templates;
                }
            },
            boundaries: function (option_value) {
                const boundaries = [];
                if (Array.isArray(option_value)) {
                    for (const boundary of option_value) {
                        if (boundary.hasOwnProperty('center') && typeof (boundary.center) === 'string') {
                            boundary.center = boundary.center.split('|').map(Number);
                        }
                        boundaries.push(boundary);
                    }
                }
                return boundaries;
            }
        };

        for (const option_name in default_settings) {
            if (user_configuration[option_name] != null) {
                const converter = converters[option_name];
                Faking.settings[option_name] = converter
                    ? converter(user_configuration[option_name])
                    : JSON.parse(JSON.stringify(user_configuration[option_name]));
            } else {
                Faking.settings[option_name] = default_settings[option_name];
            }
        }

        Faking.logger.log('Configuration', Faking.settings);
        Faking.logger.exit();
    },
    load_config_from_forum: async function (forum_config) {
        Faking.logger.entry(arguments);

        const user_configuration = await Faking.map_files.get_or_compute_dynamic(
            async function (config) {
                const url = TribalWars.buildURL('GET', 'forum', {
                    screenmode: 'view_thread',
                    thread_id: config.thread_id,
                    page: config.page || 0
                });

                Faking.logger.log('Fetching', url);
                const response = await fetch(url);
                const text = await response.text();
                const thread = document.createElement('document');
                thread.innerHTML = text;

                const forum_content = [...thread.querySelectorAll('div.forum-content')].pop();

                if (!forum_content) {
                    throw resources["ERROR_FORUM_CONFIG_THREAD_DOES_NOT_EXIST"];
                }

                const spoiler_buttons = forum_content.querySelectorAll(`div.spoiler > input[value="${config.spoiler_name}"]`)

                if (spoiler_buttons.length == 0) {
                    throw resources["ERROR_FORUM_CONFIG_SPOILER_NONE"];
                }
                if (spoiler_buttons.length > 1) {
                    throw resources["ERROR_FORUM_CONFIG_SPOILER_MULTIPLE"];
                }

                const spoiler_button = spoiler_buttons[0];

                const spoiler = spoiler_button.parentElement;

                Faking.logger.log(spoiler);

                const code_snippets = spoiler.querySelectorAll('pre');

                if (code_snippets.length == 0) {
                    throw resources["ERROR_FORUM_CONFIG_CODE_SNIPPET_NONE"];
                }
                if (code_snippets.length > 1) {
                    throw resources["ERROR_FORUM_CONFIG_CODE_SNIPPET_MULTIPLE"];
                }
                const code_snippet = code_snippets[0].innerText;

                const user_configuration = JSON.parse(code_snippet);

                Faking.logger.log('Extracted', code_snippet, user_configuration);

                return user_configuration;
            }, forum_config, forum_config.ttl || 3600);

        Faking.logger.exit();

        return user_configuration;
    },
    check_screen: function () {
        if (document.querySelector('.jump_link')) {
            this.change_village(resources["ERROR_SCREEN_VILLAGE_OUT_OF_GROUP"]);
        }
        if (game_data.screen !== 'place' || $('#command-data-form').length !== 1) {
            location = TribalWars.buildURL('GET', 'place', { mode: 'command' });
            throw resources["ERROR_SCREEN_REDIRECT"];
        }
        // disable executing script on screen with command confirmation
        if (document.querySelector('#troop_confirm_go') ||
            document.querySelector('#troop_confirm_submit')) {
            throw resources["ERROR_SCREEN_NO_ACTION"];
        }
    },
    change_village: function (reason) {
        if (Faking.settings["changing_village_enabled"]) {
            const switchRight = document.querySelector('#village_switch_right');
            const jumpLink = document.querySelector('.jump_link');
            if (switchRight) {
                location = switchRight.href;
            }
            else if (jumpLink) {
                location = jumpLink.href;
            }
        }
        throw reason;
    },
    select_troops: function () {
        Faking.logger.entry(arguments);
        Faking.clear_form();

        if (Faking.settings.troops_templates.length > 0) {
            for (const template of Faking.settings.troops_templates) {
                const template_copy = JSON.parse(JSON.stringify(template));
                if (Faking.try_select_troops(template_copy)) {
                    Faking.logger.log('Selecting', template_copy)
                    Faking.logger.exit();
                    return template_copy;
                }
            }
            Faking.change_village(resources["ERROR_TROOPS_NOT_ENOUGH"]);
        }
        Faking.change_village(resources["ERROR_TROOPS_EMPTY"]);
        Faking.logger.exit();
    },
    try_select_troops: function (template) {
        Faking.logger.entry(arguments);
        const available_troops = Faking.get_available_troops();
        Faking.logger.log('Available troops', available_troops);

        Faking.logger.log('Inspecting', template);
        for (const unit in template) {
            if (available_troops[unit] < template[unit]) {
                Faking.logger.log('Skipping template. Required ', unit, ':', template[unit], ' got only', available_troops[unit]);
                return false;
            }
        }

        const fake_limit = Number(Faking.world_info.config.game.fake_limit); // HACK

        if (fake_limit == 0) {
            Faking.logger.log("There is no fake limit");
            Faking.logger.exit();
            return template;
        }

        if (template['spy'] == 5 && Object.keys(template).filter(unit => unit !== 'spy').every(unit => template[unit] == 0)) {
            Faking.logger.log("Special case. Only 5 spies");
            Faking.logger.exit();
            return template;
        }

        const population_required = Math.floor(game_data.village.points * fake_limit * 0.01);
        Faking.logger.log('Population required', population_required);
        const template_population = Faking.count_population(template);
        Faking.logger.log('Template population', template_population);

        for (const unit of Faking.units) {
            if (!template.hasOwnProperty(unit)) {
                template[unit] = 0;
            }
        }

        const fill_troops = Faking.settings.fill_troops.split(',');
        let population_left = population_required - template_population;

        Faking.logger.log('fill_troops', fill_troops);

        for (const fill_entry of fill_troops) {
            const parts = fill_entry.split(':'); // configuration syntax: unit_name[:max_count]
            const unit = parts[0];
            const counts = [];

            if (available_troops[unit] - template[unit] > 0) {
                counts.push(available_troops[unit] - template[unit]);
            }

            if (parts.length > 1) {
                counts.push(Number(parts[1]));
            }

            if (counts.length > 0) {
                if (!Faking.settings.fill_exact || (Faking.settings.fill_exact > population_left > 0)) {
                    counts.push(Math.ceil(population_left / Faking.world_info.unit_info[unit].pop));
                }
                const unit_count = Math.min(...counts);
                template[unit] += unit_count;
                population_left -= Faking.world_info.unit_info[unit].pop * unit_count;
                Faking.logger.log('Population left', population_left, 'fill_entry', fill_entry, 'unit', unit, 'unit_count', unit_count);
            }
        }
        Faking.logger.exit();
        return population_left <= 0;
    },
    select_target: async function (troops) {
        Faking.logger.entry(arguments);
        const troops_speed = Faking.get_troops_speed(troops);
        Faking.logger.log('Troops speed', troops_speed);
        let pool = await Faking.pool_get();
        Faking.logger.log('Initial pool', pool);
        pool = await Faking.pool_apply_troops_constraints(pool, troops);
        Faking.logger.log('After applying troops constraints', pool);
        pool = await Faking.pool_apply_blocking(pool);
        Faking.logger.log('After blocking', pool);
        pool = await Faking.pool_apply_date_ranges(pool, troops);
        Faking.logger.log('After applying date ranges ', pool);
        const target = pool[Math.floor(Math.random() * pool.length)];
        Faking.logger.log("Returning", target);
        Faking.logger.exit();
        return target;
    },
    pool_get: async function () {
        Faking.logger.entry(arguments);

        const args = {
            allies: Faking.settings.allies,
            ally_tags: Faking.settings.ally_tags,
            players: Faking.settings.players,
            include_barbarians: Faking.settings.include_barbarians,
            boundaries: Faking.settings.boundaries,
            coords: Faking.settings.coords
        };

        const pool = await Faking.map_files.get_or_compute(
            async function (world_info, args) {
                Faking.logger.entry();
                const players = args.players.split(',').map(x => x.trim().toLowerCase());
                const allies = args.allies.split(',').map(x => x.trim().toLowerCase());
                const ally_tags = args.ally_tags.split(',').map(x => x.trim().toLowerCase());

                Faking.logger.log('Players', players, 'Allies', allies, 'Ally tags', ally_tags);

                const ally_ids = new Set(world_info.ally
                    .filter(x =>
                        allies.includes(x.name.toLowerCase()) ||
                        ally_tags.includes(x.tag.toLowerCase())
                    )
                    .map(x => x.id)
                );

                const player_ids = new Set(world_info.player
                    .filter(x =>
                        players.includes(x.name.toLowerCase()) ||
                        ally_ids.has(x.ally_id)
                    )
                    .map(x => x.id)
                );

                Faking.logger.log('Player ids', player_ids);
                const unique_villages = new Set();
                const pool = [];

                let villages = world_info.village
                    .filter(x => (args.include_barbarians && x.player_id === PLAYER_ID_BARBARIAN) || player_ids.has(x.player_id));

                Faking.logger.log('Villages before applying boundaries', villages);

                if (args.boundaries.length) {
                    villages = villages
                        .filter(village => Faking.is_in_any_boundary(village, args.boundaries))
                }

                Faking.logger.log('Villages after applying boundaries', villages);

                for (const village of villages) {
                    const player_metadata = village.player_id !== PLAYER_ID_BARBARIAN
                        ? world_info.player.find(x => x.id == village.player_id)
                        : null;
                    const ally_metadata = player_metadata != null && player_metadata.ally_id !== ALLY_ID_NONE
                        ? world_info.ally.find(x => x.id == player_metadata.ally_id)
                        : null;

                    const player_name = player_metadata ? player_metadata.name : null;
                    const ally_tag = ally_metadata ? ally_metadata.tag : null;

                    pool.push([village.x, village.y, village.player_id, player_name, ally_tag]);

                    unique_villages.add(village.x * 1000 + village.y);
                }

                const coords_regex = new RegExp(/\d{1,3}\|\d{1,3}/g);
                const coords_matches = args.coords.match(coords_regex);
                if (coords_matches != null) {
                    for (const coords of coords_matches.map(x => x.split('|').map(Number))) {
                        const village_key = coords[0] * 1000 + coords[1];
                        if (!unique_villages.has(village_key)) {
                            const village = world_info.village.find(x => x.x == coords[0] && x.y == coords[1]);
                            if (village) {
                                pool.push([village.x, village.y, village.player_id]);
                                unique_villages.add(village_key);
                            }
                        }
                    }
                }
                Faking.logger.exit();
                return pool;
            },
            ['ally', 'player', 'village'],
            args
        );

        if (pool.length === 0) {
            throw resources["ERROR_POOL_EMPTY"];
        }
        Faking.logger.exit(pool);
        return pool;
    },
    is_in_any_boundary: function (village, boundaries) {
        for (const boundary of boundaries) {
            if (boundary.hasOwnProperty('center')) {
                const dx = boundary.center[0] - village.x;
                const dy = boundary.center[1] - village.y;
                if (dx * dx + dy * dy <= boundary.r * boundary.r) {
                    Faking.logger.log('Accepting village', village, ' in circle');
                    return true;
                }
            }
            else if (boundary.hasOwnProperty('min_x')) {
                if (boundary.min_x <= village.x && village.x <= boundary.max_x &&
                    boundary.min_y <= village.y && village.y <= boundary.max_y) {
                    Faking.logger.log('Accepting village', village, ' in box');
                    return true;
                }
            }
        }
        return false;
    },
    pool_apply_date_ranges: async function (pool, troops) {
        Faking.logger.entry(arguments);
        const troops_speed = Faking.get_troops_speed(troops);

        const only_spies = Object.keys(troops).filter(unit => unit !== 'spy').every(unit => troops[unit] == 0);

        if (Faking.world_info.config.night.active === "1" && Faking.settings.skip_night_bonus && !only_spies) {
            const start_hour = Number(Faking.world_info.config.night.start_hour);
            const end_hour = Number(Faking.world_info.config.night.end_hour);
            pool = pool.filter(target => {
                if (target[LAYOUT_TARGET.PLAYER_ID] === PLAYER_ID_BARBARIAN) {
                    return true;
                }
                const arrival_time = Faking.calculate_arrival_time(target, troops_speed);
                if (start_hour > end_hour) { // 23-8
                    return arrival_time.getHours() < start_hour && arrival_time.getHours() > (end_hour - 1);
                }
                return start_hour <= arrival_time.getHours() && arrival_time <= (end_hour - 1);
            });
            if (pool.length === 0) {
                throw resources["ERROR_POOL_EMPTY_NIGHT_BONUS"];
            }
        }

        const get_minutes = function (day_parts) {
            return day_parts[LAYOUT_DATE_RANGE_PART.HOUR] * 60 + day_parts[LAYOUT_DATE_RANGE_PART.MINUTE];
        };

        Faking.logger.log('Faking.settings.date_ranges', Faking.settings.date_ranges);

        if (Faking.settings.date_ranges.length > 0) {
            const snapshot = pool;

            for (const date_range of Faking.settings.date_ranges) {
                Faking.logger.log('date_range', date_range)

                let filter_function = null;

                if (date_range[LAYOUT_DATE_RANGE.FROM][LAYOUT_DATE_RANGE_PART.DAY] != -1 &&
                    date_range[LAYOUT_DATE_RANGE.TO][LAYOUT_DATE_RANGE_PART.DAY] != -1) {

                    const lower_bound = new Date(
                        date_range[LAYOUT_DATE_RANGE.FROM][LAYOUT_DATE_RANGE_PART.YEAR],
                        date_range[LAYOUT_DATE_RANGE.FROM][LAYOUT_DATE_RANGE_PART.MONTH] - 1,
                        date_range[LAYOUT_DATE_RANGE.FROM][LAYOUT_DATE_RANGE_PART.DAY],
                        date_range[LAYOUT_DATE_RANGE.FROM][LAYOUT_DATE_RANGE_PART.HOUR],
                        date_range[LAYOUT_DATE_RANGE.FROM][LAYOUT_DATE_RANGE_PART.MINUTE],
                    );

                    const upper_bound = new Date(
                        date_range[LAYOUT_DATE_RANGE.TO][LAYOUT_DATE_RANGE_PART.YEAR],
                        date_range[LAYOUT_DATE_RANGE.TO][LAYOUT_DATE_RANGE_PART.MONTH] - 1,
                        date_range[LAYOUT_DATE_RANGE.TO][LAYOUT_DATE_RANGE_PART.DAY],
                        date_range[LAYOUT_DATE_RANGE.TO][LAYOUT_DATE_RANGE_PART.HOUR],
                        date_range[LAYOUT_DATE_RANGE.TO][LAYOUT_DATE_RANGE_PART.MINUTE],
                    );

                    Faking.logger.log('lower_bound', lower_bound, 'upper_bound', upper_bound);

                    filter_function = function (target) {
                        const arrival_time = Faking.calculate_arrival_time(target, troops_speed);
                        Faking.logger.log(target, lower_bound <= arrival_time && arrival_time <= upper_bound, arrival_time);
                        return lower_bound <= arrival_time && arrival_time <= upper_bound;
                    };
                }
                else {
                    const minutes_from = get_minutes(date_range[LAYOUT_DATE_RANGE.FROM]);
                    const minutes_to = get_minutes(date_range[LAYOUT_DATE_RANGE.TO]);

                    Faking.logger.log('Minutes from', minutes_from, minutes_to);

                    filter_function = function (target) {
                        const arrival_time = Faking.calculate_arrival_time(target, troops_speed);
                        const minutes_arrival = get_minutes([-1, -1, -1, arrival_time.getHours(), arrival_time.getMinutes()]);
                        Faking.logger.log(target, minutes_arrival, minutes_from <= minutes_arrival && minutes_arrival <= minutes_to, arrival_time);
                        return minutes_from <= minutes_arrival && minutes_arrival <= minutes_to;
                    };
                }

                pool = snapshot.filter(filter_function);

                if (pool.length > 0) {
                    break;
                }
            }

            if (pool.length == 0) {
                throw resources["ERROR_POOL_EMPTY_DATE_RANGES"];
            }
        }

        Faking.logger.exit(pool);
        return pool;
    },
    pool_apply_troops_constraints: function (pool, troops) {
        Faking.logger.entry(arguments);
        if (troops.snob > 0) {
            Faking.logger.log(pool.map(x => Faking.calculate_distance(x)));
            pool = pool.filter(x => Faking.calculate_distance(x) < Number(Faking.world_info.config.snob.max_dist));
            if (pool.length === 0) {
                Faking.change_village(resources["ERROR_POOL_EMPTY_SNOBS"]);
            }
        }
        Faking.logger.exit(pool);
        return pool;
    },
    pool_apply_blocking: async function (pool) {
        Faking.logger.entry(arguments);
        if (Faking.settings.blocking_enabled) {
            pool = await Faking.pool_apply_blocking_local(pool);
            pool = await Faking.pool_apply_blocking_global(pool);
        }
        Faking.logger.exit(pool);
        return pool;
    },
    pool_apply_blocking_local: async function (pool) {
        Faking.logger.entry(arguments);

        pool = await Faking.pool_apply_block_table(
            pool,
            Faking.blocking_local_get_key(),
            Faking.settings.blocking_local.count,
            Faking.settings.blocking_local.block_players
        );

        Faking.logger.exit(pool);
        return pool;
    },
    pool_apply_blocking_global: async function (pool) {
        Faking.logger.entry(arguments);

        for (const blocking of Faking.settings.blocking_global) {
            pool = await Faking.pool_apply_block_table(
                pool,
                Faking.blocking_global_get_key(blocking.name),
                blocking.count,
                blocking.block_players
            );
        }
        Faking.logger.exit(pool);
        return pool;
    },
    blocking_local_get_key: function () {
        if (Faking.settings.blocking_local.scope === 'village') {
            return `blocking.l.${game_data.village.id}`;
        }
        return {
            village_id: game_data.village.id,
            settings: Faking.settings
        };
    },
    blocking_global_get_key: function (name) {
        return `blocking.g.${name}`;
    },
    pool_apply_block_table: async function (pool, key, count, block_players) {
        Faking.logger.entry(arguments);

        const block_table = await Faking.block_table_get(key);
        const village_map = new Map();
        const player_map = new Set();

        const map_function = function (target) {
            return target[LAYOUT_TARGET.X] * 1000 + target[LAYOUT_TARGET.Y];
        }

        for (const block_entry of block_table) {
            const map_key = map_function(block_entry[LAYOUT_BLOCK_ENTRY.TARGET]);
            if (village_map.has(map_key)) {
                village_map.set(map_key, village_map.get(map_key) + 1);
            } else {
                village_map.set(map_key, 1);
            }
            if (block_players) {
                const player_id = block_entry[LAYOUT_BLOCK_ENTRY.TARGET][LAYOUT_TARGET.PLAYER_ID];
                if (player_id != PLAYER_ID_BARBARIAN) {
                    player_map.add(player_id);
                }
            }
        }

        Faking.logger.log(village_map, player_map);
        Faking.logger.log('Block table', block_table);

        pool = pool.filter(target => {
            const map_key = map_function(target);
            return (village_map.get(map_key) || 0) < count;
        });

        if (pool.length === 0) {
            throw resources["ERROR_POOL_EMPTY_BLOCKED_VILLAGES"];
        }

        if (block_players) {
            pool = pool.filter(target => {
                const player_id = target[LAYOUT_TARGET.PLAYER_ID];
                return !player_map.has(player_id);
            });
            if (pool.length === 0) {
                throw resources["ERROR_POOL_EMPTY_BLOCKED_PLAYERS"]
            }
        }

        Faking.logger.log('After applying block table', key, pool);

        Faking.logger.exit(pool);

        return pool;
    },
    add_to_block_tables: async function (target) {
        if (Faking.settings.blocking_enabled) {
            await Faking.block_table_add_entry(
                target,
                Faking.blocking_local_get_key(),
                Faking.settings.blocking_local.time_s
            );
            for (const global_entry of Faking.settings.blocking_global) {
                await Faking.block_table_add_entry(
                    target,
                    Faking.blocking_global_get_key(global_entry.name),
                    global_entry.time_s
                );
            }
        }
    },
    block_table_get: async function (key) {
        Faking.logger.entry(arguments);
        let block_table = await Faking.map_files.get_item(key) || [];

        const cutoff_time = parseInt(Date.now() / 1000);

        for (let i = 0; i < block_table.length; i++) {
            if (block_table[i][LAYOUT_BLOCK_ENTRY.EXPIRATION_TIME] > cutoff_time) {
                if (i > 0) {
                    Faking.logger.log('Trimming', key, 'block table by', i, 'entries');
                    block_table = block_table.slice(i);
                }
                break;
            }
        }
        Faking.logger.exit(block_table);
        return block_table;
    },
    block_table_add_entry: async function (target, key, ttl /* seconds */) {
        Faking.logger.entry(arguments);
        const block_table = await Faking.block_table_get(key);
        const expiration_time = parseInt(Date.now() / 1000) + ttl;
        const entry = [expiration_time, target];
        Faking.logger.log('Adding block entry', entry);
        block_table.push(entry);
        await Faking.map_files.set_item(key, block_table, ttl);
        Faking.logger.exit();
    },
    get_troops_speed: function (troops) {
        let speed = 0;
        for (const unit in troops) {
            if (troops.hasOwnProperty(unit) && troops[unit] !== 0) {
                speed = Math.max(Number(Faking.world_info.unit_info[unit].speed), speed);
            }
        }
        if (speed === 0) {
            throw resources["ERROR_TROOPS_EMPTY"];
        }
        return speed;
    },
    count_population: function (troops) {
        return Object.keys(troops)
            .map(unit => troops[unit] * Number(Faking.world_info.unit_info[unit].pop))
            .reduce((a, b) => a + b, 0);
    },
    clear_form: function () {
        for (const input of [
            ...document.querySelectorAll('[id^=unit_input_]'),
            document.querySelector('.target-input-field'),
            document.querySelector('#inputx'),
            document.querySelector('#inputy'),
        ]) {
            if (input) { input.value = ''; }
        }
    },
    get_available_troops: function () {
        const available = {};
        for (let unit of Faking.units) {
            available[unit] = Number(document.querySelector(`#unit_input_${unit}`).dataset['allCount']);
            if (Faking.settings.safeguard.hasOwnProperty(unit)) {
                available[unit] = Math.max(0, available[unit] - Faking.settings.safeguard[unit]);
            }
        }
        return available;
    },
    init: async function () {
        Faking.logger.entry(arguments);
        const dependencies = ['config', 'unit_info'];
        Faking.world_info = await Faking.map_files.get_world_info(dependencies);
        Faking.units = game_data.units.filter(unit => unit !== 'militia');
        Faking.current_timestamp_s = get_timestamp_s();
        Faking.logger.exit();
    },
    main: async function (namespace, user_configuration) {
        Faking.logger = Logger.create_instance(namespace)
        Faking.map_files = await MapFiles.create_instance(namespace);
        Faking.logger.entry(arguments);
        Faking.check_screen();
        await Faking.load_config(user_configuration);
        await Faking.init();
        const troops = Faking.select_troops();
        const target = await Faking.select_target(troops);
        await Faking.input_data(troops, target);
        Faking.logger.exit();
    }
};