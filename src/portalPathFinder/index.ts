import { getPortalData, PortalUpdateIntervalControl } from "./dataBase/getPortalData";
import { PortalGraph } from "./PortalGraph";
import { IfUsingPortalType, readPortalData } from "./dataBase/readPortalData";
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
        //未使用centerRoom数据，因为很有可能centerRoom被其他有主房间围住，无法到达centerRoom
        centerRoom: false, // 1000 * 60 * 60 * 24 * 1
        closedSectorHighway: 1000 * 60 * 60 * 24 * 120,
        highwayCross: 1000 * 60 * 60 * 24 * 30
    };

    const ifUsingPortalType: IfUsingPortalType = {
        centerRoom: false,
        closedSectorHighway: true,
        highwayCross: true
    };
    // 获取portal数据。
    await getPortalData(api, validDataPeriod);

    const maxValidDataPeriod = 1000 * 60 * 60 * 24 * 360;
    const validPathDataPeriod = _.min([
        maxValidDataPeriod,
        ...(_.filter(validDataPeriod, i => i !== false) as number[])
    ]);
    // TODO 其实还可以把shardPosition数据带上portal类型，以便于根据路径中的portal类型确定路径的过期时间。

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
    const portalData = await readPortalData(ifUsingPortalType);
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

        // 发送数据到服务器。
        await api.rawApi.postMemory({ path: `portalPaths.${request.name}`, value: request, shard: request.fromShard });
        bar.increment();
    }

    console.log(fullRequests);
}
