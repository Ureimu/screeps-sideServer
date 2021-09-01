import {
    AnyRoomObjects,
    RoomObjectType,
    SpecifiedRoomObject
} from "node-ts-screeps-api/dist/src/rawApiType/roomObjects";
import { GridPosition } from "./type";

export class GridMap {
    public grid: GridPosition[][];
    private terrainMap: { "0": "plain"; "1": "wall"; "2": "swamp"; "3": "wall" } = {
        "0": "plain",
        "1": "wall",
        "2": "swamp",
        "3": "wall"
    };
    public objects: AnyRoomObjects[];
    public constructor(terrainData: string, objects: AnyRoomObjects[]) {
        this.grid = Array(50)
            .fill(0)
            .map((_m, x) => {
                return Array(50)
                    .fill(0)
                    .map((_n, y) => {
                        return {
                            x,
                            y,
                            terrain: this.terrainMap[terrainData[x + y * 50] as "0" | "1" | "2" | "3"],
                            objects: this.getObjectsInPos(x, y, objects)
                        };
                    });
            });
        this.objects = objects;
    }

    public getObjectsInPos(x: number, y: number, objects: AnyRoomObjects[]): AnyRoomObjects[] {
        return objects.filter(anyObject => anyObject.x === x && anyObject.y === y);
    }

    public findObjects<T extends RoomObjectType>(type: T): SpecifiedRoomObject<T>[] {
        const typed = anyObjectIsTyped(type);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this.objects.filter<SpecifiedRoomObject<T>>(typed);
    }

    public getDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
        return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    }
}

function anyObjectIsTyped<T extends RoomObjectType>(type: T) {
    return (anyObject: AnyRoomObjects): anyObject is SpecifiedRoomObject<T> => {
        return anyObject.type === type;
    };
}
