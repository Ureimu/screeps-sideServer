import { AnyRoomObjects } from "node-ts-screeps-api/dist/src/rawApiType/roomObjects";
import { Coord, GridPosition } from "utils/Grid/type";

export interface RoomGridPosition extends GridPosition {
    terrain: "plain" | "swamp" | "wall";
    objects: AnyRoomObjects[];
    layout: LayoutStructure[];
}

export interface LayoutStructure extends Coord {
    type: string;
    levelToBuild?: number;
    priority: number;
}
