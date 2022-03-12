import { exec, execSync, spawn } from "child_process"
import { randomUUID } from "crypto"
import { access, mkdir, readFile, rm } from "fs/promises"
import { tmpdir } from "os"
import { createServer } from "http"

const l = (msg: string, type?: string) => console.log(`${new Date().toISOString()} -> ${type || "INFO"} -> ${msg}`)
const snooze = (ms: number) => new Promise(res => setTimeout(res, ms))

type runfileConfigs = {
    run: string,
    autoPush: boolean,
    autoPushInterval: number, // in sec
    cmds: string[]
}

function configGit() {
    execSync("git config --global user.email \"noemailforyou@lmao.com\"")
    execSync("git config --global user.name \"Repl.it Auto Push\"")
}

async function parseRunfile(): Promise<runfileConfigs> {
    const ret = { run: undefined, autoPush: false, autoPushInterval: undefined, cmds: [] }

    for (const line of (await readFile(".runfile", 'utf-8')).split(/\r?\n/)) {
        if (!line.startsWith('#') && line.length > 0) {
            if (line.startsWith('@run.cmd=')) ret.run = line.replace('@run.cmd=', '')
            else if (line.startsWith('@git.auto_push=')) ret.autoPush = line.replace('@git.auto_push=', '') == 'true' ? true : false
            else if (line.startsWith('@git.auto_push_interval=')) ret.autoPushInterval = parseInt(line.replace('@git.auto_push_interval=', ''))
            else ret.cmds.push(line)
        }
    }

    if (ret.autoPushInterval == NaN) ret.autoPushInterval = 0
    return ret
}

function upload(): Promise<number> {
    return new Promise<number>(async (res, rej) => {
        try {
            const c = spawn('git', ['pull'])
            await new Promise(res => {
                c.on('exit', () => res(0))
            })

            const child = spawn('git', ['add', '-A'])
            child.on('exit', code => {
                if (code != 0) return rej(code)
            })
            await new Promise(res => {
                child.on('exit', () => res(0))
            })

            const child2 = spawn('git', ['commit', '-m', 'Automatic commit'])
            child2.on('exit', code => {
                if (code != 0) return rej(code)
            })
            await new Promise(res => {
                child2.on('exit', () => res(0))
            })

            const child3 = spawn('git', ['push', 'origin', '--force'])

            child3.on('exit', code => {
                if (code != 0) return rej(code)
            })
            await new Promise(res => {
                child3.on('exit', () => res(0))
            })
            res(0)
        } catch (err) {
            rej(err)
        }
    })
}

async function initAutosaveLoop(interval: number) {
    while (true) {
        await snooze(interval)
        if (process.env.VERBOSE == 'true') l("Auto-saving!", 'AUTOSAVE-DEBUG')

        try {
            await upload()
        } catch (err) {
            if (process.env.VERBOSE == 'true') l(`Error whilst autosaving: ${err.stack}`, 'ERROR')
        }
    }   
}

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
        if (process.env.VERBOSE == 'true') l("Starting keepalive server...", 'KEEPALIVE')
        const server = createServer((req, res) => {
            res.writeHead(200)
            res.end('{"status":"OK"}')
        })
        server.listen(8080)
        if (process.env.VERBOSE == 'true') l("Keepalive server listening on port 8080!", 'KEEPALIVE')

        const options = await parseRunfile()
        
        if (!options.run) {
            if (process.env.VERBOSE == 'true') l(".runfile is missing run command. Nothing to do.\nRun command example: @run.cmd=echo \"Hello World!\"", 'WARN')
            process.exit(1)
        } else if (options.autoPush && !(options.autoPushInterval || options.autoPushInterval <= 0)) {
            if (process.env.VERBOSE == 'true') l(".runfile appears to have autopush on, but the interval is either 0 or lower. Please make sure your runfile has an interval (i.e. @git.auto_push_interval=60).\nSetting to default interval of 5 minutes.", 'WARN')
            options.autoPushInterval = 300
        }

        if (options.autoPush) configGit()
        if (process.env.VERBOSE == 'true') l(`Auto push configs: {enabled=${options.autoPush}, interval=${options.autoPushInterval}}`)
        options.autoPushInterval *= 1000

        for (const cmd of options.cmds) {
            if (process.env.VERBOSE == 'true') l(`> ${cmd}`, 'RUNFILE')
            execSync(cmd)
        }

        if (process.env.VERBOSE == 'true') l(`> ${options.run}`, 'RUNFILE')
        const proc = exec(options.run)
        let died = false

        proc.stdout.on('data', data => process.stdout.write(data))
        proc.stderr.on('data', data => process.stderr.write(data))

        process.stdin.on('data', data => {
            if (!died) {
                try { proc.stdin.write(data) }
                catch {}
            }
        })

        proc.on('exit', async code => {
            died = true

            process.chdir("~")
            await rm(dir, { force: true, recursive: true })
            process.exit(code)
        })

        if (options.autoPush) initAutosaveLoop(options.autoPushInterval)
    } else {
        if (process.env.VERBOSE == 'true') l(".runfile does not exist.", 'ERROR')
        if (process.env.VERBOSE == 'true') l("Nothing to do.", 'ERROR')
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

    if (process.env.VERBOSE == 'true') l("Downloading files...")
    await clone(folder, process.env.REPO, process.env.ACCESS_TOKEN)

    l("Starting...")
    await run (folder)
}

function check_env() {
    l("Initializing...")
    if (!process.env.REPO) {
        if (process.env.VERBOSE == 'true') l("The environment variable 'REPO' is missing. Please set it to a valid GitHub repository (i.e. username/repo-name) in Secrets.", 'FATAL')
        process.exit(1)
    }
    if (!process.env.ACCESS_TOKEN) {
        if (process.env.VERBOSE == 'true') l("The environment variable 'ACCESS_TOKEN' is missing. You may not be able to access private repositories.", 'WARN')
    }
}

check_env()
await start()