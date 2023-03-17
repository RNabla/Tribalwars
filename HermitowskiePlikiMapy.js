/**
 * Script for downloading map files and configs.
 * Created by Hermitowski on 04/08/2019
 *
 * 2023-03-17: added option for fetching recent conquers
 */


async function get_world_info(settings) {
    const start = Date.now();
    const namespace = 'Hermitowski.MapFiles';
    const _bonuses = {
        0: 'none',
        1: 'wood',
        2: 'stone',
        3: 'iron',
        4: 'farm',
        5: 'barracks',
        6: 'stable',
        7: 'garage',
        8: 'eco',
        9: 'storage',
    };
    const _regex = new RegExp(/\+/, 'g');
    const _decode = function (encodedString) {
        return decodeURIComponent(encodedString.replace(_regex, ' '));
    }
    const _bonus = function (id) {
        return _bonuses[id];
    }
    const entities_mapping_info = {
        // sts - server to storage mapper
        // sto - storage to object mapper
        player: {
            id: { idx: 0, sts_mapper: Number, sto_mapper: String },
            name: { idx: 1, sts_mapper: _decode, },
            ally_id: { idx: 2, sts_mapper: Number, sto_mapper: String },
            villages_count: { idx: 3, sts_mapper: Number },
            points: { idx: 4, sts_mapper: Number },
            ranking: { idx: 5, sts_mapper: Number }
        },
        ally: {
            id: { idx: 0, sts_mapper: Number, sto_mapper: String },
            name: { idx: 1, sts_mapper: _decode, },
            tag: { idx: 2, sts_mapper: _decode, },
            players_count: { idx: 3, sts_mapper: Number, },
            villages_count: { idx: 4, sts_mapper: Number },
            top40_points: { idx: 5, sts_mapper: Number },
            points: { idx: 6, sts_mapper: Number },
            ranking: { idx: 7, sts_mapper: Number }
        },
        village: {
            id: { idx: 0, sts_mapper: Number, sto_mapper: String },
            name: { idx: 1, sts_mapper: _decode },
            x: { idx: 2, sts_mapper: Number },
            y: { idx: 3, sts_mapper: Number },
            player_id: { idx: 4, sts_mapper: Number, sto_mapper: String },
            points: { idx: 5, sts_mapper: Number },
            bonus: { idx: 6, sts_mapper: Number, sto_mapper: _bonus }
        }
    }

    function get_key(enity_name, column_name) {
        let key = `${namespace}.${enity_name}`;
        if (column_name) {
            key += `.${column_name}`;
        }
        return key;
    }

    function get_item(key) {
        const value = localStorage.getItem(key);
        return value
            ? JSON.parse(value)
            : null;
    }

    function remove_item(key) {
        localStorage.removeItem(key);
    }

    function set_item(key, item) {
        localStorage.setItem(key, JSON.stringify(item));
    }

    function get_json_from_xml_string(xml_string) {
        const parser = new window.DOMParser();
        const document = parser.parseFromString(xml_string, 'text/xml');
        return convert_xml_to_json(document.children[0]);
    }

    function convert_xml_to_json(root) {
        let obj = {};
        if (root.childElementCount === 0) {
            return root.textContent;
        }
        for (const node of root.children) {
            obj[node.nodeName] = convert_xml_to_json(node);
        }
        return obj;
    }

    function random(min, max) {
        return Math.random() * (max - min) + min;
    }

    function validate_entity_cache(entity_name) {
        const entity_key = get_key(entity_name);
        const entity_info = get_item(entity_key);
        if (entity_info) {
            if (entity_info.expiration_time < Date.now()) {
                for (const column_name of entity_info.column_names) {
                    const column_key = get_key(entity_name, column_name);
                    remove_item(column_key);
                }
                remove_item(entity_key);
            }
        }
    }

    async function save_entity(entity_name, columns, last_modified) {
        const key = get_key(entity_name);
        const entity_info = get_item(key);
        // if entity does not exist in local storage, set expiration time to next update
        // add some random delay to distribute requests to server
        const expiration_time = entity_info
            ? entity_info.expiration_time
            : (last_modified.getTime() + (3600 + random(15, 120)) * 1000);
        const column_names = entity_info
            ? [new Set(...Object.keys(columns), ...entity_info.column_names)]
            : Object.keys(columns);
        for (const column_name in columns) {
            const column_key = get_key(entity_name, column_name);
            set_item(column_key, columns[column_name]);
        }
        set_item(key, { expiration_time, column_names });
    }

    async function fetch_missing_columns_from_server(entity_name, column_names) {
        const response = await fetch(`/map/${entity_name}.txt`)
        const last_modified = new Date(response.headers.get('last-modified'))
        const text = await response.text();
        const lines = text.split('\n').filter(x => x.length > 0);

        const columns = Object.fromEntries(column_names.map(column_name => [column_name, []]));
        const entity_mapping_info = entities_mapping_info[entity_name];

        for (const line of lines) {
            const raw = line.split(',');
            for (const column_name of column_names) {
                const column_mapping_info = entity_mapping_info[column_name];
                const raw_value = raw[column_mapping_info.idx];
                const mapped_value = column_mapping_info.sts_mapper(raw_value);
                columns[column_name].push(mapped_value);
            }
        }

        await save_entity(entity_name, columns, last_modified);
    }

    function get_from_local_storage(entity_name, column_names) {
        const values = {};
        const entity_mapping_info = entities_mapping_info[entity_name];
        for (const column_name of column_names) {
            const sto_mapper = entity_mapping_info[column_name].sto_mapper;
            const column_key = get_key(entity_name, column_name);
            const column_values = get_item(column_key);
            values[column_name] = sto_mapper
                ? column_values.map(column_value => sto_mapper(column_value))
                : column_values;
        }
        const length = values[column_names[0]].length;
        const records = [];
        for (let i = 0; i < length; i++) {
            records.push(Object.fromEntries(column_names.map(column_name => [column_name, values[column_name][i]])));
        }
        return records;
    }

    function get_missing_columns(entity_name, requested_column_names) {
        const key = get_key(entity_name);
        const entity_info = get_item(key);
        if (!entity_info) {
            return requested_column_names;
        }
        return requested_column_names.filter(column_name => !entity_info.column_names.includes(column_name));
    }

    async function get_entity_records(entity_name, column_names) {
        validate_entity_cache(entity_name);
        const missing_columns = get_missing_columns(entity_name, column_names);
        if (missing_columns.length != 0) {
            await fetch_missing_columns_from_server(entity_name, missing_columns);
        }
        return [entity_name, get_from_local_storage(entity_name, column_names)];
    }

    async function get_config(config_name) {
        let config = get_config_from_local_storage(config_name);
        if (!config) {
            config = await get_config_from_server(config_name);
        }
        return [config_name, config];
    }

    function get_config_from_local_storage(config_name) {
        const key = get_key(config_name);
        const item = get_item(key);
        return item;
    }

    async function get_config_from_server(config_name) {
        const response = await fetch(`interface.php?func=get_${config_name}`);
        const content = await response.text();
        const config = get_json_from_xml_string(content);
        const key = get_key(config_name);
        set_item(key, config);
        return config;
    }

    async function get_conquers(settings) {
        let conquers = get_conquers_from_local_storage(settings);
        if (!conquers) {
            conquers = await get_conquers_from_server();
        }
        return ['conquers', conquers];
    }

    function get_conquers_from_local_storage(settings) {
        const key = get_key('conquers');
        const payload = get_item(key);
        const now_s = ~~(Date.now() / 1000);
        if (payload) {
            let freshness_s = 60;
            if (settings.hasOwnProperty('freshness')) {
                freshness_s = settings['freshness'];
            }
            if (freshness_s < 15) {
                freshness_s = 15;
            }
            if ((payload.last_update_s + freshness_s) > now_s) {
                return payload;
            }
        }
        return null;
    }

    async function get_conquers_from_server() {
        // -24h + 5 minutes, so we won't get ERR ONLY_ONE_DAY_AGO
        const now_s = Date.now();
        const since_timestamp_s = ~~((now_s - 24 * 3600 * 1000 + 5 * 60 * 1000) / 1000);
        const last_update_s = ~~(now_s / 1000);
        const response = await fetch(`/interface.php?func=get_conquer&since=${since_timestamp_s}`);
        const content = await response.text();
        const lines = content.split('\n');
        const conquers = [];
        for (let i = 0; i < lines.length; i++) {
            const columns = lines[i].split(',');
            if (columns.length < 4) { continue; }
            conquers.push({
                village_id: Number(columns[0]),
                timestamp: Number(columns[1]),
                owner_new: columns[2],
                owner_old: columns[3]
            });
        }
        const payload = { conquers, since_timestamp_s, last_update_s };
        const key = get_key('conquers');
        set_item(key, payload);
        return payload;
    }

    let requests = [];

    if (settings.hasOwnProperty('entities')) {
        const entities = settings['entities'];
        for (const entity_name of ['player', 'ally', 'village']) {
            if (entities.hasOwnProperty(entity_name)) {
                requests.push(get_entity_records(entity_name, entities[entity_name]))
            }
        }
    }

    if (settings.hasOwnProperty('configs')) {
        const configs = settings['configs'];
        for (const config_name of ['config', 'building_info', 'unit_info']) {
            if (configs.includes(config_name)) {
                requests.push(get_config(config_name));
            }
        }
    }

    if (settings.hasOwnProperty('conquers')) {
        requests.push(get_conquers(settings['conquers']));
    }

    const results = await Promise.all(requests);
    console.log(`${namespace} | Elapsed time: ${Date.now() - start} [ms]`);
    return Object.fromEntries(results);
};

// Example:
// world_settings = {                                  // AVAILABLE options
//     configs: ['config', 'unit_info'],               // config, unit_info, building_info
//     entities: {
//         'ally': ['id'],                             // id, name, tag, players_count, villages_count, top40_points, points, ranking
//         'player': ['id', 'ally_id', 'name'],        // id, name, ally_id, villages_count, points, ranking
//         'village': ['id', 'x', 'y', 'player_id']    // id, name, x, y, player_id, points, bonus
//     },
//     conquers: {
//         freshness: 15                               // (optional) indicates for how long (in seconds) to cache recent results; default: 60, min: 15
//     }
// };
// await get_world_info(world_settings);