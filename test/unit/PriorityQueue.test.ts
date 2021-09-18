import { apiConfig } from "main";
import * as assert from "assert";
import { DrawMap } from "utils/blockVisual/draw";
import { ScreepsApi } from "node-ts-screeps-api";
import { PriorityQueue } from "utils/PriorityQueue/priorityQueue";

// 上面的userData需要自己在根目录创建，示例参照根目录的authInfoSample.ts
describe("PriorityQueue", () => {
    it("runs", () => {
        const testData = [4, 2, 6, 8, 1, 5, 7, 3, 9];
        const p = new PriorityQueue(
            testData.map(val => {
                return {
                    priority: val
                };
            })
        );
        p.enqueue({ priority: 13 });
        p.dequeue();
        p.enqueue({ priority: 12 });
        p.getFirst();
    });
});
