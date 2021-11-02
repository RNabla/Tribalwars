import { Logger } from "./Logger";
import { Storage, SCHEMA_COLUMN_NAME, SCHEMA_COLUMN_EXPIRATION_TIME_S, SCHEMA_COLUMN_VALUE } from './Storage'
import { get_digest, get_timestamp_s, random_int } from "./Helper";

export const MapFiles = {
    create_instance: async function (user_namespace) {
        const namespace = 'Hermitowski.MapFiles';
        const logger = Logger.create_instance(namespace);

        const db = await Storage.create_instance(user_namespace);

        const get_world_info_core = async function (entities) {
            logger.entry(arguments);

            var requests = [];
            for (const entity of entities) {
                var request = db.get_or_add_item(namespace, entity, async function () { return await fetch_from_server(entity); });
                requests.push(request);
            }

            var responses = await Promise.all(requests);
            var result = {};
            for (const response of responses) {
                result[response.name] = response;
            }
            logger.exit();
            return result;
        };

        const fetch_from_server = async function (entity_name) {
            switch (entity_name) {
                case 'village':
                    return await fetch_from_server_map_files(entity_name, (row) => ({ id: row[0], x: parseInt(row[2]), y: parseInt(row[3]), player_id: row[4] }));
                case 'player':
                    return await fetch_from_server_map_files(entity_name, (row) => ({ id: row[0], name: row[1], ally_id: row[2] }));
                case 'ally':
                    return await fetch_from_server_map_files(entity_name, (row) => ({ id: row[0], name: row[1], tag: row[2] }));
                case 'building_info':
                case 'unit_info':
                case 'config':
                    return await fetch_from_server_config(entity_name);
                default:
                    throw new Error(`Not supported entity name - ${entity_name}`);
            }
        }

        const fetch_from_server_map_files = async function (entity_name, row_mapper) {
            logger.entry(arguments);
            const response = await fetch(`map/${entity_name}.txt`);
            const last_modified = new Date(response.headers.get('last-modified'))
            const text = await response.text();
            const lines = text.split("\n");
            const rows = lines.filter(x => x.trim().length > 0).map(x => x.split(",").map(y => decode(y)));
            const entities = [];
            for (const row of rows) {
                entities.push(row_mapper(row));
            }

            let expiration_time_s = get_timestamp_s(last_modified) + 3600 + random_int(15, 120);
            if (expiration_time_s < get_timestamp_s()) {
                expiration_time_s = get_timestamp_s() + 3600;
            }
            logger.exit();
            return {
                [SCHEMA_COLUMN_NAME]: '',
                [SCHEMA_COLUMN_EXPIRATION_TIME_S]: expiration_time_s,
                [SCHEMA_COLUMN_VALUE]: entities
            }
        }

        const fetch_from_server_config = async function (config_name) {
            logger.entry(arguments);
            const response = await fetch(`interface.php?func=get_${config_name}`);
            const content = await response.text();
            const config = get_json_from_xml_string(content);
            logger.exit();
            return {
                [SCHEMA_COLUMN_NAME]: '',
                [SCHEMA_COLUMN_EXPIRATION_TIME_S]: get_timestamp_s() + 3600,
                [SCHEMA_COLUMN_VALUE]: config
            };
        }

        const _regex = new RegExp(/\+/, 'g');
        const decode = function (encodedString) {
            return decodeURIComponent(encodedString.replace(_regex, ' '));
        }

        const get_json_from_xml_string = function (xml_string) {
            const parser = new window.DOMParser();
            const document = parser.parseFromString(xml_string, 'text/xml');
            return convert_xml_to_json(document.children[0]);
        }

        const convert_xml_to_json = function (root) {
            let obj = {};
            if (root.childElementCount === 0) {
                return root.textContent;
            }
            for (const node of root.children) {
                obj[node.nodeName] = convert_xml_to_json(node);
            }
            return obj;
        }

        return {
            get_world_info: async function (entities) {
                logger.entry(arguments);

                const result = await get_world_info_core(entities);

                for (const entity of entities) {
                    result[entity] = result[entity][SCHEMA_COLUMN_VALUE];
                }

                logger.exit();
                return result;
            },
            get_item: async function (key) {
                const item = await db.get_item(user_namespace, key);
                return item ? item[SCHEMA_COLUMN_VALUE] : null;
            },
            set_item: async function (key, value, time_to_live_s) {
                return await db.set_item(user_namespace, key, value, time_to_live_s);
            },
            get_or_compute: async function (factory, dependency_names, name_or_additional_dependencies) {
                logger.entry(arguments);

                const item_name = typeof (name_or_additional_dependencies) === "string"
                    ? name_or_additional_dependencies
                    : await get_digest(name_or_additional_dependencies);

                const instance_creator = async function () {
                    logger.entry(arguments);

                    const dependencies = await get_world_info_core(dependency_names);

                    const world_info = {};

                    for (const dependency_name of dependency_names) {
                        world_info[dependency_name] = dependencies[dependency_name].value;
                    }

                    logger.log('Passing following arguments into factory method', world_info, name_or_additional_dependencies);
                    const result = await factory(world_info, name_or_additional_dependencies);
                    logger.log('Computed result', result);

                    const expiration_time = Math.min(...Object.keys(dependencies)
                        .map(x => dependencies[x][SCHEMA_COLUMN_EXPIRATION_TIME_S])
                    );
                    logger.log(`Expiration time set to`, expiration_time);

                    const store_result = {
                        [SCHEMA_COLUMN_NAME]: '',
                        [SCHEMA_COLUMN_EXPIRATION_TIME_S]: expiration_time,
                        [SCHEMA_COLUMN_VALUE]: result,
                    }
                    logger.exit();
                    return store_result;
                };

                var item = await db.get_or_add_item(user_namespace, item_name, instance_creator);

                logger.exit();
                return item.value;
            },
            get_or_compute_dynamic: async function (factory, args, time_to_live_s) {
                logger.entry();
                const digest = await get_digest(factory.toString() + JSON.stringify(args));
                logger.log('Digest: ', digest);

                const instance_creator = async function () {
                    logger.entry();
                    const compute_result = await factory(args);

                    const expiration_time = get_timestamp_s() + time_to_live_s;
                    logger.log(`Expiration time set to`, expiration_time);

                    const store_result = {
                        [SCHEMA_COLUMN_NAME]: '',
                        [SCHEMA_COLUMN_EXPIRATION_TIME_S]: expiration_time,
                        [SCHEMA_COLUMN_VALUE]: compute_result,
                    };
                    logger.exit();
                    return store_result;
                };

                var item = await db.get_or_add_item(user_namespace, digest, instance_creator);

                logger.exit();
                return item.value;
            }
        };
    },
};
