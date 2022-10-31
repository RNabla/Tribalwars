import { ITWMapProvider, ITWMap } from "../ITWMap";

declare const TWMap: ITWMap;

export class TWMapProvider implements ITWMapProvider {
    map: ITWMap;
    constructor() {
        this.map = typeof (TWMap) === "undefined" ? null : TWMap;
    }
    get(): ITWMap {
        return this.map;
    }
}
