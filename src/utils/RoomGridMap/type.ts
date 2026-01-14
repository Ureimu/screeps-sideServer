import { AnyRoomObjects } from "node-ts-screeps-api/dist/src/rawApiType/roomObjects";
import { BuildableStructureConstant, StructureConstant } from "utils/common/type";
import { Coord, GridPosition } from "utils/Grid/type";

export interface RoomGridPosition extends GridPosition {
    terrain: "plain" | "swamp" | "wall";
    objects: AnyRoomObjects[];
    layout: LayoutStructure[];
    /**
     * 表示区域类型。-1为未初始化，0为与出口连接区域，其他正数为特定受保护区域。
     *
     * @type {number}
     * @memberof RoomGridPosition
     */
    group: number;
}

export interface LayoutStructure extends Coord {
    type: SpecifiedStructureNameList<BuildableStructureConstant>;
    levelToBuild: number;
    priority: number;
}

export interface formedLayout {
    [name: string]: SpecifiedLayoutData;
}

export interface SpecifiedLayoutData {
    [name: string]: LayoutDataNode;
}

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
    upgraderPosList: string[];
}

export type StructureTypeFromSpecifiedStructureName<T extends SpecifiedStructureNameList<StructureConstant>> =
    T extends SpecifiedStructureNameList<"container">
        ? "container"
        : T extends SpecifiedStructureNameList<"link">
        ? "link"
        : T extends SpecifiedStructureNameList<"road">
        ? "road"
        : T;
