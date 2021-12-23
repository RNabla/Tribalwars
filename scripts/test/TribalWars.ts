import { GameData, ITribalWars } from "../src/inf/TribalWars";

export class TribalWarsProvider implements ITribalWars {
    game_data: GameData;
    constructor(game_data: GameData) {
        this.game_data = game_data;
    }

    buildURL(method: "POST" | "GET", screen: string, args: { [name: string]: string; }): string {
        throw new Error("Method not implemented.");
    }
    fetchDocument(method: "POST" | "GET", screen: string, args: { [name: string]: string; }): Promise<Document> {
        throw new Error("Method not implemented.");
    }
    fetchJSON(method: "POST" | "GET", screen: string, args: { [name: string]: string; }): Promise<object> {
        throw new Error("Method not implemented.");
    }
    getGameData(): GameData {
        return this.game_data;
    }
}