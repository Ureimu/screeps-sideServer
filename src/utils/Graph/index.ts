// 节点接口，用于表示图中的顶点
interface GraphNode<T> {
    id: string | number;
    data: T;
    neighbors?: string[]; // 邻居节点的ID列表
}

// 边接口，用于表示图中节点间的连接
interface GraphEdge {
    from: string | number;
    to: string | number;
    weight: number;
}

// A* 寻路算法中使用的节点表示
interface AStarNode<T> {
    id: string | number;
    data: T;
    f: number; // f = g + h
    g: number; // 从起点到当前节点的实际成本
    h: number; // 启发式估计值（到目标的估计成本）
    parent: AStarNode<T> | null;
}

// 启发式函数类型
type HeuristicFunction<T> = (nodeA: GraphNode<T>, nodeB: GraphNode<T>) => number;

export interface PathResult {
    path: (string | number)[];
    cost: number;
    incomplete: boolean;
}

/**
 * 一般图类，支持有向/无向图，加权/非加权图
 */
class Graph<T = any> {
    private nodes: Map<string | number, GraphNode<T>>;
    private edges: Map<string, GraphEdge>;
    private isDirected: boolean;

    constructor(directed: boolean = false, public heuristic: HeuristicFunction<T>) {
        this.nodes = new Map();
        this.edges = new Map();
        this.isDirected = directed;
    }

    /**
     * 添加节点到图中
     */
    addNode(id: string | number, data: T): void {
        if (this.nodes.has(id)) {
            throw new Error(`Node with id ${id} already exists`);
        }

        this.nodes.set(id, {
            id,
            data,
            neighbors: []
        });
    }

    /**
     * 获取节点
     */
    getNode(id: string | number): GraphNode<T> | undefined {
        return this.nodes.get(id);
    }

    /**
     * 检查节点是否存在
     */
    hasNode(id: string | number): boolean {
        return this.nodes.has(id);
    }

    /**
     * 删除节点及其关联的边
     */
    removeNode(id: string | number): boolean {
        if (!this.nodes.has(id)) {
            return false;
        }

        // 删除节点
        this.nodes.delete(id);

        // 删除所有与该节点相关的边
        const edgesToRemove: string[] = [];
        this.edges.forEach((edge, edgeId) => {
            if (edge.from === id || edge.to === id) {
                edgesToRemove.push(edgeId);
            }
        });

        edgesToRemove.forEach(edgeId => {
            this.edges.delete(edgeId);
        });

        // 从其他节点的邻居列表中移除该节点
        this.nodes.forEach(node => {
            if (node.neighbors) {
                const index = node.neighbors.indexOf(id.toString());
                if (index !== -1) {
                    node.neighbors.splice(index, 1);
                }
            }
        });

        return true;
    }

    /**
     * 添加边到图中
     */
    addEdge(from: string | number, to: string | number, weight: number = 1): void {
        if (!this.nodes.has(from) || !this.nodes.has(to)) {
            throw new Error("One or both nodes do not exist");
        }

        const edgeId = this.getEdgeId(from, to);

        // 如果边已存在，更新权重
        if (this.edges.has(edgeId)) {
            this.edges.get(edgeId)!.weight = weight;
            return;
        }

        // 创建边
        const edge: GraphEdge = { from, to, weight };
        this.edges.set(edgeId, edge);

        // 更新节点的邻居列表
        const fromNode = this.nodes.get(from)!;
        if (fromNode.neighbors && !fromNode.neighbors.includes(to.toString())) {
            fromNode.neighbors.push(to.toString());
        }

        // 如果是无向图，添加反向边
        if (!this.isDirected) {
            const reverseEdgeId = this.getEdgeId(to, from);
            if (!this.edges.has(reverseEdgeId)) {
                this.edges.set(reverseEdgeId, { from: to, to: from, weight });

                const toNode = this.nodes.get(to)!;
                if (toNode.neighbors && !toNode.neighbors.includes(from.toString())) {
                    toNode.neighbors.push(from.toString());
                }
            }
        }
    }

    /**
     * 获取边
     */
    getEdge(from: string | number, to: string | number): GraphEdge | undefined {
        return this.edges.get(this.getEdgeId(from, to));
    }

