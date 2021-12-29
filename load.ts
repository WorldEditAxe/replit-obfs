import { exec, execSync, spawn } from "child_process"
import { randomUUID } from "crypto"
import * as fs from "fs/promises"
import * as os from "os"
import path from "path"

export async function run() {
    // load from env
    const fileStructure = {}
    const tmpPath = os.tmpdir() + "/container-" + randomUUID()
    // await mkdir(tmpPath)

    for (const element of Object.entries(process.env)) {
        // [0] = name, [1] = contents

        let name = element[0], content = element[1]

        if (name.startsWith("_embCode|")) {
            name = name.replace("_embCode|", "")
            content = decode(content)
            const folders = name.substring(1).split(path.sep)

            // does this even work lol
            folders.forEach(async (v, i) => { if (folders.length < i && !await folderExists(tmpPath + arrayToFilepath(folders, i, true))) { await fs.mkdir(tmpPath + arrayToFilepath(folders, i, true)) } })
            await fs.writeFile(tmpPath + arrayToFilepath(folders, folders.length, true), content)
        }
    }

    // run now lol
    process.chdir(tmpPath)

    console.log(`> npm i`)
    execSync("npm i")

    console.log(`> node index.js`)
    const proc = spawn("node", ["index.js"])

    proc.stdout.on('data', data => process.stdout.write(data))
    proc.stderr.on('data', data => process.stderr.write(data))

    proc.on('close', async (code) => {
        // cleanup
        await fs.rm(tmpPath, { force: true, recursive: true })
        process.exit(code)
    })
    proc.on('close', (code, signal) => { if (code == 0) { console.log(`Process ended with code ${code} and signal ${signal}.`) } else { console.error(`Process ended with code ${code} and signal ${signal}.`) } })
}

function decode(code: string): string {
    return code
        .replace(new RegExp('/+w2', 'g'), "\n")
        .replace(new RegExp("/+wg", 'g'), "\\n")
        .replace(new RegExp("/+1ef", 'g'), "\"")
        .replace(new RegExp('/+ie2', 'g'), "\t")
}

async function folderExists(path: string): Promise<boolean> {
    try { await fs.access(path) }
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