import { Logger } from './Logger'
import { get_digest } from "./Helper";
import { promisify } from "./Helper";

export const SCHEMA_COLUMN_NAME = "name";
export const SCHEMA_COLUMN_VALUE = "value";
export const SCHEMA_COLUMN_EXPIRATION_TIME_S = "expiration_time_s";

export const Storage = {
    create_instance: async function () {
        const core_namespace = 'Hermitowski.Storage';
        const logger = Logger.create_instance(core_namespace);

        const SCHEMA_OBJECT_STORE = "storage";
        const RW = "readwrite";
        const RO = "readonly";
        const DURABILITY_MODE = "relaxed";

        logger.entry(arguments);
        logger.log('Opening database');

        const db$ = window.indexedDB.open(core_namespace, 1);

        db$.onupgradeneeded = function (event) {
            const db = event.target.result;
            const os = db.createObjectStore(SCHEMA_OBJECT_STORE, { keyPath: SCHEMA_COLUMN_NAME, autoIncrement: false });
            os.createIndex(SCHEMA_COLUMN_NAME, SCHEMA_COLUMN_NAME, { unique: true });
            os.createIndex(SCHEMA_COLUMN_EXPIRATION_TIME_S, SCHEMA_COLUMN_EXPIRATION_TIME_S, { unique: false });
        };

        const db = await promisify(db$);

        const get_time_key = function () {
            return parseInt(Date.now() / 1000);
        }

        logger.log('Deleting expired items');

        var cursor = db
            .transaction(SCHEMA_OBJECT_STORE, RW)
            .objectStore(SCHEMA_OBJECT_STORE)
            .index(SCHEMA_COLUMN_EXPIRATION_TIME_S)
            .openCursor(IDBKeyRange.upperBound(get_time_key()));

        cursor.onsuccess = function (event) {
            var c = event.target.result;
            if (c) {
                logger.log(c);
                c.delete();
                c.continue();
            }
        }

        const get_item_name = async function (user_namespace, key) {
            const item_name = typeof (key) === "string"
                ? key
                : await get_digest(key);
            return user_namespace + '.' + item_name;
        };

        logger.exit();
        return {
            get_item: async function (user_namespace, key) {
                logger.entry(arguments);
                const item_name = await get_item_name(user_namespace, key);
                const item = await promisify(db.transaction(SCHEMA_OBJECT_STORE, RO, { durability: DURABILITY_MODE }).objectStore(SCHEMA_OBJECT_STORE).get(item_name));
                logger.log(item_name, item, get_time_key())
                logger.exit();
                return item ?
                    (item[SCHEMA_COLUMN_EXPIRATION_TIME_S] > get_time_key()
                        ? item
                        : null)
                    : null;
            },
            set_item: async function (user_namespace, key, value, time_to_live_s /* seconds */) {
                logger.entry(arguments);
                const item_name = await get_item_name(user_namespace, key);
                const obj = {
                    [SCHEMA_COLUMN_NAME]: item_name,
                    [SCHEMA_COLUMN_EXPIRATION_TIME_S]: get_time_key() + time_to_live_s,
                    [SCHEMA_COLUMN_VALUE]: value
                };
                logger.log(obj);
                await promisify(db.transaction(SCHEMA_OBJECT_STORE, RW).objectStore(SCHEMA_OBJECT_STORE).put(obj));
                logger.exit();
            },
            get_or_add_item: async function (user_namespace, key, factory) {
                logger.entry(arguments);
                const item_name = await get_item_name(user_namespace, key);
                let item = await promisify(db.transaction(SCHEMA_OBJECT_STORE, RO, { durability: DURABILITY_MODE }).objectStore(SCHEMA_OBJECT_STORE).get(item_name));
                if (!item || item[SCHEMA_COLUMN_EXPIRATION_TIME_S] < get_time_key()) {
                    item = await factory();
                    item[SCHEMA_COLUMN_NAME] = item_name;
                    logger.log('created instance', item);
                    await promisify(db.transaction(SCHEMA_OBJECT_STORE, RW, { durability: DURABILITY_MODE }).objectStore(SCHEMA_OBJECT_STORE).put(item));
                }
                item[SCHEMA_COLUMN_NAME] = key;
                logger.log('returning', item);
                logger.exit();
                return item;
            }
        }
    },
};
