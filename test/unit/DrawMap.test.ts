import { apiConfig } from "main";
import { DrawMap } from "utils/blockVisual/draw";
import { ScreepsApi } from "node-ts-screeps-api";
import sharp from "sharp";
import { picBasePath } from "utils/common/constants";

// 上面的userData需要自己在根目录创建，示例参照根目录的authInfoSample.ts
describe("draw", () => {
    it("runs", async () => {
        const api: ScreepsApi<"signinByPassword"> = new ScreepsApi(apiConfig);
        await api.auth();
        const requireRoomName = "E34S21";
        const basePostData = { room: requireRoomName, shard: "shard3" };
        const terrainData = (await api.rawApi.getEncodedRoomTerrain(basePostData)).terrain[0].terrain;
        const roomObjectData = (await api.rawApi.getRoomObjects(basePostData)).objects;
        const map = new DrawMap();
        await map.getVisual(terrainData, roomObjectData, []);
        // const buffer = await sharp(`${picBasePath}bg.png`).resize(3200, 3200).toBuffer();
        // await sharp(buffer).toFile("src\\utils\\blockVisual\\imgs\\64\\bg.png");
    });
});
