import * as fs from "node:fs/promises"
import { createInterface } from "node:readline"
import { resolve, relative } from "path"

export async function run() {
    const readPath = "./src/"

    async function toEnv(filePath: string, files: {}, data: {}) {
        const writeJson = { ...files }
        writeJson[" _startCommand|"] = data["command"]
        
        await fs.writeFile(filePath, JSON.stringify(writeJson))
    }

    function safeConvertCode(code: string): string {
        return code.replace(new RegExp("\\n", 'g'), "__32wdcj").replace(new RegExp(/\\n/, 'g'), "__wefn32").replace(new RegExp(/"/, 'g'), "__f329ujn").replace(new RegExp(/\t/, 'g'), "__wre3d").replace(new RegExp(/\\/, 'g'), "__wefewf")
    }

    function toEnvPath(path: string): string {
        return ("_023kde|" + relative(resolve("./code_src"), path))
    }

    async function getFiles(dir: string): Promise<string[]> {
        const dirents = await fs.readdir(dir, { withFileTypes: true });
        const files = await Promise.all(dirents.map((dirent) => {
            const res = resolve(dir, dirent.name)
            return dirent.isDirectory() ? getFiles(res) : [res]
        }))
        return Array.prototype.concat(...files)
    }

    const data = await getTranspilationData()

    console.log("Reading source files...")
    const files = await getFiles("./code_src").catch(async (err) => {
        console.error("Cannot find folder code_src - does it exist and that node.js can access the folder?")
        console.error(`${err.stack}`)

        try { await fs.access('./code_src') }
        catch { await fs.mkdir('./code_src').catch() }

        process.exit(1)
    })
    const textDecoder = new TextDecoder()
    const encodedFiles = {}

    if (files.length < 1) {
        console.error("There aren't any files to encode!")
        process.exit(1)
    }

    for (const file of files) {
        try {
            const serializedPath = toEnvPath(file)

            if (!encodedFiles[serializedPath]) {
                console.debug(`Processing ${file}...`)
                const contents = safeConvertCode(textDecoder.decode((await fs.readFile(file))))

                if (contents.length <= 32767) {
                    encodedFiles[serializedPath] = contents
                } else {
                    console.error(`Encoded file ${file} contents are over length limit of 32767 - skipping!`)
                }
            } else {
                console.error(`Detected file name ambiguity - skipping file processing of ${file}!`)
            }
        } catch (err) {
            console.error(`Error processing file ${file}!`)
            console.error(`Stacktrace:\n${err.stack}`)
        }
    }

    console.log("Saving .env JSON contents to disk...")
    await toEnv("./env.out", encodedFiles, data).catch((err) => {
        console.error(`Failed to write to disk! | ${err.stack}`)
    })
    console.log("Done processing files! Your exported JSON file is at env.out.")
    process.exit(0)
}

function getTranspilationData(): Promise<{}> {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    
    const promise = new Promise<{}>(res => {
        const retData = {}
        
        rl.question("Alrighty, let's set up your project. What command should I run to start your project?\n> ", cmd => {
            retData["command"] = cmd
            console.log("Gimme a second and I'll transpile your project!")

            res(retData)
        })
    })

    return promise
}