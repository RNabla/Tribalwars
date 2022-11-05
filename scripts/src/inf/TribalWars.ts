export interface ITribalWars {
    buildURL(method: "POST" | "GET", screen: string, args?: { [name: string]: string }): string;
    fetchDocument(method: "POST" | "GET", screen: string, args: { [name: string]: string | number }): Promise<HTMLElement>;
    fetchJSON<T>(method: "POST" | "GET", screen: string, args: { [name: string]: string }): Promise<T>;
    getGameData(): GameData;
}

export interface GameData {
    units: string[],
    village: GameDataVillage,
    screen: string,
    player: PlayerData
}

export interface PlayerData {
    id: number;
    ally: string;
}

export interface GameDataVillage {
    x: number,
    y: number,
    points: number,
    id: number
}

declare const TribalWars: {
    buildURL: (method: "POST" | "GET", screen: string, args: { [name: string]: string; }) => string
};

export class TribalWarsProvider implements ITribalWars {
    getGameData(): GameData {
        return window["game_data"];
    }
    buildURL(method: "POST" | "GET", screen: string, args: { [name: string]: string; }): string {
        return TribalWars.buildURL(method, screen, args);
    }

    async fetchDocument(method: "POST" | "GET", screen: string, args: { [name: string]: string; }): Promise<HTMLElement> {
        const url = this.buildURL(method, screen, args);
        const response = await fetch(url);
        const text = await response.text();
        const doc = document.createElement("document");
        doc.innerHTML = text;
        return doc;
    }

    async fetchJSON<T>(method: "POST" | "GET", screen: string, args: { [name: string]: string; }): Promise<T> {
        const url = this.buildURL(method, screen, args);
        const response = await fetch(url);
        return await response.json();
    }
}