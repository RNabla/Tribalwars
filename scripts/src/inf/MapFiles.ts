import { LoggerFactory, Logger } from "./Logger";
import { Storage, StorageFactory, StorageItem } from "./Storage";
import { get_digest, get_timestamp_s } from "./Helper";
import { IDataProvider } from "./DataProvider";

export enum WorldInfoType {
    config = "config",
    building_info = "building_info",
    unit_info = "unit_info",
    village = "village",
    player = "player",
    ally = "ally"
}

export interface WorldInfoCore {
    config?: StorageItem,
    building_info?: StorageItem,
    unit_info?: StorageItem,
    village?: StorageItem,
    player?: StorageItem,
    ally?: StorageItem,
}

export interface WorldInfo {
    config?: Config,
    building_info?: any,
    unit_info?: UnitsInfo,
    village?: Village[],
    player?: Player[],
    ally?: Ally[],
}

export type UnitName = "spear" | "sword" | "axe" | "archer" | "spy" | "light" | "marcher" | "heavy" | "ram" | "catapult" | "knight" | "snob";

export interface UnitInfo {
    attack: string;
    build_time: string;
    carry: string;
    defense: string;
    defense_archer: string;
    defense_cavalry: string;
    pop: string;
    speed: string;
}

export interface Config {
    night: {
        active: string,
        start_hour: string,
        end_hour: string,
    },
    snob: {
        max_dist: string
    },
    game: {
        fake_limit: string
    }
}

export interface UnitsInfo {
    spear?: UnitInfo,
    sword?: UnitInfo,
    axe?: UnitInfo,
    archer?: UnitInfo,
    spy?: UnitInfo,
    light?: UnitInfo,
    marcher?: UnitInfo,
    heavy?: UnitInfo,
    ram?: UnitInfo,
    catapult?: UnitInfo,
    snob?: UnitInfo,
}

export interface Village {
    id: string,
    x: number,
    y: number,
    player_id: string
}

export interface Player {
    id: string,
    name: string,
    ally_id: string
}

export interface Ally {
    id: string,
    name: string,
    tag: string
}

export class MapFilesFactory {
    public static async create_instance(
        user_namespace: string,
        data_provider: IDataProvider,
    ) {
        const storage = await StorageFactory.create_instance(data_provider);
        return new MapFiles(user_namespace, storage, data_provider);
    }
}

export interface IMapFiles {
    get_world_info(entities: WorldInfoType[]): Promise<WorldInfo>;
    get_item(key: string | object): Promise<any>;
    set_item(key: string | object, value: any, time_to_live_s: number): Promise<void>;
    get_or_compute<T1, T2 extends object>(factory: (world_info: WorldInfo, args: T2) => Promise<T1>, dependency_names: WorldInfoType[], name_or_args: T2 | string): Promise<T1>;
    get_or_compute_dynamic<T1, T2>(factory: (args: T2) => Promise<T1>, args: T2, time_to_live_s: number): Promise<T1>;
}

export class MapFiles implements IMapFiles {
    private static namespace = "Hermitowski.MapFiles";
    private user_namespace: string;
    private logger: Logger;
    private storage: Storage;
    private regex: RegExp;
    private data_provider: IDataProvider;

    constructor(
        user_namespace: string,
        storage: Storage,
        data_provider: IDataProvider,
    ) {
        LoggerFactory.create_instance(user_namespace, (logger) => { this.logger = logger; });
        this.user_namespace = user_namespace;
        this.storage = storage;
        this.data_provider = data_provider;
        this.regex = new RegExp(/\+/, "g");
    }

    private async get_world_info_core(entities: WorldInfoType[]): Promise<WorldInfoCore> {
        this.logger.entry(arguments);

        const requests = [];
        for (const entity of entities) {
            const request = this.storage.get_or_add_item(MapFiles.namespace, entity.toString(), async () => {
                return await this.fetch_from_server(entity);
            });
            requests.push(request);
        }

        const responses = await Promise.all(requests);

        const result: WorldInfoCore = {};

        for (let i = 0; i < entities.length; i++) {
            result[entities[i]] = responses[i];
        }

        this.logger.exit(result);
        return result;
    }

    private async fetch_from_server(info_type: WorldInfoType) {
        switch (info_type) {
            case WorldInfoType.village:
                return await this.fetch_from_server_map_files("village", function (row: string[]): Village {
                    return {
                        id: row[0],
                        x: parseInt(row[2]),
                        y: parseInt(row[3]),
                        player_id: row[4],
                    };
                });
            case WorldInfoType.player:
                return await this.fetch_from_server_map_files("player", function (row: string[]): Player {
                    return {
                        id: row[0],
                        name: row[1],
                        ally_id: row[2],
                    };
                });
            case WorldInfoType.ally:
                return await this.fetch_from_server_map_files("ally", function (row: string[]): Ally {
                    return {
                        id: row[0],
                        name: row[1],
                        tag: row[2]
                    };
                });
            case WorldInfoType.building_info:
                return await this.fetch_from_server_config("building_info");
            case WorldInfoType.unit_info:
                return await this.fetch_from_server_config("unit_info");
            case WorldInfoType.config:
                return await this.fetch_from_server_config("config");
        }
    }

