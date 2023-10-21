import { LoggerFactory, Logger } from "./Logger";
import { get_digest } from "./Helper";
import { IDataProvider } from "./DataProvider";

async function promisify<T>(object: IDBRequest): Promise<T> {
    const promise = new Promise<T>((resolve, reject) => {
        object.onsuccess = function (event) {
            resolve((event.target as IDBRequest).result);
        };
        object.onerror = function (event) { reject(event); };
    });
    return await promise;
}

const SCHEMA_OBJECT_STORE = "storage";
const SCHEMA_COLUMN_NAME = "name";
const SCHEMA_COLUMN_EXPIRATION_TIME_S = "expiration_time_s";
const SCHEMA_COLUMN_VALUE = "value";
const RW = "readwrite";
const RO = "readonly";

export interface StorageItem<T> {
    [SCHEMA_COLUMN_NAME]: string;
    [SCHEMA_COLUMN_EXPIRATION_TIME_S]: number;
    [SCHEMA_COLUMN_VALUE]: T;
}

export class StorageFactory {
    public static async create_instance(
        data_provider: IDataProvider,
    ) {
        const database_name = "Hermitowski.Storage";

        let logger: Logger = null;
        LoggerFactory.create_instance("StorageFactory", (logger_inst) => { logger = logger_inst; });

        logger.entry(arguments);
        logger.log("Opening database");

        const db$ = window.indexedDB.open(database_name, 1);

        db$.onupgradeneeded = function (event: IDBVersionChangeEvent) {
            const db = (event.target as IDBRequest).result;
            const os = db.createObjectStore(SCHEMA_OBJECT_STORE, { keyPath: SCHEMA_COLUMN_NAME, autoIncrement: false });
            os.createIndex(SCHEMA_COLUMN_NAME, SCHEMA_COLUMN_NAME, { unique: true });
            os.createIndex(SCHEMA_COLUMN_EXPIRATION_TIME_S, SCHEMA_COLUMN_EXPIRATION_TIME_S, { unique: false });
        };

        const db: IDBDatabase = await promisify(db$);

        logger.log("Deleting expired items");

        const cursor = db
            .transaction(SCHEMA_OBJECT_STORE, RW)
            .objectStore(SCHEMA_OBJECT_STORE)
            .index(SCHEMA_COLUMN_EXPIRATION_TIME_S)
            .openCursor(IDBKeyRange.upperBound(data_provider.runtime_timestamp_s));

        cursor.onsuccess = function (event) {
            const c = (event.target as IDBRequest).result as IDBCursorWithValue;
            if (c) {
                logger.log(c);
                c.delete();
                c.continue();
            }
        };

        logger.exit();
        return new Storage(data_provider, db);
    }
}

export class Storage {
    private database: IDBDatabase;
    private logger: Logger;
    private data_provider: IDataProvider;

    constructor(
        data_provider: IDataProvider,
        database: IDBDatabase,
    ) {
        this.data_provider = data_provider;
        this.database = database;
        LoggerFactory.create_instance("Storage", (logger) => { this.logger = logger; });
    }

    private static async get_item_name(user_namespace: string, key: string | object) {
        const item_name = typeof (key) === "string"
            ? key
            : await get_digest(key);
        return user_namespace + "." + item_name;
    }

    public async get_item<T>(user_namespace: string, key: string | object): Promise<StorageItem<T>> {
        this.logger.entry(arguments);
        const item_name = await Storage.get_item_name(user_namespace, key);
        const item: StorageItem<T> = await promisify(this.database
            .transaction(SCHEMA_OBJECT_STORE, RO)
            .objectStore(SCHEMA_OBJECT_STORE)
            .get(item_name)
        );
        this.logger.log(item_name, item, this.data_provider.get_current_timestamp_s());
        this.logger.exit();
        return item ?
            (item[SCHEMA_COLUMN_EXPIRATION_TIME_S] > this.data_provider.get_current_timestamp_s()
                ? item
                : null)
            : null;
    }

    public async set_item<T>(user_namespace: string, key: string | object, value: T, time_to_live_s: number) {
        this.logger.entry(arguments);
        const item_name = await Storage.get_item_name(user_namespace, key);
        const obj: StorageItem<T> = {
            name: item_name,
            expiration_time_s: this.data_provider.get_current_timestamp_s() + time_to_live_s,
            value: value
        };
        this.logger.log(obj);
        await promisify(this.database
            .transaction(SCHEMA_OBJECT_STORE, RW)
            .objectStore(SCHEMA_OBJECT_STORE)
            .put(obj)
        );
        this.logger.exit();
    }

    public async get_or_add_item<T>(user_namespace: string, key: string | object, factory: () => Promise<StorageItem<T>>): Promise<StorageItem<T>> {
        this.logger.entry(arguments);
        const item_name = await Storage.get_item_name(user_namespace, key);
        let item = await promisify<StorageItem<T>>(this.database
            .transaction(SCHEMA_OBJECT_STORE, RO)
            .objectStore(SCHEMA_OBJECT_STORE)
            .get(item_name)
        );
        if (!item || item[SCHEMA_COLUMN_EXPIRATION_TIME_S] < this.data_provider.get_current_timestamp_s()) {
            item = await factory();
            item[SCHEMA_COLUMN_NAME] = item_name;
            this.logger.log("created instance", item);
            await promisify(this.database
                .transaction(SCHEMA_OBJECT_STORE, RW)
                .objectStore(SCHEMA_OBJECT_STORE)
                .put(item)
            );
        }
        item[SCHEMA_COLUMN_NAME] = item_name;
        this.logger.exit(item);
        return item;
    }

    public async get_or_compute_dynamic<T1, T2>(user_namespace: string, factory: (args: T2) => Promise<T1>, args: T2, time_to_live_s: number): Promise<T1> {
        this.logger.entry();
        const digest = await get_digest(factory.toString() + JSON.stringify(args));
        this.logger.log("Digest: ", digest);

        const item = await this.get_or_add_item(user_namespace, digest, async () => {
            this.logger.entry();
            const computed_result = await factory(args);

            const expiration_time_s = this.data_provider.get_current_timestamp_s() + time_to_live_s;
            this.logger.log("Expiration time set to", expiration_time_s);

            const store_result = {
                name: "",
                expiration_time_s: expiration_time_s,
                value: computed_result,
            };
            this.logger.exit();
            return store_result;
        });

        this.logger.exit();
        return item.value;
    }

}