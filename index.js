/*

    TODO:

        - Save the updated
        - Config file
            - target for partials 
            - dist folder target
            - Setup args
        - Delete <html-kit></html-kit> tags for production and place in dist folder
            - a safe mode that doesn't overwrite template files
            - "templates" folder compiled with includes to "views" folder
        - Browser refreshing?
        - Custom functions
        - Inject variables
        - could inject custom browser JS for running commands from the "run" action
        - Common libraries?
        

    *INFO/Ideas:
        - use attributes for commands after injections 
        - in prod, run a build mode and remove all <html-kit></html-kit> tags in the dist folder

        - Initial build mode
            - Create a full HTML doc
            - `html-kit generate`
            - could just use a basic HTML5 file included 😑
        - Could inject a head

    BUGS:  

        

*/

const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
var pretty = require("pretty");

//* load with npm module config
// const config = require("config");
const config = {
    partials: "./partials", // Folder where partials are located.
    views: "./views", // Folder where the targets are located
    templates: "./templates",
};

// Watch for changes to partials
const watcher = chokidar.watch(config.partials, {
    ignored: [/(^|[\/\\])\../, "./node_modules", /\.js$/], // ignore dotfiles
    ignoreInitial: true,
    persistent: true,
});

class HTMLKIT {
    constructor(config) {
        this.partials = config.partials;
        this.views = config.views;
    }

    parseFiles(fileName) {
        // Returns commands that are captured between html-kit tags
        const fileData = fs.readFileSync(
            "/home/bj/repo/html-kit/index.html",
            "utf-8"
        );
        if (!fileData) return null;
        const htmlKitRegEx = /(<html-kit>.*<\/html-kit>)/;
        const match = fileData.match(htmlKitRegEx);
        // console.log("parsed match" , match[1])
        if (!match || !match[1]) {
            console.log("nothing to parse");
            return null;
        }
        return match[1];
    }

    runCommands(data) {
        // data is a object with file location and tag
        console.log("data", data);

        // include command
        const includeRegEx = /include\("(.*)"\)/;
        if (!data.tag) return;
        const file = data.tag.match(includeRegEx)[1];

        // grab the desired partial
        const partial = fs.readFileSync(path.resolve(`${file}.html`), "utf-8");
        // console.log(partial)

        // reformat using tag
        const newTags = `<html-kit include="${file}">${partial}</html-kit>`;
        const htmlKitRegEx = /(<html-kit>.*<\/html-kit>)/;

        const targetData = fs.readFileSync(
            path.resolve(`${data.target}`),
            "utf-8"
        );
        const newTarget = targetData.replace(htmlKitRegEx, newTags);

        console.log("target", newTarget);

        fs.writeFileSync(path.resolve(`${data.target}`), newTarget);
    }

    // Scan the view folder to update any
    scanViews(changedPartial) {
        let views = fs.readdirSync(this.views);
        console.log(views);
        for (const [i, view] of views.entries()) {
            this.findTags(view, changedPartial);
        }
    }

    findTags(view) {
        // view to be updated
        const fileData = fs.readFileSync(
            path.resolve(this.views, view),
            "utf-8"
        );
        let fileRows = fileData.split("\n");

        for (const [i, s] of fileRows.entries()) {
            fileRows[i] = s.trim().replace(/(\r\n|\n|\r)/gm, "");

            let match = s.match(/<html-kit(\s.*)>(.*)<\/html-kit>/);
            let kitCommands = match ? match[1].trim().split(" ") : "";
            if (kitCommands) {
                var extras = { test: "test" };
                for (const [j, k] of kitCommands.entries()) {
                    let commandRegEx = /(.*)="(.*)"/;
                    if (commandRegEx.exec(k)) {
                        let action = k.match(commandRegEx)[1]; // i.e. include=
                        let value = k.match(commandRegEx)[2]; //       "value"
                        //? not really sure how these sorts of functions will work
                        //? only one of these is called at a time, thus can't pass the extras
                        //* can update an extras object to pass along, but it is detirmined
                        //* by the order of the actions. Can switch to the word "action" instead
                        //* of "run", and sort the array so actions is first. Or always "include"
                        //* last.

                        if (action === "run") {
                            console.log(`run function: ${value}`);
                            extras.dataBefore = "Before content";
                        }
                        if (action === "include") {
                            fileRows[i] = this.loadPartial(value, extras);
                        }
                    }
                }
            }
        }
        // console.log(fileRows);

        let t = fileRows.join("");
        console.log(view);
        console.log(pretty(t));

        // match the lines with <html-kit> then use JS to parse
        // or in the loop of items, use JS to parse out the instructions
        // in side that loop should be able to access the inside of the current line?
        // or just replace the entire tag and rebuild it instead of accessing between

        //* look at SSS some more (BB)
        // might have to do one pass then another to replace
        //* "how to find a text and replace it based on a variable inside of it and/or regex"

        // console.log(str.match(regex));

        // while ((m = regex.exec(str)) !== null) {
        //     // This is necessary to avoid infinite loops with zero-width matches
        //     if (m.index === regex.lastIndex) {
        //         regex.lastIndex++;
        //     }
        // // The result can be accessed through the `m`-variable.
        // m.forEach((match, groupIndex) => {
        //     console.log(`group ${groupIndex}: ${match}`);
        // });
    }
    // <html-kit\s+(?:(.+)="(.+)")

    loadPartial(partial, extras) {
        let partialData = fs.readFileSync(
            path.resolve(config.partials, partial) + ".html",
            "utf-8"
        );
        console.log("extras2", extras);
        let html = `<html-kit include="${partial}">${extras.dataBefore}${partialData}</html-kit>`;
        return html;
    }
}

console.log("Watching folders...");
htmlKit = new HTMLKIT(config);

const log = console.log.bind(console);
watcher.on("add", (path) => log(`File ${path} has been added.`));
// watcher.on("change", (path) => {
//     log(`File ${path} has been changed.`);
//     htmlKit.findTags(path);
// });
watcher.on("change", (path) => {
    log(`File ${path} has been changed.`);
    htmlKit.scanViews(path);
});
