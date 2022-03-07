# repl.it Code Hider
This node.js project locks down project access for everyone except the repl owner for free using environment variables.  
**Note: This will only work for files saved using the UTF-8 encoding. Additionally, there is a hard limit of 32767 characters per processed file!**  
These only apply to the non-GitHub versions of the obfuscator. 

# Getting Started (GitHub)
## Preparation/Prerequisites
You are required to have two things in order to get started: a GitHub account, a GitHub repository, and a Github Access token. Look up how to get those prior to starting.
## Running your Code
1. Create a new repl with the files inside of `repl_example`. You may change `replit.nix` to add dependencies, but don't remove what's already there!
2. Add the following environment variables:
   - `REPO` - The repository of the private project (i.e. `username/repo`)  
   - `ACCESS_TOKEN` - The access token of the project  
3. Start the repl
4. (Optional) Set up a web pinging service to ping your repl every 5-10 min or so. 
   - A reliable, free pinging service is https://uptimerobot.com/.

# Getting started
The software does not have any dependencies apart from node.js ofc :v
## Processing your Code
1. Download a project release to a folder on your computer. You may want to install node.js if you haven't. 
2. Drag and drop your code into a folder inside of the folder with the source code named `code_src`. Don't forget to remove node.js modules, your .env files and anything sensitive!
3. Inside of the folder, run `node index.js transpile`. This will convert all your code to a JSON object located at `env.out`.
## Uploading and Running your Code
Before doing the below, please process your code.
1. Create a new repl with the project type set to "Nix (beta)".
2. Delete every file in the files sidebar.
3. Download the source code, unzip it and upload the contents of `repl_example` to your repl. Then, drag all the files out to the root folder.  
The files are obfuscated to make it hard to reverse-engineer. However, you may manually use the JavaScript files pulled from the release distribution.
4. On the sidebar, click the padlock to access the environment variables and hit "Open raw editor".
5. Copy and paste the contents of the `env.out` file here and hit "Save".
6. If you haven't, please add your environment variables required for your app to function.
7. Hit the Run button and you're off to the races! :D
# Limitations
There are several limitations to the code hider, namely:
- Encoded files longer than 32767 will not be processed (although the chances of you using such a long file are pretty slim)
- Files not encoded in UTF-8 format will not be processed (this means no sqlite - consider trying out a free database host or the built-in database feature!)
- Increased startup time (for dependency installation)
- Hard-coded to only work for node.js (although it can be modified for use with other languages)
