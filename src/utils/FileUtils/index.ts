import path from "path";
import { promises as fs, constants } from "fs";

export async function saveFile(data: string, savePath: string) {
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
    await fs.writeFile(savePath, data, { encoding: "utf8" });
}

export async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

export async function readFile(filePath: string): Promise<string | null> {
    try {
        await fs.access(filePath, constants.F_OK);

        return await fs.readFile(filePath, { encoding: "utf8" });
    } catch {
        return null;
    }
}
