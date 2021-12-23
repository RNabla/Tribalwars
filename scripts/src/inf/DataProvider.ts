export interface IDataProvider {
    runtime_timestamp_s: number;
    get_current_timestamp_s(): number;
    get_random_number(min: number, max: number): number;
}

export class DataProvider implements IDataProvider {
    runtime_timestamp_s: number;
    constructor() {
        this.runtime_timestamp_s = this.get_current_timestamp_s();
    }

    public get_current_timestamp_s(): number {
        return Math.floor(Date.now() / 1000);
    }

    public get_random_number(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min) + min);
    }
}