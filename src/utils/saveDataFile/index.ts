import path from "path";
import { promises as fs } from "fs";

export async function saveDataFile(data: string, savePath: string) {
    // Ensure the directory for savePath exists; create it if missing.
    try {
        const dir = path.dirname(savePath);
        if (dir && dir !== ".") {
            await fs.mkdir(dir, { recursive: true });
        }
    } catch (err) {
        // Propagate directory creation errors
        throw err;
    }
    await fs.writeFile(savePath, data);
}
