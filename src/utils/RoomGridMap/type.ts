import { AnyRoomObjects } from "node-ts-screeps-api/dist/src/rawApiType/roomObjects";
import { BuildableStructureConstant, StructureConstant } from "utils/common/type";
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

export type formedLayout = {
    [structureName in BuildableStructureConstant]?: SpecifiedLayoutData<structureName>;
};

export type SpecifiedLayoutData<structureName extends BuildableStructureConstant> = {
    [specifiedName in SpecifiedStructureNameList<structureName>]?: LayoutDataNode;
};

export interface LayoutDataNode {
    /**
     * posStr,levelToBuild,priority
     *
     * @type {[string, number, number]}
     * @memberof LayoutDataNode
     */
    requireList: LayoutRequireList;
}

export type SpecifiedStructureNameList<T extends StructureConstant> = T extends "container"
    ? "sourceContainer" | "controllerContainer" | "mineralContainer" | SpecifiedOutwardsStructureNameList<T>
    : T extends "link"
    ? "sourceLink" | "controllerLink" | "centerLink" | SpecifiedOutwardsStructureNameList<T>
    : T extends "road"
    ? "baseRoad" | "sourceAndControllerRoad" | "mineralRoad" | "aroundSpawnRoad" | SpecifiedOutwardsStructureNameList<T>
    : T;

export type SpecifiedOutwardsStructureNameList<T extends StructureConstant> = T extends "container"
    ? "sourceContainer" | "mineralContainer"
    : T extends "road"
    ? "outwardsSourceRoad" | "passerbyRoad" | "outwardsMineralRoad"
    : never;

export type LayoutRequireList = [posStr: string, levelToBuild: number, priority: number][];

export interface CacheLayoutData {
    layout: formedLayout;
    firstSpawn: {
        pos: string;
    };
    centerPos: string;
    freeSpacePosList: string[];
}
