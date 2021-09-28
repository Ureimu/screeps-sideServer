import { PriorityQueue } from "utils/PriorityQueue/priorityQueue";

import {
    AreaLimitType,
    BasePosOpts,
    Coord,
    FindAreaOpts,
    FindAreaReturn,
    GridPosition,
    PathFinderOpts,
    PathNode,
    PathResult,
    weightedAdjacencyList,
    WeightedAdjacencyNode
} from "./type";

export class Grid {
    public grid: GridPosition[][];
    public readonly MAX_COST = 2 ** 10;
    public readonly rangeSettings: { xMin: number; yMin: number; xMax: number; yMax: number } = {
        xMin: 1,
        yMin: 1,
        xMax: 48,
        yMax: 48
    }; // creep至少可以走到1，防止建筑被打到就只能放到大于5的位置
    public gridPos(coord: Coord): GridPosition {
        return this.grid[coord.x][coord.y];
    }
    public constructor(gridSize: Coord, public BASE_COST: number) {
        this.grid = Array(gridSize.x)
            .fill(0)
            .map((_m, x) => {
                return Array(gridSize.y)
                    .fill(0)
                    .map((_n, y) => {
                        return {
                            x,
                            y,
                            cost: BASE_COST
                        };
                    });
            });
    }
    /**
     * 获取两个坐标之间的距离
     *
     * @param {Coord} a
     * @param {Coord} b
     * @returns {number}
     * @memberof Grid
     */
    public getDistance(a: Coord, b: Coord): number {
        return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    }

    public isEqual(a: Coord, b: Coord): boolean {
        return a.x === b.x && a.y === b.y;
    }

    private ifInBorder(coord: Coord): boolean {
        const { x, y } = coord;
        const { xMin, yMin, xMax, yMax } = this.rangeSettings;
        if (x < xMin || y < yMin || x > xMax || y > yMax) {
            return false;
        } else {
            return true;
        }
    }

    private managePosOpts<T>(defaultOpts: Exclude<T, undefined>, opts?: Partial<T>): Exclude<T, undefined> {
        if (!opts) {
            return _.cloneDeep(defaultOpts);
        } else {
            return _.assign(_.cloneDeep(defaultOpts), opts);
        }
    }

    private basePosOpts: BasePosOpts = {
        ignoreStructure: false,
        ignoreWall: false,
        ignoreBorderLimit: false
    };
    /**
     * 获取某点周围正方形内的位置坐标
     *
     * @param {Coord} pos
     * @param {number} range
     * @param {boolean} [blankSpace=true]
     * @returns {Coord[]}
     * @memberof Grid
     */
    public squarePos(pos: Coord, range: number, opts?: Partial<BasePosOpts>): Coord[] {
        opts = this.managePosOpts(this.basePosOpts, opts);
        const { x, y } = pos;
        const coordList = [];
        for (let i = -range; i <= range; i++) {
            for (let j = -range; j <= range; j++) {
                const coord = { x: x + i, y: y + j };
                if (this.ifInBorder(coord) && !(i === 0 && j === 0)) {
                    coordList.push(coord);
                }
            }
        }
        if (opts.ignoreWall) return coordList;
        else {
            return coordList.filter(coord => this.grid[coord.x][coord.y].cost < this.MAX_COST);
        }
    }

    /**
     * 获取某点周围正方形（空心）内的位置坐标，
     *
     * @param {Coord} pos
     * @param {number} range
     * @param {boolean} [blankSpace=true]
     * @returns {Coord[]}
     * @memberof Grid
     */
    public hollowSquarePos(pos: Coord, range: number, opts?: Partial<BasePosOpts>): Coord[] {
        opts = this.managePosOpts(this.basePosOpts, opts);
        const { x, y } = pos;
        const coordList = [];
        for (let i = -range; i <= range; i++) {
            for (let j = -range; j <= range; j++) {
                const coord = { x: x + i, y: y + j };
                if (this.ifInBorder(coord) && (i === range || j === range || i === -range || j === -range)) {
                    coordList.push(coord);
                }
            }
        }
        if (opts.ignoreWall) return coordList;
        else {
            return coordList.filter(coord => this.grid[coord.x][coord.y].cost < this.MAX_COST);
        }
    }

