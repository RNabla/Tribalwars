export interface ITWMapProvider {
    get(): ITWMap;
}

export interface ITWMap {
    allyRelations: {
        [key: string]: string,
    },
    friends: {
        [key: string]: boolean,
    },
    non_attackable_players: string[],

    villageColors: {
        [key: string]: Color
    },
    villages: {
        [key: string]: TWMapVillage,
    }
    map: {
        handler: {
            onClick: (x: number, y: number, event: Event) => boolean;
        },
        viewport: {
            [0]: number,
            [1]: number,
            [2]: number,
            [3]: number,
        }
    },
    size: {
        [0]: number,
        [1]: number
    },
    pos: {
        [0]: number,
        [1]: number
    },

    getColorByPlayer(player_id: string, ally_id: number, village_id: string): Color
}

export interface TWMapVillage {
    ally_id: string,
    bonus_id: number | null,
    id: string,
    owner: string,
    name: string,
    xy: number,
    img: number
}

export const TWMapVillageGhostVillageImg = 51;

export interface Color {
    [0]: number,
    [1]: number,
    [2]: number,
}
