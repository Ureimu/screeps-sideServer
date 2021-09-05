import { ScreepsApi } from "node-ts-screeps-api";
import { ApiConfig } from "node-ts-screeps-api/dist/src/type";
import { ecoLayout } from "roomLayout/ecoLayout/layout";
import { RoomGridMap } from "utils/RoomGridMap/RoomGridMap";
import { userData } from "../authInfo";
export const apiConfig: ApiConfig<"signinByPassword"> = {
    authInfo: {
        type: "signinByPassword",
        email: userData.email,
        password: userData.password
    },
    hostInfo: {
        protocol: "https",
        port: 443,
        path: "/",
        hostname: "screeps.com"
    }
};

const api: ScreepsApi<"signinByPassword"> = new ScreepsApi(apiConfig);

export const mainFunction = async (): Promise<void> => {
    await api.auth();
    const requireRoomName = "E34S21";
    const basePostData = { room: requireRoomName, shard: "shard3" };
    const terrainData = (await api.rawApi.getEncodedRoomTerrain(basePostData)).terrain[0].terrain;
    const roomObjectData = (await api.rawApi.getRoomObjects(basePostData)).objects.filter(val =>
        ["source", "mineral", "controller"].some(type => type === val.type)
    );
    const map = new RoomGridMap(terrainData, roomObjectData);
    ecoLayout(map);
    await map.drawMap(`out/${requireRoomName}.png`);
    // console.log(map.grid);
};
console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV !== "production") {
    console.log("test");
} else {
    mainFunction().catch(e => {
        throw e;
    });
}
