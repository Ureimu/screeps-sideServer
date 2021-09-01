import { mainFunction } from "main";
import * as assert from "assert";

// 上面的userData需要自己在根目录创建，示例参照根目录的authInfoSample.ts
describe("api", () => {
    it("runs", async () => {
        await mainFunction();
    });
});
