/* eslint-disable no-bitwise */
// https://segmentfault.com/a/1190000022131550
export interface PriorityNode {
    priority: number;
}
export class PriorityQueue<T extends PriorityNode> {
    // 取父节点索引 ~~((index - 1) / 2)
    /**
     *Creates an instance of PriorityQueue.
     * @param {T[]} tree
     * @param {boolean} [direction=false] true 为由大到小，false为由小到大
     * @memberof PriorityQueue
     */
    public constructor(public tree: T[], public direction = true) {}
    public get size(): number {
        return this.tree.length;
    }

    // 入队
    public enqueue(val: T): void {
        this.tree.push(val);
        if (this.direction) {
            this.tree.sort((a, b) => b.priority - a.priority);
        } else {
            this.tree.sort((a, b) => a.priority - b.priority);
        }
    }

    // 出队
    public dequeue(): T | undefined {
        return this.tree.shift();
    }

    // 取队首
    public getFirst(): T | undefined {
        return this.tree[0];
    }
}