    /**
     * 获取某点周围和其x,y坐标之和除2的余数相等的点。
     * ```
     * Y N Y N Y
     * N Y N Y N
     * Y N O N Y
     * N Y N Y N
     * Y N Y N Y
     * ```
     * Y是会取的点，o是给定的坐标
     * @param {Coord} pos
     * @param {number} range
     * @param {Partial<BasePosOpts>} [opts]
     * @returns {Coord[]}
     * @memberof Grid
     */
    public mod2equalPos(pos: Coord, range: number, opts?: Partial<BasePosOpts>): Coord[] {
        opts = this.managePosOpts(this.basePosOpts, opts);
        const { x, y } = pos;
        const coordList = [];
        const posMod2 = (pos.x + pos.y) % 2;
        for (let i = -range; i <= range; i++) {
            for (let j = -range; j <= range; j++) {
                if ((i + j) % 2 !== posMod2) {
                    continue;
                }
                const coord = { x: x + i, y: y + j };
                if (this.ifInBorder(coord) && (i === range || j === range || i === -range || j === -range)) {
                    coordList.push(coord);
                }
            }
        }
        if (opts.ignoreWall) return coordList;
        else {
            return coordList.filter(coord => this.grid[coord.x][coord.y].cost < this.MAX_COST);
        }
    }

    /**
     * 获取某点周围和其x,y坐标之和除2的余数不相等的点。
     * ```
     * N Y N Y N
     * Y N Y N Y
     * N Y O Y N
     * Y N Y N Y
     * N Y N Y N
     * ```
     * Y是会取的点，o是给定的坐标
     * @param {Coord} pos
     * @param {number} range
     * @param {Partial<BasePosOpts>} [opts]
     * @returns {Coord[]}
     * @memberof Grid
     */
    public mod2notEqualPos(pos: Coord, range: number, opts?: Partial<BasePosOpts>): Coord[] {
        opts = this.managePosOpts(this.basePosOpts, opts);
        const { x, y } = pos;
        const coordList = [];
        const posMod2 = (pos.x + pos.y) % 2;
        for (let i = -range; i <= range; i++) {
            for (let j = -range; j <= range; j++) {
                if ((i + j) % 2 === posMod2) {
                    continue;
                }
                const coord = { x: x + i, y: y + j };
                if (this.ifInBorder(coord) && (i === range || j === range || i === -range || j === -range)) {
                    coordList.push(coord);
                }
            }
        }
        if (opts.ignoreWall) return coordList;
        else {
            return coordList.filter(coord => this.grid[coord.x][coord.y].cost < this.MAX_COST);
        }
    }

    /**
     * 获取坐标字符串
     *
     * @param {Coord} pos
     * @returns {string}
     * @memberof Grid
     */
    public posStr(pos: Coord): string {
        return `${pos.x},${pos.y}`;
    }

    /**
     * 编译坐标字符串为坐标
     *
     * @param {string} posStr
     * @returns {Coord}
     * @memberof Grid
     */
    public prasePosStr(posStr: string): Coord {
        const result = posStr.split(",");
        return { x: Number(result[0]), y: Number(result[1]) };
    }

    /**
     * 设置位置的移动消耗，影响寻路算法。最大为this.MAX_COST.在放置建筑之后，cost可能会改变，所以如果想为container位置设置cost，尽量在该位置添加建筑之后再改变该位置的cost
     *
     * @param {Coord} pos
     * @param {number} cost
     * @memberof Grid
     */
    public setCost(pos: Coord, cost: number): void {
        if (!this.costHasChanged) this.costHasChanged = true;
        this.gridPos(pos).cost = cost;
    }

