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

                // add env files to json file
                if (serializedPath.replace('_023kde|', '') == ".env") {
                    console.log("Detected dotenv file, loading...")
                    const envs = Object.entries(parseEnv(textDecoder.decode(await fs.readFile('./code_src/.env')), {}))

                    for (const env of envs) {
                        // [0] = key, [1] = value
                        encodedFiles[env[0]] = env[1]
                    }

                    console.log(`JSON-ized ${envs.length} environment variable${envs.length == 1 ? '' : "s"}.`)
                } else {
                    const contents = safeConvertCode(textDecoder.decode((await fs.readFile(file))))

                    if (contents.length <= 32767) {
                        encodedFiles[serializedPath] = contents
                    } else {
                        console.error(`Encoded file ${file} contents are over length limit of 32767 - skipping!`)
                    }
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
            console.log("Transpiling project...")

            res(retData)
        })
    })

    return promise
}

// pulled code from dotenv
const NEWLINE = '\n'
const RE_INI_KEY_VAL = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/
const RE_NEWLINES = /\\n/g
const NEWLINES_MATCH = /\r\n|\n|\r/

function parseEnv(src /*: string | Buffer */, options /*: ?DotenvParseOptions */) /*: DotenvParseOutput */ {
    const debug = Boolean(options && options.debug)
    const obj = {}

    // convert Buffers before splitting into lines and processing
    src.toString().split(NEWLINES_MATCH).forEach(function (line, idx) {
        // matching "KEY' and 'VAL' in 'KEY=VAL'
        const keyValueArr = line.match(RE_INI_KEY_VAL)
        // matched?
        if (keyValueArr != null) {
            const key = keyValueArr[1]
            // default undefined or missing values to empty string
            let val = (keyValueArr[2] || '')
            const end = val.length - 1
            const isDoubleQuoted = val[0] === '"' && val[end] === '"'
            const isSingleQuoted = val[0] === "'" && val[end] === "'"

            // if single or double quoted, remove quotes
            if (isSingleQuoted || isDoubleQuoted) {
                val = val.substring(1, end)

                // if double quoted, expand newlines
                if (isDoubleQuoted) {
                    val = val.replace(RE_NEWLINES, NEWLINE)
                }
            } else {
                // remove surrounding whitespace
                val = val.trim()
            }

            obj[key] = val
        }
    })

    return obj
}