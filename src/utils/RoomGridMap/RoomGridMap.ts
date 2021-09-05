import {
    AnyRoomObjects,
    RoomObjectType,
    SpecifiedRoomObject
} from "node-ts-screeps-api/dist/src/rawApiType/roomObjects";
import { DrawMap } from "utils/blockVisual/draw";
import { BuildableStructureConstant, ControllerLevel } from "utils/common/type";
import { Grid } from "utils/Grid/Grid";
import { Coord } from "utils/Grid/type";
import { LayoutStructure, RoomGridPosition } from "./type";

export class RoomGridMap extends Grid {
    public grid: RoomGridPosition[][] = this.grid;
    public layoutStructures: LayoutStructure[] = [];
    public structureNumber: {
        [name: string]: {
            origin: { [level in ControllerLevel]?: number };
            total: { [level in ControllerLevel]: number };
        };
    } = {};
    private readonly terrainMap: { "0": "plain"; "1": "wall"; "2": "swamp"; "3": "wall" } = {
        "0": "plain",
        "1": "wall",
        "2": "swamp",
        "3": "wall"
    };
    public constructor(public readonly terrainData: string, public readonly objects: AnyRoomObjects[]) {
        super({ x: 50, y: 50 }, 2);
        this.grid = this.grid.map((xStack, x) => {
            return xStack.map((pos, y) => {
                return {
                    ...pos,
                    cost:
                        this.terrainMap[terrainData[x + y * 50] as "0" | "1" | "2" | "3"] === "wall"
                            ? this.MAX_COST
                            : this.BASE_COST,
                    terrain: this.terrainMap[terrainData[x + y * 50] as "0" | "1" | "2" | "3"],
                    objects: this.getObjectsInPos({ x, y }, objects),
                    layout: []
                };
            });
        });
    }

    private getStatsOfStructure(type: BuildableStructureConstant, level: ControllerLevel, num: number) {
        if (!this.structureNumber[type])
            this.structureNumber[type] = {
                origin: {},
                total: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 }
            };
        if (!this.structureNumber[type].origin[level]) this.structureNumber[type].origin[level] = num;
    }

    public addStructure(
        type: BuildableStructureConstant,
        level: ControllerLevel,
        priority: number,
        ...structures: Coord[]
    ): void {
        this.getStatsOfStructure(type, level, structures.length);
        const typedStructures = structures.map(i => {
            return { ...i, type, levelToBuild: level, priority };
        });
        this.layoutStructures.push(...typedStructures);
        structures.forEach(structure => {
            this.grid[structure.x][structure.y].layout.push(...typedStructures);
        });
    }

    public getObjectsInPos(coord: Coord, objects?: AnyRoomObjects[]): AnyRoomObjects[] {
        const { x, y } = coord;
        if (!objects) objects = this.objects;
        return objects.filter(anyObject => anyObject.x === x && anyObject.y === y);
    }

    public findObjects<T extends RoomObjectType>(type: T): SpecifiedRoomObject<T>[] {
        const typed = anyObjectIsTyped(type);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this.objects.filter<SpecifiedRoomObject<T>>(typed);
    }

    public async drawMap(savePath: string): Promise<void> {
        await new DrawMap().getVisual(this.terrainData, [...this.objects, ...this.layoutStructures], savePath);
    }
}

function anyObjectIsTyped<T extends RoomObjectType>(type: T) {
    return (anyObject: AnyRoomObjects): anyObject is SpecifiedRoomObject<T> => {
        return anyObject.type === type;
    };
}