    protected costHasChanged = false;
    protected adListCache?: { costList?: (Coord & { cost: number })[]; adList: weightedAdjacencyList };
    /**
     * 获取当前grid对应的邻接表
     *
     * @readonly
     * @private
     * @type {weightedAdjacencyList}
     * @memberof Grid
     */
    protected getAdList(costList?: (Coord & { cost: number })[]): weightedAdjacencyList {
        if (costList === this.adListCache?.costList && !this.costHasChanged && this.adListCache) {
            return this.adListCache.adList;
        }
        // console.log(`costList?.length: ${costList?.length ?? 0}`);
        const adList: weightedAdjacencyList = {};
        this.grid.forEach(xStack => {
            xStack.forEach(pos => {
                adList[this.posStr(pos)] = this.squarePos(pos, 1)
                    .map(nearPos => {
                        const nearGridPos = this.grid[nearPos.x][nearPos.y];
                        const costListWeight = costList?.find(coord => this.isEqual(coord, nearGridPos))?.cost;
                        // if (costListWeight) console.log(`node ${this.posStr(nearGridPos)} ${costListWeight ?? -1}`);
                        if (nearGridPos.cost !== this.MAX_COST)
                            return {
                                from: this.posStr(pos),
                                to: this.posStr(nearPos),
                                weight: costListWeight ?? nearGridPos.cost
                            };
                        else {
                            return false;
                        }
                    })
                    .filter(val => val) as WeightedAdjacencyNode[];
            });
        });
        this.adListCache = { costList, adList };
        return adList;
    }

    /**
     * 获取一个坐标到另一些坐标的最短距离
     *
     * @param {Coord} startPoint
     * @param {Coord[]} endPointList
     * @returns {number}
     * @memberof Grid
     */
    public getMinDistance(startPoint: Coord, endPointList: Coord[]): number {
        return Math.min(...endPointList.map(endPoint => this.getDistance(startPoint, endPoint)));
    }

    private pathFinderOpts: PathFinderOpts = {
        ...this.basePosOpts,
        AStarWeight: 0,
        costList: []
    };
    /**
     * A\*寻路算法。
     *
     * @param {Coord} startPoint
     * @param {Coord} endPoint
     * @param {number} range
     * @param {number} [AStarWeight=0.5]
     * 启发函数的权重。该权重会影响A\*算法的行为。

    在极端情况下，当启发函数h(n)始终为0，则将由g(n)决定节点的优先级，此时算法就退化成了Dijkstra算法。

    如果h(n)始终小于等于节点n到终点的代价，则A\*算法保证一定能够找到最短路径。但是当h(n)的值越小，算法将遍历越多的节点，也就导致算法越慢。

    如果h(n)完全等于节点n到终点的代价，则A\*算法将找到最佳路径，并且速度很快。
    可惜的是，并非所有场景下都能做到这一点。因为在没有达到终点之前，我们很难确切算出距离终点还有多远。

    如果h(n)的值比节点n到终点的代价要大，则A\*算法不能保证找到最短路径，不过此时运行速度会很快。

    在另外一个极端情况下，如果h(n)相较于g(n)大很多，则此时只有h(n)产生效果，即为最佳优先搜索。

    在screeps的寻路函数里，该权重为1.2，我们这里无需顾虑寻路消耗，设置为0即可。
     * @returns {PathResult}
     * @memberof Grid
     */
    public findPath(startPoint: Coord, endPoint: Coord, range: number, opts?: Partial<PathFinderOpts>): PathResult {
        const pathFinderOpts = this.managePosOpts(this.pathFinderOpts, opts);
        const pathResult: PathResult = { isFinish: false, cost: 0, path: [] };
        const startPointStr = this.posStr(startPoint);
        const endPointStr = this.posStr(endPoint);
        const allEndPoint = this.squarePos(endPoint, range);
        const allEndPointStrSet = new Set(allEndPoint.map(pos => this.posStr(pos))).add(endPointStr);
        // 初始化open_set和close_set；
        const closeList: { [name: string]: PathNode } = {};
        // 将起点加入open_set中，并设置优先级为0（优先级最高）；
        const openQueue = new PriorityQueue<PathNode>([{ name: startPointStr, priority: 0, cost: 0 }]);
        // 如果open_set不为空，则从open_set中选取优先级最高的节点n：
        const adList = this.getAdList(pathFinderOpts.costList);
        while (openQueue.size !== 0) {
            const firstNode = openQueue.getFirst();
            // console.log(openQueue.size, firstNode);
            if (!firstNode) break;
            // 如果节点n不是终点，则：
            if (!allEndPointStrSet.has(firstNode.name)) {
                // console.log("not endPoint");
                // 将节点n从open_set中删除，并加入close_set中；
                closeList[firstNode.name] = openQueue.dequeue() as PathNode;
                // console.log(`pathFinderOpts.costList:${pathFinderOpts.costList.length}`);

                // console.log(Object.keys(this.adList).length, adNodeList);
                // 遍历节点n所有的邻近节点：
                const adNodeList = adList[firstNode.name];
                adNodeList.forEach(adNode => {
                    // 如果邻近节点m也不在open_set中，则：
                    if (!(adNode.to in closeList) && openQueue.tree.every(node => node.name !== adNode.to)) {
                        // 设置节点m的parent为节点n,计算节点m的优先级,将节点m加入open_set中
                        /* priority=f(n)=g(n)+h(n)
                        f(n)是节点n的综合优先级。
                        当我们选择下一个要遍历的节点时，我们总会选取综合优先级最高（值最小）的节点。
                        g(n) 是节点n距离起点的代价。
                        h(n)是节点n距离终点的预计代价，这也就是A*算法的启发函数。
                        */
                        // console.log(adNode);
                        openQueue.enqueue({
                            parent: firstNode.name,
                            priority:
                                firstNode.cost +
                                adNode.weight +
                                pathFinderOpts.AStarWeight *
                                    this.getMinDistance(this.prasePosStr(adNode.to), allEndPoint),
                            name: adNode.to,
                            cost: adNode.weight + firstNode.cost
                        });
                    }
                });
            } else {
                // 如果节点n为终点，则：
                // 从终点开始逐步追踪parent节点，一直达到起点；
                pathResult.isFinish = true;
                pathResult.cost = firstNode.cost;
                let node = firstNode;
                while (node.parent && node.name !== startPointStr) {
                    pathResult.path.push(this.prasePosStr(node.name));
                    node = closeList[node.parent];
                }
                pathResult.path.push(this.prasePosStr(node.name));
                pathResult.path.reverse();
                return pathResult;
            }
        }
        // 没有路径
        return pathResult;
    }

