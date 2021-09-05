export interface BaseObjectInfo {
    x: number;
    y: number;
    type: string;
    mineralType?: string;
}
export type ControllerLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
// type from screeps.d.ts
export type BuildableStructureConstant =
    | STRUCTURE_EXTENSION
    | STRUCTURE_RAMPART
    | STRUCTURE_ROAD
    | STRUCTURE_SPAWN
    | STRUCTURE_LINK
    | STRUCTURE_WALL
    | STRUCTURE_STORAGE
    | STRUCTURE_TOWER
    | STRUCTURE_OBSERVER
    | STRUCTURE_POWER_SPAWN
    | STRUCTURE_EXTRACTOR
    | STRUCTURE_LAB
    | STRUCTURE_TERMINAL
    | STRUCTURE_CONTAINER
    | STRUCTURE_NUKER
    | STRUCTURE_FACTORY;

export type StructureConstant =
    | BuildableStructureConstant
    | STRUCTURE_KEEPER_LAIR
    | STRUCTURE_CONTROLLER
    | STRUCTURE_POWER_BANK
    | STRUCTURE_PORTAL
    | STRUCTURE_INVADER_CORE;

type STRUCTURE_EXTENSION = "extension";
type STRUCTURE_RAMPART = "rampart";
type STRUCTURE_ROAD = "road";
type STRUCTURE_SPAWN = "spawn";
type STRUCTURE_LINK = "link";
type STRUCTURE_WALL = "constructedWall";
type STRUCTURE_KEEPER_LAIR = "keeperLair";
type STRUCTURE_CONTROLLER = "controller";
type STRUCTURE_STORAGE = "storage";
type STRUCTURE_TOWER = "tower";
type STRUCTURE_OBSERVER = "observer";
type STRUCTURE_POWER_BANK = "powerBank";
type STRUCTURE_POWER_SPAWN = "powerSpawn";
type STRUCTURE_EXTRACTOR = "extractor";
type STRUCTURE_LAB = "lab";
type STRUCTURE_TERMINAL = "terminal";
type STRUCTURE_CONTAINER = "container";
type STRUCTURE_NUKER = "nuker";
type STRUCTURE_FACTORY = "factory";
type STRUCTURE_INVADER_CORE = "invaderCore";
type STRUCTURE_PORTAL = "portal";
