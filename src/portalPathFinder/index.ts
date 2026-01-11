import { getPortalData } from "./dataBase/getPortalData";
import { PortalGraph } from "./PortalGraph";
import { readPortalData } from "./dataBase/readPortalData";

export async function pathFinderDevTest() {
    const state = "ureium";

    // 获取portal数据。
    await getPortalData(state, {
        centerRoom: 1000 * 60 * 60 * 24 * 1,
        closedSectorHighway: 1000 * 60 * 60 * 24 * 60,
        highwayCross: 1000 * 60 * 60 * 24 * 30
    });

    // 获取请求数据。
    const requireDataPairs: [from: string, to: string][] = [
        ["tdestrW2N11x10y10sshard3", "tdestrW1N9x25y25sshard2"],
        ["tdestrE30S31x10y10sshard3", "tdestrW60N60x25y25sshard0"]
    ];

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
    const result = requireDataPairs.map(pair => {
        graph.addCreepPathDestNodePair(pair);
        const result = graph.findPath(...pair);
        graph.removeCreepPathDestNodePair(pair);
        return result;
    });

    console.log(result);

    // 发送数据到服务器。
}