    /**
     * 获取所有节点
     */
    getAllNodes(): GraphNode<T>[] {
        return Array.from(this.nodes.values());
    }

    /**
     * 获取所有边
     */
    getAllEdges(): GraphEdge[] {
        return Array.from(this.edges.values());
    }

    /**
     * 获取节点的所有邻居
     */
    getNeighbors(id: string | number): GraphNode<T>[] {
        const node = this.nodes.get(id);
        if (!node || !node.neighbors) {
            return [];
        }

        return node.neighbors.map(neighborId => this.nodes.get(neighborId)).filter(Boolean) as GraphNode<T>[];
    }

    /**
     * A* 寻路算法
     * @param startId 起点ID
     * @param goalId 目标ID
     * @returns 从起点到目标的路径节点ID数组，如果找不到路径则返回空数组
     */
    findPath(startId: string | number, goalId: string | number): PathResult {
        // 检查起点和目标是否存在
        if (!this.nodes.has(startId) || !this.nodes.has(goalId)) {
            return { path: [], cost: 0, incomplete: true };
        }

        const startNode = this.nodes.get(startId)!;
        const goalNode = this.nodes.get(goalId)!;

        // 初始化开放列表和关闭列表
        const openSet: Map<string | number, AStarNode<T>> = new Map();
        const closedSet: Map<string | number, boolean> = new Map();

        // 创建起点A*节点
        const startAStarNode: AStarNode<T> = {
            id: startNode.id,
            data: startNode.data,
            g: 0,
            h: this.heuristic(startNode, goalNode),
            f: 0 + this.heuristic(startNode, goalNode),
            parent: null
        };

        openSet.set(startId, startAStarNode);

        while (openSet.size > 0) {
            // 从开放列表中找到f值最小的节点
            let currentId: string | number = "";
            let currentF = Infinity;

            openSet.forEach((node, id) => {
                if (node.f < currentF) {
                    currentF = node.f;
                    currentId = id;
                }
            });

            const current = openSet.get(currentId)!;

            // 如果当前节点是目标节点，重建路径
            if (current.id === goalId) {
                return this.reconstructPath(current);
            }

            // 将当前节点移到关闭列表
            openSet.delete(currentId);
            closedSet.set(currentId, true);

            // 获取当前节点的所有邻居
            const neighbors = this.getNeighbors(currentId);

            for (const neighbor of neighbors) {
                const neighborId = neighbor.id;

                // 如果邻居在关闭列表中，跳过
                if (closedSet.has(neighborId)) {
                    continue;
                }

                // 计算从起点到邻居的成本
                const edge = this.getEdge(currentId, neighborId);
                if (!edge) {
                    continue;
                }

                const tentativeG = current.g + edge.weight;

                // 检查邻居是否在开放列表中
                let neighborAStarNode = openSet.get(neighborId);

                if (!neighborAStarNode) {
                    // 如果不在开放列表中，创建新节点
                    neighborAStarNode = {
                        id: neighborId,
                        data: neighbor.data,
                        g: tentativeG,
                        h: this.heuristic(neighbor, goalNode),
                        f: tentativeG + this.heuristic(neighbor, goalNode),
                        parent: current
                    };
                    openSet.set(neighborId, neighborAStarNode);
                } else if (tentativeG < neighborAStarNode.g) {
                    // 如果在开放列表中且找到更优路径，更新节点
                    neighborAStarNode.g = tentativeG;
                    neighborAStarNode.f = tentativeG + neighborAStarNode.h;
                    neighborAStarNode.parent = current;
                }
            }
        }

        // 开放列表为空且未找到目标，路径不存在
        return { path: [], cost: 0, incomplete: true };
    }

    /**
     * 重建路径
     */
    private reconstructPath(node: AStarNode<T>): PathResult {
        const path: (string | number)[] = [];

        let current: AStarNode<T> | null = node;
        const cost = node.g;

        while (current !== null) {
            path.unshift(current.id);
            current = current.parent;
        }

        return { path, cost, incomplete: false };
    }

    /**
     * 生成边ID
     */
    private getEdgeId(from: string | number, to: string | number): string {
        return `${from}->${to}`;
    }
}

// 导出相关接口和类
export { Graph, GraphNode, GraphEdge, HeuristicFunction };
