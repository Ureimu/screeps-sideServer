import { concurrency } from "sharp";
import _ from "lodash";
global._ = _;
import { checkPath } from "utils/pathCheck";
import { correspond } from "roomLayout";
import { devTest } from "roomLayout/devTest";
import { pathFinderDevTest } from "portalPathFinder";
import { startWsConsole } from "./wsConsole";

const args = process.argv.slice(2);
const stateHere = args[0];
const isWsMode = args.includes("--ws");
const wsPattern = args.find(arg => arg.startsWith("--pattern="))?.split("=")[1];

console.log(args, process.argv);
process.on("unhandledRejection", error => {
    console.log("unhandledRejection: ", error);
});

export const mainFunction = async (state: string): Promise<void> => {
    console.profile();
    checkPath(["out", "cache"]);
    concurrency(4);
    console.log(state);

    if (isWsMode) {
        // WebSocket 实时触发模式
        console.log(`[Main] Starting WebSocket mode with pattern: ${wsPattern || "default"}`);
        await startWsConsole(state, wsPattern);
        return;
    }

    if (state !== "dev") {
        await correspond(state);
    } else if (state === "dev") {
        // await devTest();
        await pathFinderDevTest();
    }
    console.profileEnd();
};
// console.log(process.env.NODE_ENV, process.argv);

mainFunction(stateHere).catch(e => {
    throw e;
});

// if (process.env.NODE_ENV === "production") {
//     mainFunction(stateHere).catch(e => {
//         throw e;
//     });
// }
