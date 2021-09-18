export interface Coord {
    x: number;
    y: number;
}

export interface GridPosition extends Coord {
    cost: number;
}

export interface PathNode {
    name: string;
    priority: number;
    cost: number;
    parent?: string;
}
export interface weightedAdjacencyList {
    [name: string]: WeightedAdjacencyNode[];
}
export interface WeightedAdjacencyNode {
    /**
     * 起点。总是node键值对应的点
     *
     * @type {string}
     * @memberof WeightedAdjacencyNode
     */
    from: string;
    /**
     * 终点，总是node键值周围的一个点
     *
     * @type {string}
     * @memberof WeightedAdjacencyNode
     */
    to: string;
    weight: number;
}
export interface PathResult {
    cost: number;
    isFinish: boolean;
    path: Coord[];
}

export interface BasePosOpts {
    ignoreWall: boolean;
    ignoreStructure: boolean;
    ignoreBorderLimit: boolean;
}

export interface PathFinderOpts extends BasePosOpts {
    AStarWeight: number;
    /**
     * cost表，只会在这次寻路起作用。
     *
     * @type {((Coord & { cost: number })[])}
     * @memberof PathFinderOpts
     */
    costList: (Coord & { cost: number })[];
}

export interface FindAreaOpts extends BasePosOpts {
    /**
     * 是否允许旋转
     *
     * @type {boolean}
     * @memberof FindAreaOpts
     */
    ifRotate: boolean;
    /**
     * 是否允许翻转
     *
     * @type {boolean}
     * @memberof FindAreaOpts
     */
    ifFlip: boolean;
}
export type AreaLimitType = "some" | "every" | "none";

export interface FindAreaReturn<T> {
    limit: T & { flip: boolean; rotateAngle: number };
    result: Coord[];
}
