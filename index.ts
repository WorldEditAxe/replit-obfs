import * as transpile from "./transpile.js"
import * as run from "./load.js"

let startupFlag = process.argv[2]

if (!startupFlag) {
    console.error("No startup flag passed! Valid values are either transpile or run!")
    process.exit(1)
} else {
    startupFlag = startupFlag.toLowerCase()
}

switch(startupFlag) {
    default:
        console.error("Unknown startup flag! Valid values are either transpile or run!")
        process.exit(1)
    case "transpile":
        await transpile.run()
        break
    case "run":
        await run.run()
        break
}