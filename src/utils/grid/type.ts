import { AnyRoomObjects } from "node-ts-screeps-api/dist/src/rawApiType/roomObjects";

export interface GridPosition {
    x: number;
    y: number;
    terrain: "plain" | "swamp" | "wall";
    objects: AnyRoomObjects[];
}
