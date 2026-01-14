import { concurrency } from "sharp";
import _ from "lodash";
global._ = _;
import { checkPath } from "utils/pathCheck";
import { correspond } from "roomLayout";
import { devTest } from "roomLayout/devTest";
import { pathFinderDevTest } from "portalPathFinder";
const stateHere = process.argv[2];
console.log(stateHere, process.argv);
process.on("unhandledRejection", error => {
    console.log("unhandledRejection: ", error);
});
export const mainFunction = async (state: string): Promise<void> => {
    console.profile();
    checkPath(["out", "cache"]);
    concurrency(4);
    console.log(state);
    if (state !== "dev") {
        await correspond(state);
    } else if (state === "dev") {
        await devTest();
        // await pathFinderDevTest();
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