    private flipCoordList(coordList: Coord[]) {
        return coordList.map(coord => {
            return {
                x: -coord.x,
                y: coord.y
            };
        });
    }

    private rotateList: {
        [angle in 90 | 180 | 270]: { [axisName in "x" | "y"]: { name: "x" | "y"; sign: 1 | -1 } };
    } = {
        90: {
            x: {
                name: "y",
                sign: 1
            },
            y: {
                name: "x",
                sign: -1
            }
        },
        180: {
            x: {
                name: "x",
                sign: -1
            },
            y: {
                name: "y",
                sign: -1
            }
        },
        270: {
            x: {
                name: "y",
                sign: -1
            },
            y: {
                name: "x",
                sign: 1
            }
        }
    };

    private rotateCoordList(coordList: Coord[], angle: 90 | 180 | 270) {
        const angleList = this.rotateList[angle];
        return coordList.map(coord => {
            return {
                x: angleList.x.sign * coord[angleList.x.name],
                y: angleList.y.sign * coord[angleList.y.name]
            };
        });
    }

    private findAreaOpts: FindAreaOpts = {
        ...this.basePosOpts,
        ifFlip: false,
        ifRotate: false
    };
    /**
     *
     * 对给定的限制区域进行遍历，返回一个对象列表，result对应符合限制区域要求的区域对应Coord表，limit包含area信息
     * - limitArea:限制区域内的所有坐标
     * - area：描述要求区域的坐标表，可以采用相对坐标或绝对坐标。
     *
     * opts：
     * 1. limitType="all"
     *   -  some：只要有任意待求区域的子集在限制区域内即可
     *   -  every ：要求整个待求区域在限制区域内
     *   -  none：没有任何待求区域在限制区域内
     *
     * 2. ignoreStructure=false
     *   -  是否无视已放置的建筑
     * 3. ignoreWall=false
     *   -  是否无视自然地形墙
     * */
    public findArea<T extends { name: string; coordList: Coord[]; type: AreaLimitType }[]>(
        limitAreas: T,
        area: Coord[],
        opts?: Partial<FindAreaOpts>
    ): FindAreaReturn<T>[] {
        const findAreaOpts = this.managePosOpts(this.findAreaOpts, opts);
        if (
            !limitAreas
                .map(anyLimitArea =>
                    anyLimitArea.coordList.map(coord => this.ifInBorder(coord)).every(isInBorder => isInBorder)
                )
                .every(isInBorder => isInBorder)
        ) {
            throw new Error("limitArea不支持相对坐标");
        }
        const originAreaList: { coordList: Coord[]; flip: boolean; rotateAngle: number }[] = [
            { coordList: area, flip: false, rotateAngle: 0 }
        ];
        const resultAreaList: FindAreaReturn<T>[] = [];
        if (findAreaOpts.ifFlip && findAreaOpts.ifRotate) {
            findAreaOpts.ifFlip = false;
            findAreaOpts.ifRotate = false;
            // 生成七个翻转/旋转过的area
            const flipCoordList = this.flipCoordList(area);
            // 生成翻转过的area
            originAreaList.push({
                coordList: flipCoordList,
                flip: true,
                rotateAngle: 0
            });
            // 生成三个旋转过的area
            ([90, 180, 270] as [90, 180, 270]).forEach(angle => {
                originAreaList.push({
                    coordList: this.rotateCoordList(area, angle),
                    flip: false,
                    rotateAngle: angle
                });
            });
            // 生成三个翻转并旋转过的area
            ([90, 180, 270] as [90, 180, 270]).forEach(angle => {
                originAreaList.push({
                    coordList: this.rotateCoordList(flipCoordList, angle),
                    flip: false,
                    rotateAngle: angle
                });
            });
        }
        if (findAreaOpts.ifFlip) {
            originAreaList.push({
                coordList: this.flipCoordList(area),
                flip: true,
                rotateAngle: 0
            });
            // 生成翻转过的area
        }
        if (findAreaOpts.ifRotate) {
            ([90, 180, 270] as [90, 180, 270]).forEach(angle => {
                originAreaList.push({
                    coordList: this.rotateCoordList(area, angle),
                    flip: false,
                    rotateAngle: angle
                });
            });
            // 生成三个旋转过的area
        }
        originAreaList.map(originArea => {
            const xList = originArea.coordList.map(coord => coord.x);
            const yList = originArea.coordList.map(coord => coord.y);
            const areaRange = {
                xMin: Math.min(...xList),
                xMax: Math.max(...xList),
                yMin: Math.min(...yList),
                yMax: Math.max(...yList)
            };
            const areaSize = {
                width: areaRange.xMax - areaRange.xMin,
                height: areaRange.yMax - areaRange.yMin
            };
            for (let x = 0; x <= 49 - areaSize.width; x++) {
                for (let y = 0; y <= 49 - areaSize.height; y++) {
                    // x,y是在地图内所有可能的坐标值
                    const measureArea = originArea.coordList.map(coord => {
                        return { x: coord.x - areaRange.xMin + x, y: coord.y - areaRange.yMin + y };
                    });
                    // 处理
                    if (!findAreaOpts.ignoreWall) {
                        if (measureArea.some(measureCoord => this.gridPos(measureCoord).cost === this.MAX_COST)) {
                            continue;
                        }
                    }

                    const limitAreasCopy = limitAreas.map(limitArea => _.cloneDeep(limitArea)) as T;
                    if (
                        !limitAreas.every((limitArea, index) => {
                            const limitAreaCopy = limitAreasCopy[index];
                            limitAreaCopy.coordList = [];
                            if (limitArea.type === "every") {
                                if (
                                    !measureArea.every(measureCoord =>
                                        limitArea.coordList.find(limitCoord => {
                                            const isEqual = this.isEqual(measureCoord, limitCoord);
                                            if (isEqual) {
                                                limitAreaCopy.coordList.push(_.clone(measureCoord));
                                            }
                                            return isEqual;
                                        })
                                    )
                                ) {
                                    return false;
                                }
                            } else if (limitArea.type === "none") {
                                if (
                                    !measureArea.every(measureCoord =>
                                        limitArea.coordList.every(limitCoord => {
                                            const isNotEqual = !this.isEqual(measureCoord, limitCoord);
                                            if (isNotEqual) {
                                                limitAreaCopy.coordList.push(_.clone(measureCoord));
                                            }
                                            return isNotEqual;
                                        })
                                    )
                                ) {
                                    return false;
                                }
                            } else if (limitArea.type === "some") {
                                if (
                                    !measureArea.some(measureCoord =>
                                        limitArea.coordList.find(limitCoord => {
                                            const isEqual = this.isEqual(measureCoord, limitCoord);
                                            if (isEqual) {
                                                limitAreaCopy.coordList.push(_.clone(measureCoord));
                                            }
                                            return isEqual;
                                        })
                                    )
                                ) {
                                    return false;
                                }
                            }
                            return true;
                        })
                    ) {
                        continue;
                    }
                    resultAreaList.push({
                        result: measureArea,
                        limit: { ...limitAreasCopy, rotateAngle: originArea.rotateAngle, flip: originArea.flip }
                    });
                }
            }
        });
        return resultAreaList;
    }

