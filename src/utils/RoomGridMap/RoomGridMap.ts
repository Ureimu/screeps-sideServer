import { MultiBar, Presets } from "cli-progress";
import {
    AnyRoomObjects,
    RoomObjectType,
    SpecifiedRoomObject
} from "node-ts-screeps-api/dist/src/rawApiType/roomObjects";
import { DrawMap } from "utils/blockVisual/draw";
import { CONTROLLER_STRUCTURES } from "utils/common/constants";
import { BuildableStructureConstant, ControllerLevel } from "utils/common/type";
import { Grid } from "utils/Grid/Grid";
import { Coord, GridPosition } from "utils/Grid/type";
import { SvgCode } from "utils/SvgCode";
import { getStructureTypeBySpecifiedName } from "./nameList";
import { CacheLayoutData, LayoutStructure, RoomGridPosition, SpecifiedStructureNameList } from "./type";

export class RoomGridMap extends Grid {
    public static multiBar = new MultiBar(
        {
            clearOnComplete: false,
            hideCursor: true
        },
        Presets.shades_grey
    );
    public grid: RoomGridPosition[][] = this.grid;
    public layoutStructures: LayoutStructure[] = [];
    public visualizeDataList: SvgCode[] = [];
    public centerPos?: Coord;
    public structureNumber: {
        [name: string]: {
            origin: { [level in ControllerLevel]?: number };
            total: { [level in ControllerLevel]: number };
            totalLimit: { [level in ControllerLevel]: number };
        };
    } = {};
    public gridPos(coord: Coord): RoomGridPosition {
        return this.grid[coord.x][coord.y];
    }
    private readonly terrainMap: { "0": "plain"; "1": "wall"; "2": "swamp"; "3": "wall" } = {
        "0": "plain",
        "1": "wall",
        "2": "swamp",
        "3": "wall"
    };
    private readonly terrainCost: { plain: number; wall: number; swamp: number } = {
        plain: this.BASE_COST * 2,
        wall: this.MAX_COST,
        swamp: this.BASE_COST * 10
    };
    private readonly roadCost = this.BASE_COST;
    public walkableBorderPos: Coord[];
    public constructor(
        public readonly terrainData: string,
        public readonly objects: AnyRoomObjects[],
        public readonly roomName: string,
        public readonly name: string
    ) {
        super({ x: 50, y: 50 }, 1);
        this.grid = (this.grid as GridPosition[][]).map((xStack, x) => {
            return xStack.map((pos, y) => {
                const terrainType = this.terrainMap[terrainData[x + y * 50] as "0" | "1" | "2" | "3"];
                const terrainCost = this.terrainCost[terrainType];
                return {
                    ...pos,
                    cost: terrainCost,
                    terrain: this.terrainMap[terrainData[x + y * 50] as "0" | "1" | "2" | "3"],
                    objects: this.getObjectsInPos({ x, y }, objects),
                    layout: []
                };
            });
        });
        this.walkableBorderPos = this.grid.flat(1).filter(pos => {
            if (pos.terrain !== "wall" && (pos.x === 0 || pos.y === 0 || pos.x === 49 || pos.y === 49)) {
                return true;
            } else {
                return false;
            }
        });
    }

    private getStatsOfStructure(type: BuildableStructureConstant, level: ControllerLevel, num: number): number {
        let numList = this.structureNumber[type];
        if (!numList)
            this.structureNumber[type] = {
                origin: {},
                total: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
                totalLimit: CONTROLLER_STRUCTURES[type]
            };
        numList = this.structureNumber[type];

        const levelData = numList.origin[level];
        if (!levelData) {
            numList.origin[level] = num;
        } else {
            (numList.origin[level] as number) += num;
        }

        let sumNum = 0;
        for (let i = 0; i <= level; i++) {
            const index = i as ControllerLevel;
            const originData = numList.origin[index];
            if (originData) sumNum += originData;
            numList.total[index] = sumNum;
            if (numList.total[index] > numList.totalLimit[index]) {
                // 超出数量限制了
                (numList.origin[level] as number) -= num;
                return numList.totalLimit[index] - numList.total[index];
            }
        }
        return numList.totalLimit[level] - numList.total[level];
    }

    /**
     * 添加建筑到layout，总会返回当前rcl等级限制的最大建筑数量与当前的建筑总数的差值，
     * 如果超限会返回负数且不会添加任何建筑。
     *
     * @param {BuildableStructureConstant} type
     * @param {ControllerLevel} level
     * @param {number} priority
     * @param {...Coord[]} structures
     * @returns {number}
     * @memberof RoomGridMap
     */
    public addStructure(
        type: SpecifiedStructureNameList<BuildableStructureConstant>,
        level: ControllerLevel,
        priority: number,
        ...structures: Coord[]
    ): number {
        const structureType = getStructureTypeBySpecifiedName(type);
        const exceededNum = this.getStatsOfStructure(structureType, level, structures.length);
        if (exceededNum < 0) return exceededNum;
        const typedStructures = structures
            .filter(i => {
                const gridPos = this.gridPos(i);
                if (
                    gridPos.cost === this.MAX_COST &&
                    structureType !== "rampart" &&
                    structureType !== "road" &&
                    !(structureType === "extractor" && gridPos.objects.some(j => j.type === "mineral"))
                ) {
                    return false;
                }
                if (gridPos.cost === this.roadCost && structureType !== "container" && type !== "rampart") {
                    return false;
                }
                return true;
            })
            .map(i => {
                return { ...i, type, levelToBuild: level, priority };
            });
        this.layoutStructures.push(...typedStructures);
        typedStructures.forEach(structure => {
            const gridPos = this.gridPos(structure);
            gridPos.layout.push(structure);
            this.setCostForPos(gridPos);
        });
        return exceededNum;
    }

