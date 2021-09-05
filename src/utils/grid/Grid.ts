import { PriorityQueue } from "utils/priorityQueue/priorityQueue";
import { Coord, GridPosition, PathNode, PathResult, weightedAdjacencyList, WeightedAdjacencyNode } from "./type";

export class Grid {
    public grid: GridPosition[][];
    public readonly MAX_COST = 2 ** 10;
    public readonly rangeSettings: { xMin: number; yMin: number; xMax: number; yMax: number } = {
        xMin: 1,
        yMin: 1,
        xMax: 48,
        yMax: 48
    };
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
    public getDistance(a: Coord, b: Coord): number {
        return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    }

    private ifInBorder(x: number, y: number): boolean {
        const { xMin, yMin, xMax, yMax } = this.rangeSettings;
        if (x < xMin || y < yMin || x > xMax || y > yMax) {
            return false;
        } else {
            return true;
        }
    }

    public squarePos(pos: Coord, range: number, blankSpace = true): Coord[] {
        const { x, y } = pos;
        const coordList = [];
        for (let i = -range; i <= range; i++) {
            for (let j = -range; j <= range; j++) {
                if (this.ifInBorder(x + i, y + j) && !(i === 0 && j === 0)) {
                    coordList.push(this.grid[x + i][y + j]);
                }
            }
        }
        if (!blankSpace) return coordList;
        else {
            return coordList.filter(coord => coord.cost < this.MAX_COST);
        }
    }

    public hollowSquarePos(pos: Coord, range: number, blankSpace = true): Coord[] {
        const { x, y } = pos;
        const coordList = [];
        for (let i = -range; i <= range; i++) {
            for (let j = -range; j <= range; j++) {
                if (this.ifInBorder(x + i, y + j) && (i === range || j === range || i === -range || j === -range)) {
                    coordList.push(this.grid[x + i][y + j]);
                }
            }
        }
        if (!blankSpace) return coordList;
        else {
            return coordList.filter(coord => coord.cost < this.MAX_COST);
        }
    }

    public posStr(pos: Coord): string {
        return `${pos.x},${pos.y}`;
    }

    public prasePosStr(posStr: string): Coord {
        const result = posStr.split(",");
        return { x: Number(result[0]), y: Number(result[1]) };
    }

    public setCost(pos: Coord, cost: number): void {
        if (!this.costHasChanged) this.costHasChanged = true;
        this.grid[pos.x][pos.y].cost = cost;
    }

    private costHasChanged = false;
    private adListCache?: weightedAdjacencyList;
    private get adList(): weightedAdjacencyList {
        if (!this.costHasChanged && this.adListCache) return this.adListCache;
        const adList: weightedAdjacencyList = {};
        this.grid.forEach(xStack => {
            xStack.forEach(pos => {
                adList[this.posStr(pos)] = this.squarePos(pos, 1)
                    .map(nearPos => {
                        const nearGridPos = this.grid[nearPos.x][nearPos.y];
                        if (nearGridPos.cost !== this.MAX_COST)
                            return {
                                from: this.posStr(pos),
                                to: this.posStr(nearPos),
                                weight: nearGridPos.cost
                            };
                        else {
                            return false;
                        }
                    })
                    .filter(val => val) as WeightedAdjacencyNode[];
            });
        });
        this.adListCache = adList;
        return adList;
    }

    public getMinDistance(startPoint: Coord, endPointList: Coord[]): number {
        return Math.min(...endPointList.map(endPoint => this.getDistance(startPoint, endPoint)));
    }

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
     * @returns {PathResult}
     * @memberof Grid
     */
    public findPath(startPoint: Coord, endPoint: Coord, range: number, AStarWeight = 1.2): PathResult {
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
        while (openQueue.size !== 0) {
            const firstNode = openQueue.getFirst();
            console.log(openQueue.size, firstNode);
            if (!firstNode) break;
            // 如果节点n不是终点，则：
            if (!allEndPointStrSet.has(firstNode.name)) {
                console.log("not endPoint");
                // 将节点n从open_set中删除，并加入close_set中；
                closeList[firstNode.name] = openQueue.dequeue() as PathNode;
                const adNodeList = this.adList[firstNode.name];
                console.log(Object.keys(this.adList).length, adNodeList);
                // 遍历节点n所有的邻近节点：
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
                        console.log(adNode);
                        openQueue.enqueue({
                            parent: firstNode.name,
                            priority:
                                firstNode.cost +
                                adNode.weight +
                                AStarWeight * this.getMinDistance(this.prasePosStr(adNode.to), allEndPoint),
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
}
