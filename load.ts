import { execSync, spawn } from "child_process"
import { randomUUID } from "crypto"
import { accessSync, existsSync, mkdirSync } from "fs"
import * as fs from "fs/promises"
import * as os from "os"
import path from "path"

export async function run() {
    // load from env
    const fileStructure = {}
    const tmpPath = os.tmpdir() + "/container-" + randomUUID()
    let startCmd = process.env["_startCommand|"] || undefined

    if (startCmd) startCmd = startCmd.replace("_startCommand|", "")
    else {
        console.log("No start command detected - defaulting to default node.js start command!")
        startCmd = "node index.js"
    }

    await fs.mkdir(tmpPath)

    for (const element of Object.entries(process.env)) {
        // [0] = name, [1] = contents

        let name = element[0], content = element[1]

        if (name.startsWith("_023kde|")) {
            name = name.replace("_023kde|", "")
            content = decode(content)
            const folders = name.startsWith(".") ? name.substring(1).split(path.sep) : name.split(path.sep)

            // does this even work lol
            folders.forEach((v, i) => { if (folders.length > i && !folderExists(tmpPath + arrayToFilepath(folders, i, true))) { mkdirSync(tmpPath + arrayToFilepath(folders, i, true)) } })
            await fs.writeFile(tmpPath + arrayToFilepath(folders, folders.length, true).slice(0, -1), content)
        }
    }

    // run now lol
    process.chdir(tmpPath)

    try {
        if (existsSync("./package.json")) {
            console.log(`> npm i`)
            execSync("npm i")
        }
    } catch { console.log("[!] Failed to install node.js dependencies!") }

    try {
        if (existsSync("./requirements.txt")) {
            console.log("> pip3 install -r requirements.txt")
            execSync("pip3 install -r requirements.txt")
        }
    } catch { console.log("[!] Failed to install Python dependencies!") }

    console.log(`> ${startCmd}`)
    const proc = spawn(startCmd, { shell: true })



    proc.stdout.on('data', data => process.stdout.write(data))
    proc.stderr.on('data', data => process.stderr.write(data))

    proc.on('close', async (code) => {
        // cleanup
        await fs.rm(tmpPath, { force: true, recursive: true })
        process.exit(code)
    })
    proc.on('close', (code, signal) => { if (code == 0) { console.log(`[i] Process ended with code ${code} ${signal ? `and signal ${signal},` : ""}`) } else { console.error(`[!] Process ended with code ${code} ${signal ? `and signal ${signal},` : ""}`) } })
}

function decode(code: string): string {
    return code
        .replace(new RegExp('/+w2', 'g'), "\n")
        .replace(new RegExp("/+wg", 'g'), "\\n")
        .replace(new RegExp("/+1ef", 'g'), "\"")
        .replace(new RegExp('/+ie2', 'g'), "\t")
}

function folderExists(path: string): boolean {
    try { accessSync(path) }
    catch { return false }
    return true
}

function arrayToFilepath(arr: string[], index: number, absolute?: boolean): string {
    let ret = absolute ? path.sep : `.${path.sep}`

    for (let i = 0; i < index; i++) {
        ret += arr[i] + path.sep
    }

    return ret
}