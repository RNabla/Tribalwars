import { GameData, ITribalWars } from "../../src/inf/TribalWars";

export class TribalWarsProvider implements ITribalWars {
    game_data: GameData;
    constructor(game_data: GameData) {
        this.game_data = game_data;
    }

    buildURL(_1: "POST" | "GET", _2: string, _3: { [name: string]: string; }): string {
        throw new Error("Method not implemented.");
    }
    fetchDocument(_1: "POST" | "GET", _2: string, _3: { [name: string]: string; }): Promise<HTMLElement> {
        throw new Error("Method not implemented.");
    }
    fetchJSON<T>(_1: "POST" | "GET", _2: string, _3: { [name: string]: string; }): Promise<T> {
        throw new Error("Method not implemented.");
    }
    getGameData(): GameData {
        return this.game_data;
    }
}