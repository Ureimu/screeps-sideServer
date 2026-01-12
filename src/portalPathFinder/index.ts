import { getPortalData, PortalUpdateIntervalControl } from "./dataBase/getPortalData";
import { PortalGraph } from "./PortalGraph";
import { readPortalData } from "./dataBase/readPortalData";
import { apiConfig } from "../../authInfo";
import { ScreepsApi } from "node-ts-screeps-api";
import { SERVER_SHARDS } from "utils/constants/shard";
import { PortalPathDetail } from "./inGameType";
import { Bar, Presets } from "cli-progress";

export async function pathFinderDevTest() {
    const state = "ureium";
    const config = apiConfig(state);
    const api = new ScreepsApi(config);
    await api.auth();

    const pathCreatedTime = Date.now();
    const validDataPeriod: PortalUpdateIntervalControl = {
        centerRoom: 1000 * 60 * 60 * 24 * 1,
        closedSectorHighway: 1000 * 60 * 60 * 24 * 60,
        highwayCross: 1000 * 60 * 60 * 24 * 30
    };
    // 获取portal数据。
    await getPortalData(api, validDataPeriod);
    const validPathDataPeriod = _.min(validDataPeriod);

    // 获取请求数据。
    const fullRequests: PortalPathDetail[] = [];
    for (const shard of SERVER_SHARDS.official) {
        const portalRawRequests = await api.rawApi.getMemory({ shard, path: "portalPaths" });
        if (!portalRawRequests.data) continue;
        const portalRequests: { [name: string]: PortalPathDetail } = JSON.parse(portalRawRequests.data);
        if (!portalRequests) continue;
        const requestsToProcess = _.filter(portalRequests, request => request.path === undefined);
        fullRequests.push(...requestsToProcess);
    }

    // 计算路径。
    console.log(`loading portal data from disk...`);
    const portalData = await readPortalData();
    if (!portalData) {
        console.log("no portalData");
        return;
    }

    console.log(`loading portal data to graph...`);
    const graph = new PortalGraph(portalData);

    console.log(`calc portal routes...`);
    const bar = new Bar(
        {
            clearOnComplete: true,
            hideCursor: true,
            format: "calc paths... |" + "{bar}" + "| {percentage}% | {value}/{total} | ETA: {eta}s"
        },
        Presets.shades_grey
    );
    bar.setTotal(fullRequests.length);
    for (const request of fullRequests) {
        const arg: [from: string, to: string] = [request.from, request.to];
        graph.addCreepPathDestNodePair(arg);
        const result = graph.findPath(...arg);
        graph.removeCreepPathDestNodePair(arg);
        if (result.incomplete) {
            request.exist = false;
        } else {
            request.exist = true;
            request.cost = result.cost;
            request.path = result.path.join(",");
        }
        request.expireTime = pathCreatedTime + validPathDataPeriod;
        await api.rawApi.postMemory({ path: `portalPaths.${request.name}`, value: request, shard: request.fromShard });
        bar.increment();
    }

    console.log(fullRequests);

    // 发送数据到服务器。
}