    private async fetch_from_server_map_files(entity_name: string, row_mapper: any): Promise<StorageItem> {
        this.logger.entry(arguments);
        const response = await fetch(`map/${entity_name}.txt`);
        const last_modified = new Date(response.headers.get("last-modified"));
        const text = await response.text();
        const lines = text.split("\n");
        const rows = lines.filter(x => x.trim().length > 0).map(x => x.split(",").map(y => this.decode(y)));
        const entities = [];
        for (const row of rows) {
            entities.push(row_mapper(row));
        }

        let expiration_time_s = get_timestamp_s(last_modified) + 3600 + this.data_provider.get_random_number(15, 120);

        // on the server start it refreshes once per 3 hours
        while (expiration_time_s < this.data_provider.get_current_timestamp_s()) {
            expiration_time_s = this.data_provider.get_current_timestamp_s() + 3600;
        }

        const storage_item = {
            name: "",
            expiration_time_s: expiration_time_s,
            value: entities
        };

        this.logger.exit(storage_item);
        return storage_item;
    }

    private async fetch_from_server_config(config_name: string): Promise<StorageItem> {
        this.logger.entry(arguments);
        const response = await fetch(`interface.php?func=get_${config_name}`);
        const content = await response.text();
        const config = this.get_json_from_xml_string(content);
        this.logger.exit();

        const storage_item = {
            name: "",
            expiration_time_s: this.data_provider.get_current_timestamp_s() + 3600,
            value: config
        };

        this.logger.exit(storage_item);
        return storage_item;
    }

    private decode(encodedString: string) {
        return decodeURIComponent(encodedString.replace(this.regex, " "));
    }

    private get_json_from_xml_string(xml_string: string) {
        const parser = new window.DOMParser();
        const document = parser.parseFromString(xml_string, "text/xml");
        return this.convert_xml_to_json(document.children[0]);
    }

    private convert_xml_to_json(root: Node & ParentNode): object | string {
        const obj = {};
        if (root.childElementCount === 0) {
            return root.textContent;
        }
        for (const node of root.children) {
            obj[node.nodeName] = this.convert_xml_to_json(node);
        }
        return obj;
    }

    private convert_to_world_info(world_info_core: WorldInfoCore) {
        return {
            village: world_info_core.village?.value,
            player: world_info_core.player?.value,
            ally: world_info_core.ally?.value,
            config: world_info_core.config?.value,
            building_info: world_info_core.building_info?.value,
            unit_info: world_info_core.unit_info?.value,
        };
    }

    public async get_world_info(entities: WorldInfoType[]): Promise<WorldInfo> {
        this.logger.entry(arguments);

        const world_info_core = await this.get_world_info_core(entities);
        const world_info = this.convert_to_world_info(world_info_core);

        this.logger.exit(world_info);
        return world_info;
    }

    public async get_item(key: string | object): Promise<any> {
        const item = await this.storage.get_item(this.user_namespace, key);
        return item ? item.value : null;
    }

    public async set_item(key: string | object, value: any, time_to_live_s: number) {
        return await this.storage.set_item(this.user_namespace, key, value, time_to_live_s);
    }

    public async get_or_compute<T1, T2 extends object>(
        factory: (world_info: WorldInfo, args: T2) => Promise<T1>,
        dependency_names: WorldInfoType[],
        name_or_args: string | T2
    ): Promise<T1> {
        this.logger.entry(arguments);

        const item_name = typeof (name_or_args) === "string"
            ? name_or_args
            : await get_digest(name_or_args);

        const item = await this.storage.get_or_add_item(this.user_namespace, item_name, async () => {
            this.logger.entry(arguments);

            const world_info_core = await this.get_world_info_core(dependency_names);

            const world_info = this.convert_to_world_info(world_info_core);

            this.logger.log("Passing following arguments into factory method", world_info, name_or_args);
            const computed_result = await factory(
                world_info,
                typeof (name_or_args) === "string" ? undefined : name_or_args
            );
            this.logger.log("Computed result", computed_result);

            const expiration_time_s = Math.min(...dependency_names.map(world_info_type => {
                return world_info_core[world_info_type].expiration_time_s;
            }));

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

    public async get_or_compute_dynamic<T1, T2>(factory: (args: T2) => Promise<T1>, args: T2, time_to_live_s: number): Promise<T1> {
        return this.storage.get_or_compute_dynamic(this.user_namespace, factory, args, time_to_live_s);
    }
}