    public nearPos(coordList: Coord[], range: number, opts?: BasePosOpts): Coord[] {
        const baseOpts = this.managePosOpts(this.basePosOpts, opts);
        const nearPosList = _.uniq(
            coordList.flatMap(coord => this.squarePos(coord, range, baseOpts)),
            coord => {
                return this.posStr(coord);
            }
        ).filter(coord => !coordList.some(originCoord => this.isEqual(coord, originCoord)));
        return nearPosList;
    }

    /**
     * 为坐标列表按照距离排序，默认为从小到大.
     * 该方法会改变goalCoordList的排序。
     *
     * @param {Coord} startCoord
     * @param {Coord[]} goalCoordList
     * @param {number} [direction=1]
     * @returns {Coord[]}
     * @memberof Grid
     */
    public sortCoordByDistance(startCoord: Coord, goalCoordList: Coord[], direction = 1): Coord[] {
        return goalCoordList.sort(
            (a, b) => direction * (this.getDistance(startCoord, a) - this.getDistance(startCoord, b))
        );
    }

    /**
     * 获取矩形位置的Coord list
     *
     * @param {{ xMin: number; xMax: number; yMin: number; yMax: number }} range
     * @param {Partial<BasePosOpts>} [opts]
     * @returns {Coord[]}
     * @memberof Grid
     */
    public rectPosList(
        range: { xMin: number; xMax: number; yMin: number; yMax: number },
        opts?: Partial<BasePosOpts>
    ): Coord[] {
        const { xMin, xMax, yMin, yMax } = range;
        opts = this.managePosOpts(this.basePosOpts, opts);
        const coordList = [];
        for (let i = xMin; i <= xMax; i++) {
            for (let j = yMin; j <= yMax; j++) {
                const coord = { x: i, y: j };
                if (opts.ignoreBorderLimit) {
                    coordList.push(coord);
                }
                if (!opts.ignoreBorderLimit && this.ifInBorder(coord)) {
                    coordList.push(coord);
                }
            }
        }
        if (opts.ignoreWall) return coordList;
        else {
            return coordList.filter(coord => this.grid[coord.x][coord.y].cost < this.MAX_COST);
        }
    }

    /**
     * 获取矩形边界
     *
     * @param {Coord[]} coordList
     * @returns {{
     *         xMax: number;
     *         xMin: number;
     *         yMax: number;
     *         yMin: number;
     *     }}
     * @memberof Grid
     */
    public static getRange(coordList: Coord[]): {
        xMax: number;
        xMin: number;
        yMax: number;
        yMin: number;
        width: number;
        height: number;
    } {
        const bestAreaXList = coordList.map(coord => coord.x);
        const bestAreaYList = coordList.map(coord => coord.y);
        const range = {
            xMax: Math.max(...bestAreaXList),
            xMin: Math.min(...bestAreaXList),
            yMax: Math.max(...bestAreaYList),
            yMin: Math.min(...bestAreaYList)
        };
        return { ...range, width: range.xMax - range.xMin, height: range.yMax - range.yMin };
    }
}
