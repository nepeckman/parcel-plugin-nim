const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const { Asset } = require("parcel-bundler");

function nimCompile (path) {
    return new Promise((resolve, reject) => {
        const compile = process.env.NODE_ENV !== "production" ? 
            spawn("nim", ["js", "--genDeps", path]) :
            spawn("nim", ["js", "--genDeps", "-d:release", path]);
        let out = "";
        let err = "";
        
        compile.stdout.on("data", (data) => {
            out = out + data;
        })

        compile.stderr.on("data", (data) => {
            err = err + data;
        })

        compile.on("close", (exitCode) => {
            if (exitCode === 0) {
                resolve(out);
            } else {
                reject(err);
            }
        })
    })
}

function read (path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            }
            resolve(data);
        })
    })
}

class NimAsset extends Asset {
    
    constructor(name, options) {
        super(name, options);
        this.type = "js";
    }

    nimcacheDir () {
        const dir = path.dirname(this.name);
        return dir + "/nimcache";
    }

    projectName () {
        const p = path.parse(this.name);
        return p.name;
    }

    projectFile() {
        return {
            dir: this.nimcacheDir(),
            name: this.projectName()
        }
    }

    compiledFilePath() {
        let file = this.projectFile();
        file.ext = '.js';
        return path.format(file);
    }

    depFilePath() {
        let file = this.projectFile();
        file.ext = '.deps';
        return path.format(file);
    }

    shouldInvalidate() {
        return true;
    }

    async pretransform() {
        await nimCompile(this.name);
    }

    async collectDependencies() {
        if (fs.existsSync(this.depFilePath())) {
            const deps = await read(this.depFilePath());
            deps.split('\n')
                .filter(path => path.includes(__dirname) && path !== this.name)
                .forEach(path => this.addDependency(path, {includedInParent: true}))
        }
    }

    async generate() {
        let code = await read(this.compiledFilePath())
        return [
            {
                type: "js",
                value: code
            }
        ]
    }

}

module.exports = NimAsset;
