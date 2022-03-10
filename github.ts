import { exec, execSync, spawn } from "child_process"
import { randomUUID } from "crypto"
import { access, mkdir, readFile, rm } from "fs/promises"
import { tmpdir } from "os"
import { createServer } from "http"

const l = (msg, type?) => console.log(`${new Date().toISOString()} -> ${type || "INFO"} -> ${msg}`)

/**
 * Clone into a GitHub repo
 * @param dir The directory to clone into
 * @param repo_name The full name of the GitHub repository (name-here/repo-name-here)
 * @param token The GitHub access token (if appliable)
 * @returns A promise with the error code
 */
function clone(dir: string, repo_name: string, token?: string): Promise<number> {
    const uri = `git clone https://any:${token || "any"}@github.com/${repo_name}`

    return new Promise<number>((res, rej) => {
        try {
            const child = spawn('git', ['clone', `https://any:${token || "any"}@github.com/${repo_name}`, '.'])
            child.on('exit', code => {
                if (code != 0) {
                    // throw error if non-zero error code
                    rej(code)
                } else {
                    res(code)
                }
            })
        } catch (err) {
            rej(err)
        }
    })
}

/**
 * Setups the runtime environment for the bot.
 * @returns The absolute path to the folder containing the environment.
 */
async function init_environment(): Promise<string> {
    const folder_name = `runtime-${randomUUID()}`, folder = `${tmpdir()}/${folder_name}`
    await mkdir(folder)
    process.chdir(folder)
    return folder
}

async function fsExists(file: string): Promise<boolean> {
    try {
        await access(file)
        return true
    } catch {
        return false
    }
}

async function run(dir: string) {
    process.chdir(dir)
    if (await fsExists(".runfile")) {
        for (const line of (await readFile(".runfile", 'utf-8')).split(/\r?\n/)) {
            if (line.startsWith("RUN=")) {
                const cmd = line.replace(/RUN=/, '')
                if (process.env.VERBOSE == 'true') l(`> ${cmd}`, 'RUNFILE')
                const proc = exec(cmd)

                l("Starting keepalive server...", 'KEEPALIVE')
                const server = createServer((req, res) => {
                    res.writeHead(200)
                    res.end('{"status":"OK"}')
                })
                server.listen(8080)
                l("Keepalive server listening on port 8080!", 'KEEPALIVE')

                proc.stdout.on('data', data => process.stdout.write(data))
                proc.stderr.on('data', data => process.stderr.write(data))

                proc.on('exit', async code => {
                    process.chdir("~")
                    await rm(dir, { force: true, recursive: true })
                    process.exit(code)
                })
            } else if (line.length > 0) {
                if (process.env.VERBOSE == 'true') l(`> ${line}`, 'RUNFILE')
                execSync(line)
            }
        }
    } else {
        l(".runfile does not exist.", 'ERROR')
        l("Nothing to do.", 'ERROR')
        process.exit(1)
    }
}

async function start() {
    let folder

    l("Initializing runtime environment...")
    try {
        folder = await init_environment()
    } catch (err) {
        l(`An error has occurred. Error:\n${err.stack}`, 'ERROR')
    }

    l("Downloading files...")
    await clone(folder, process.env.REPO, process.env.ACCESS_TOKEN)

    l("Starting...")
    await run (folder)
}

function check_env() {
    l("Initializing...")
    if (!process.env.REPO) {
        l("The environment variable 'REPO' is missing. Please set it to a valid GitHub repository (i.e. username/repo-name) in Secrets.", 'FATAL')
        process.exit(1)
    }
    if (!process.env.ACCESS_TOKEN) {
        l("The environment variable 'ACCESS_TOKEN' is missing. You may not be able to access private repositories.", 'WARN')
    }
}

check_env()
await start()