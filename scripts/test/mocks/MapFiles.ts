import { IDataProvider } from "../../src/inf/DataProvider";
import { get_digest } from "../../src/inf/Helper";
import { Logger, LoggerFactory } from "../../src/inf/Logger";
import { Config, IMapFiles, UnitInfo, WorldInfo, WorldInfoType } from "../../src/inf/MapFiles";

interface StorageItem {
    value: any,
    item_name: string,
    expiration_time_s: number
}

export abstract class MapFiles implements IMapFiles {
    player: string;
    ally: string;
    village: string;
    storage: Map<string, StorageItem>;
    regex: RegExp;
    building_info: any;
    unit_info: any;
    config: any;
    logger: Logger
    data_provider: IDataProvider;

    constructor(
        data_provider: IDataProvider,
        player: string,
        village: string,
        ally: string,
        config: string,
        unit_info: string,
        building_info: string,
    ) {
        LoggerFactory.create_instance('Hermitowski.MapFilesMock', (logger) => { this.logger = logger; });
        this.player = player;
        this.village = village;
        this.ally = ally;
        this.config = config;
        this.unit_info = unit_info;
        this.building_info = building_info;
        this.storage = new Map();
        this.regex = new RegExp(/\+/, "g");
        this.data_provider = data_provider;
    }

    private decode(encodedString: string) {
        return decodeURIComponent(encodedString.replace(this.regex, " "));
    }

    private get_json_from_xml_string(xml_string: string) {
        const parser = new window.DOMParser();
        const document = parser.parseFromString(xml_string.replace(/\\n/g, ''), "text/xml");
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

    private async get_item_name(key: string | object) {
        const item_name = typeof (key) === "string"
            ? key
            : await get_digest(key);
        return item_name;
    }

    private decode_raw_map_file(raw_map_file: string): string[][] {
        return raw_map_file.split("\n").filter(x => x.trim().length > 0).map(x => x.split(",").map(y => this.decode(y)));
    }

    public async get_world_info(entities: WorldInfoType[]): Promise<WorldInfo> {
        const result: WorldInfo = {
            // ally: null,
            // building_info: null,
            // config: null,
            // player: null,
            // unit_info: null,
            // village: null
        };
        for (const type of entities) {
            if (type === WorldInfoType.config) {
                result[WorldInfoType.config] = (<Config>this.get_json_from_xml_string(this.config));
            }
            if (type === WorldInfoType.unit_info) {
                result[WorldInfoType.unit_info] = (<UnitInfo>this.get_json_from_xml_string(this.unit_info));
            }
            if (type === WorldInfoType.building_info) {
                result[WorldInfoType.building_info] = this.get_json_from_xml_string(this.building_info);
            }
            if (type === WorldInfoType.ally) {
                result[WorldInfoType.ally] = this.decode_raw_map_file(this.ally).map(row => ({
                    id: row[0],
                    name: row[1],
                    tag: row[2]
                }));
            }
            if (type === WorldInfoType.player) {
                result[WorldInfoType.player] = this.decode_raw_map_file(this.player).map(row => ({
                    id: row[0],
                    name: row[1],
                    ally_id: row[2],
                }));
            }
            if (type === WorldInfoType.village) {
                result[WorldInfoType.village] = this.decode_raw_map_file(this.village).map(row => ({
                    id: row[0],
                    x: parseInt(row[2]),
                    y: parseInt(row[3]),
                    player_id: row[4],
                }));
            }
        }

        return result;
    }

    public async get_item(key: string | object): Promise<any> {
        this.logger.entry(arguments);
        const item_name = await this.get_item_name(key);
        this.logger.log("item_name", item_name);
        const storage_item = this.storage.get(item_name);
        this.logger.log("storage_item", storage_item);
        // this.logger.log("current_timestamp_s", this.data_provider.get_current_timestamp_s());
        // this.logger.log("expiration_time_s", storage_item?.expiration_time_s);
        if (storage_item && storage_item.expiration_time_s > this.data_provider.get_current_timestamp_s()) {
            this.logger.exit(storage_item.value);
            return storage_item.value;
        }
        this.logger.exit(null);
        return null;
    }

    public async set_item(key: string | object, value: any, time_to_live_s: number): Promise<void> {
        this.logger.entry(arguments);
        const item_name = await this.get_item_name(key);
        this.logger.log("item_name", item_name);
        const storage_item: StorageItem = {
            value: value,
            expiration_time_s: time_to_live_s + this.data_provider.get_current_timestamp_s(),
            item_name: item_name
        }
        this.logger.log("storage_item", storage_item);
        this.storage.set(item_name, storage_item);
    }

    public async get_or_compute(factory: (world_info: WorldInfo, args2: any) => Promise<any>, dependency_names: WorldInfoType[], name_or_additional_dependencies: any): Promise<any> {
        let item = await this.get_item(name_or_additional_dependencies);
        if (item == null) {
            const world_info = await this.get_world_info(dependency_names);
            item = await factory(world_info, name_or_additional_dependencies);
            await this.set_item(name_or_additional_dependencies, item, 600);
        }
        this.logger.log(item);
        return item;
    }

    public async get_or_compute_dynamic(factory: (any: any) => Promise<any>, args: any, time_to_live_s: number): Promise<any> {
        const digest = await get_digest(factory.toString() + JSON.stringify(args));
        let item = await this.get_item(digest);
        if (item == null) {
            item = await factory(args);
            await this.set_item(digest, item, time_to_live_s);
        }
        return item;
    }

}