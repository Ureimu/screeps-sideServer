import { LayoutStr, StructureStrMap } from "roomLayout/modularLayout/LayoutStr/class";
import { GridMap } from "utils/RoomGridMap";
import { SvgCode } from "utils/SvgCode";

// 上面的userData需要自己在根目录创建，示例参照根目录的authInfoSample.ts
describe("DrawModule", () => {
    const layout = `
    r
  r e r
r e e e r
  r e r
    r
`;
    const mapChar: StructureStrMap = {
        r: "baseRoad",
        e: "extension"
    };
    const cls = new LayoutStr(layout, mapChar);
    const mark = new SvgCode(cls.size);
    mark.circle({ x: 1, y: 1 });
    it("preview", async () => {
        await new LayoutStr(layout, mapChar).drawPreview("out/test.png", [mark]);
    });
});
