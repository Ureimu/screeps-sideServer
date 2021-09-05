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
     * 起点。总是node键值周围的一个点
     *
     * @type {string}
     * @memberof WeightedAdjacencyNode
     */
    from: string;
    /**
     * 终点，总是node键值对应的点
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
