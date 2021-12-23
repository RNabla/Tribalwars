import { IDataProvider } from "../../src/inf/DataProvider";
import { get_timestamp_s } from "../../src/inf/Helper";

export class DataProvider implements IDataProvider {
    date: Date;
    offset_s: number;
    constructor(
        date: Date
    ) {
        this.date = date;
        this.runtime_timestamp_s = get_timestamp_s(date);
        this.offset_s = get_timestamp_s(new Date()) - get_timestamp_s(date);
    }

    runtime_timestamp_s: number;

    get_current_timestamp_s(): number {
        return get_timestamp_s(new Date()) - this.offset_s;
    }

    get_random_number(min: number, max: number): number {
        return min;
    }
}