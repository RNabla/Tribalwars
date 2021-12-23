export interface ITribalWars {
    buildURL(method: "POST" | "GET", screen: string, args: { [name: string]: string }): string;
    fetchDocument(method: "POST" | "GET", screen: string, args: { [name: string]: string | number }): Promise<Document>;
    fetchJSON(method: "POST" | "GET", screen: string, args: { [name: string]: string }): Promise<object>;
    getGameData(): GameData;
}

export interface GameData {
    ["units"]: string[],
    ["village"]: GameDataVillage,
    ["screen"]: string
}

export interface GameDataVillage {
    ["x"]: number,
    ["y"]: number,
    ["points"]: number,
    ["id"]: number
}

export const UI_PROPERTIES = {
    success_message: "SuccessMessage",
    error_message: "ErrorMessage",
};

export const DIALOG_PROPERTIES = {
    show: "show"
}


declare const TribalWars: {
    buildURL: (method: "POST" | "GET", screen: string, args: { [name: string]: string; }) => string
};

export class TribalWarsProvider implements ITribalWars {
    getGameData(): GameData {
        return window["game_data"];
    }
    buildURL(method: "POST" | "GET", screen: string, args: { [name: string]: string; }): string {
        return TribalWars["buildURL"](method, screen, args);
    }

    async fetchDocument(method: "POST" | "GET", screen: string, args: { [name: string]: string; }): Promise<Document> {
        const url = this.buildURL(method, screen, args);
        const response = await fetch(url);
        const text = await response.text();
        const doc = document.createElement("document");
        doc.innerHTML = text;
        return document;
    }

    async fetchJSON(method: "POST" | "GET", screen: string, args: { [name: string]: string; }): Promise<object> {
        const url = this.buildURL(method, screen, args);
        const response = await fetch(url);
        return await response.json();
    }
}