    public addStructureByFillingLevel(
        type: SpecifiedStructureNameList<BuildableStructureConstant>,
        priority: (level: ControllerLevel, index: number, pos: Coord) => number,
        structures: Coord[]
    ): number {
        const coords = structures.map(coord => {
            return { x: coord.x, y: coord.y };
        });
        coords.reverse();
        let pos = coords.pop();
        let i = 0;
        let j = 0;
        let k = 0;
        // console.log(`start ${coords.length}`);
        while (pos) {
            const level = i as ControllerLevel;
            const exceededNum = this.addStructure(type, level, priority(level, k, pos), pos);
            if (exceededNum >= 0) {
                // console.log(`put level:${i}`);
                j++;
            }
            if (exceededNum < 0 && i < 8) {
                i++;
                // console.log(`upgrade level:${i}`);
                continue;
            }
            if (i >= 8 && exceededNum < 0) break;

            k++;
            // console.log(`str num:${k}`);
            pos = coords.pop();
        }
        // console.log(`end ex:${j}`);
        return j;
    }

    /**
     * 从layout移除建筑，总会返回当前rcl等级限制的最大建筑数量与当前的建筑总数的差值，
     *
     * @param {BuildableStructureConstant} type
     * @param {ControllerLevel} level
     * @param {number} priority
     * @param {...Coord[]} structures
     * @returns {number}
     * @memberof RoomGridMap
     */
    public removeStructure(
        type: SpecifiedStructureNameList<BuildableStructureConstant>,
        ...structuresPos: Coord[]
    ): number {
        let deleteNum = 0;
        const structureType = getStructureTypeBySpecifiedName(type);
        structuresPos.forEach(structure => {
            const gridPos = this.gridPos(structure);
            const layout = gridPos.layout;
            const index = layout.findIndex(layoutStructure => layoutStructure.type === type);
            if (index !== -1) {
                const deletedStructure = layout.splice(index, 1)[0];
                this.setCostForPos(gridPos);
                this.getStatsOfStructure(structureType, (deletedStructure.levelToBuild ?? 0) as ControllerLevel, -1);
                deleteNum++;
            }
        });
        const exceededNum = -deleteNum;
        return exceededNum;
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

    private getCostByPos(pos: Coord): number {
        const gridPos = this.gridPos(pos);
        const costList = gridPos.layout
            .map(structure => {
                const type = structure.type;
                const structureType = getStructureTypeBySpecifiedName(type);
                if (structureType === "rampart" || structureType === "container") {
                    return -1;
                } else if (structureType === "road") {
                    return this.roadCost;
                } else {
                    return this.MAX_COST;
                }
            })
            .filter(x => x > 0);
        if (costList.length > 0) {
            return Math.max(...costList);
        } else {
            return this.terrainCost[gridPos.terrain];
        }
    }

    private setCostForPos(pos: Coord): void {
        const cost = this.getCostByPos(pos);
        if (cost !== this.gridPos(pos).cost) {
            if (!this.costHasChanged) this.costHasChanged = true;
            this.gridPos(pos).cost = cost;
        }
    }

    /**
     * 画出布局图像
     *
     * @param {string} savePath
     * @returns {Promise<void>}
     * @memberof RoomGridMap
     */
    public async drawMap(savePath: string): Promise<void> {
        const progressBar = RoomGridMap.multiBar.create(1000, 0);
        await new DrawMap().getVisual(
            this.terrainData,
            [...this.objects, ...this.layoutStructures],
            this.visualizeDataList,
            progressBar,
            savePath
        );
        RoomGridMap.multiBar.stop();
    }

    public rPosStr(coord: Coord): string {
        return `x${coord.x}y${coord.y}r${this.roomName}`;
    }
    public freeSpacePosList: string[] = [];

    public generateLayoutData(): CacheLayoutData {
        const firstSpawn = this.layoutStructures.find(i => i.type === "spawn" && i.levelToBuild === 1);
        if (!firstSpawn) throw Error("no first spawn");
        if (!this.centerPos) throw Error("no centerPos");
        const data: CacheLayoutData = {
            layout: {},
            firstSpawn: { pos: this.rPosStr(firstSpawn) },
            freeSpacePosList: this.freeSpacePosList,
            centerPos: this.rPosStr(this.centerPos)
        };
        this.layoutStructures.forEach(i => {
            const structureType = getStructureTypeBySpecifiedName(i.type);
            if (!data.layout[structureType]) {
                data.layout[structureType] = {};
            }
            if (!data.layout[structureType][i.type]) {
                data.layout[structureType][i.type] = { requireList: [] };
            }
            data.layout[getStructureTypeBySpecifiedName(i.type)][i.type].requireList.push([
                this.rPosStr(i),
                i.levelToBuild,
                i.priority
            ]);
        });
        return data;
    }

    private borderCache: { [range: number]: Coord[] } = {};
    public isNotCloseToWalkableBorder(coordList: Coord[], range: number): boolean {
        if (!this.borderCache[range]) {
            this.borderCache[range] = [];
            this.walkableBorderPos.forEach(pos => this.borderCache[range].push(...this.squarePos(pos, range)));
            this.borderCache[range] = _.uniq(this.borderCache[range], pos => {
                return this.posStr(pos);
            });
        }
        return coordList.every(pos => {
            return this.borderCache[range].every(borderPos => !this.isEqual(pos, borderPos));
        });
    }
}

function anyObjectIsTyped<T extends RoomObjectType>(type: T) {
    return (anyObject: AnyRoomObjects): anyObject is SpecifiedRoomObject<T> => {
        return anyObject.type === type;
    };
}
