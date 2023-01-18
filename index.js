import express from "express"; //Import the express dependency
import shell from "shelljs"; //for using the shell terminal
import bp from "body-parser";
import fs from "fs"; //write read files
import axios from "axios"; //call endpoint
import util from "util"; //use promises for fs library

import { keyNames, getBranch } from "./src/Utilities.js";

//import {jsondata} from './erc20.json' assert { type: "json" };

const PORT = process.env.PORT || 5000; //define port
const app = express(); //Instantiate an express app, the main work horse of this server
app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));

// Convert fs.readFile to return a promise
const readFile = util.promisify(fs.readFile);

// Convert fs.writeFile to return a promise
const writeFile = util.promisify(fs.writeFile);

async function runHidden(type, cds) {
  try {
    let data = {};
    let modified = {};
    let filePath = ``;
    if (type === "triggers") {
      data = await readFile("triggerHiddenTemplate.js", "utf8");
      modified = data.replace(/replaceTrigger/g, cds);
      filePath = `./dynamic-app/${type}/${[cds]}_hidden.js`;
    } else {
      data = await readFile("actionHiddenTemplate.js", "utf8");
      modified = data.replace(/replaceAction/g, cds);
      filePath = `./dynamic-app/triggers/${[cds]}_action_hidden.js`;
    }
    await writeFile(filePath, modified, "utf8");
  } catch (error) {
    console.log("runHidden ", error);
  }
}

async function run(type, cds) {
  try {
    let data = {};
    let modified = {};
    let filePath = `./dynamic-app/${type}/${[cds]}.js`;
    if (type === "triggers") {
      data = await readFile("triggerTemplate.js", "utf8");
      modified = data.replace(/replaceTrigger/g, cds);
    } else {
      data = await readFile("actionTemplate.js", "utf8");
      modified = data.replace(/replaceAction/g, cds);
    }
    await writeFile(filePath, modified, "utf8");
    await addToIndex(cds, type);
  } catch (error) {
    console.log("run ", error);
  }
}
async function replaceRCfile(type) {
  try {
    let data = {};
    let modified = {};
    let filePath = `./dynamic-app/.zapierapprc`;
    if (type === "production") {
      data = await readFile(".zapierapprcProduction", "utf8");
      
    } else {
      data = await readFile(".zapierapprcStaging", "utf8");
     
    }
    await writeFile(filePath, data, "utf8");
  
  } catch (error) {
    console.log("replaceRC ", error);
  }
}
async function checkIftriggerOrAction(value, type) {
  try {
    //Trigger = 1, Action = 2 @Juan
    const filePath = `./grindery-nexus-schema-v2/cds/web3/${value}.json`;
    console.log("before");
    const fileContent = await readFile(filePath, "utf8"); // read the file
    console.log(fileContent);
    console.log("after");
    const parseContent = JSON.parse(fileContent);
    if (type == 1) {
      if (parseContent.triggers.length > 0) {
        return true;
      } else {
        return false;
      }
    } else if (type == 2) {
      if (parseContent.actions.length > 0) {
        return true;
      } else {
        return false;
      }
    } else {
      return "choose a type";
    }
  } catch (error) {
    console.log("checkIftriggerOrAction ", error);
  }
}

const addToIndex = async (value, type) => {
  let counter = 18;
  // Read the contents of the file
  try {
    const readRes = await readFile("./dynamic-app/index.js", "utf8");
   
    let lines = readRes.split("\n");
    let line_to_add = ``;
    if (type === "triggers") {
      line_to_add = `const ` + value + ` = require("./${type}/` + value + `")`;
      console.log("this is a trigger ", value)
    } else {
      line_to_add =
        `const ` + value + `_action` + ` = require("./${type}/` + value + `")`;
      console.log("this is a action ", value)
    }
    const added = line_to_add;
    lines.splice(counter, 0, added); // Insert the new line at the specified index
   
    counter = counter - 1;
    // Join the lines back together and write the modified contents back to the file
    const res = await writeFile(
      "./dynamic-app/index.js",
      lines.join("\n"),
      "utf8"
    );
    return res;
  } catch (error) {
    console.log("addToIndex ", error);
  }
};
async function loop(added){
  for (let index = 0; index < added.length; index++) {
    await runHidden("triggers", added[index]);
    await runHidden("creates", added[index]);
    await run("triggers", added[index]);
    await run("creates", added[index]);
  }
  return 
}
app.post("/githubUpdate", async (req, res) => {
  //parse payload from github webhook
  const value = JSON.parse(req.body.payload);
  //reporsitory =
  //shell.exec(`git clone "https://connex-clientaccess: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@github.com/connex-clientaccess/dynamic-app"`)

  shell.exec(
    `git clone "https://connex-clientaccess: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@github.com/grindery-io/grindery-nexus-schema-v2"`
  );
  pullDynamic(
    "https://connex-clientaccess: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@github.com/connex-clientaccess/dynamic-app"
  );
  //format key name files
  const added = keyNames(value.commits[0].added);
  if (added != undefined) {
    //const added= ["erc20", "erc721", "gnosisSafe"]

    // const removed = keyNames(value.commits[0].removed);
    // console.log(removed);
    
    await loop(added)
    // push to zapier
    //await pushDynamic();
    //await sendNotification();
     // push to zapier
    
    if(branch == "master"){
      // {
      //   "id": 174957,
      //   "key": "App174957"
      // }
      await pushDynamic()
    }else if(branch == "staging"){
      // {
      //   "id": 175726,
      //   "key": "App175726"
      // }
      await pushDynamic();
    }

    res.status(200).json({ res: "hello" });
  } else {
    res.status(400).json({ res: "request again", payload: value });
  }

  //pushDynamic("https://github.com/connex-clientaccess/dynamic-app");
});

app.post("/getUpdate", async (req, res) => {
  //parse payload from github webhook
  
  //const value = JSON.parse(req.body.payload);
  const value = req.body;
  pullSchema(
    "https://connex-clientaccess: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@github.com/grindery-io/grindery-nexus-schema-v2"
  );
  pullDynamic(
    "https://connex-clientaccess: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@github.com/connex-clientaccess/dynamic-app"
  );

  //format key name files
  const added = keyNames(value.commits[0].added);
  //const removed = keyNames(value.commits[0].removed);
  const branch = getBranch(value.ref);
  if (added != undefined) {
    //const added= ["erc20", "erc721", "gnosisSafe"]

    // const removed = keyNames(value.commits[0].removed);
    // console.log(removed);
    for (let index = 0; index < added.length; index++) {
      const element = added[index];
      const trigger = await checkIftriggerOrAction(element, 1);
      const action = await checkIftriggerOrAction(element, 2);
      if (trigger) {
        await runHidden("triggers", element);
        await run("triggers", element);
      }
      if (action) {
        //TO-DO
        await runHidden("creates", added[index]);
        await run("creates", added[index]);
      }
    }
    console.log(branch)
    if(branch == "master"){
      // {
      //   "id": 174957,
      //   "key": "App174957"
      // }
      await replaceRCfile("production")
      await pushDynamic("production")
    }else if(branch == "staging"){
      // {
      //   "id": 175726,
      //   "key": "App175726"
      // }
      await replaceRCfile("staging")
      await pushDynamic("staging");
    }

    //await sendNotification()

    res.status(200).json({ res: "hello" });
  } else {
    res.status(400).json({ res: "request again", payload: value });
  }

  //pushDynamic("https://github.com/connex-clientaccess/dynamic-app");
});

async function sendNotification() {
  try {
    const response = await axios.post(
      "https://hooks.zapier.com/hooks/catch/92278/bjtiv8m/"
    );
    console.log(response.data);
  } catch (error) {
    console.error(error);
  }
}

const pullDynamic = (repository) => {
  let path = `./dynamic-app`;
  //console.log("root folder")
  //shell.exec(`dir .`)
  shell.cd(path); //inside dynamic
  shell.exec(`git init `);
  shell.exec(`git pull ${repository}`);
  //console.log(path)
  shell.exec(`npm i`);
  //console.log("after install")
  //shell.exec(`dir .`)
  shell.cd(".."); //back to index
  //console.log("back to root folder")
  //shell.exec(`dir .`)
};
const pullSchema = (repository) => {
  shell.cd("./grindery-nexus-schema-v2");
  shell.exec("git init");
  shell.exec(`git pull ${repository}`);
  shell.cd("..");
};

const updateVersion = () => {
  shell.cd("./dynamic-app");
  shell.exec(`npm version patch --no-git-tag-version`);
};
const updateClient = () =>{
  shell.exec('npm update grindery-nexus-client')
}
const pushDynamic = async (repository) => {
  console.log("root folder");
  shell.exec("dir .");
  //shell.cd("..")
  console.log("after");
  updateVersion(); //update version before pushing to zapier
  updateClient()
  
  shell.exec("git init");
  shell.exec(`git config user.email clientaccess@connex.digital`);
  shell.exec(`git config user.name connex-clientaccess`);
  shell.exec("git add .");
  shell.exec(`git commit -m "some message"`);
  shell.exec(
    `git push "https://connex-clientaccess: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@github.com/connex-clientaccess/dynamic-app"`
  );
  console.log("after update version");
  shell.cd("..");

  //shell.exec('npm run pushdynamicLink')
  shell.exec(`npm run pushdynamic`);
};
 
app.listen(PORT, () => {
  //server starts listening for any attempts from a client to connect at port: {port}
  console.log(`Now listening on port ${PORT}`);
});
// app.post("/runPull", async (req, res) => {
//   let repository = "https://connex-clientaccess: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@github.com/connex-clientaccess/dynamic-app"
//   let path = `./dynamic-app`
//   console.log("root folder")
//   shell.exec(`dir .`)
//   shell.cd(path) //inside dynamic
//   shell.exec(`git init `)

//   shell.exec(`git pull ${repository}`)
//   console.log(path)
//   shell.exec(`npm i`)
//   console.log("after install")
//   shell.exec(`dir .`)
//   shell.cd("..") //back to index
//   console.log("back to root folder")
//   shell.exec(`dir .`)
// })

// app.post("/runPush", async (req, res) => {

//   let repository = "https://connex-clientaccess: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@github.com/connex-clientaccess/dynamic-app"
//   pullDynamic(repository)
//   console.log("root folder")
//   shell.exec("dir .")
//   //shell.cd("..")
//   console.log("after")
//   updateVersion(); //update version before pushing to zapier
//   shell.cd("..")
//   console.log("after update version")
//   shell.exec("dir .")

//   //shell.exec('npm run pushdynamicLink')
//   shell.exec(`npm run pushdynamic`);
// })

// app.post("/pushPokeApi", async (req, res) => {
//   //parse payload from github webhook
//   shell.exec(`git clone "https://connex-clientaccess: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@github.com/connex-clientaccess/PokeApi"`)
//   let path = `./PokeApi`;
//   shell.exec("dir .");
//   shell.cd(path);
//   //shell.exec(`git init `);
//   //shell.exec(`git pull ${repository}`);
//   console.log("the shell path before npm i", path);
//   shell.exec(`npm i`);
//   path = `../`;

//   shell.cd(path);
//   console.log("excute")
//   shell.exec("rm -rf node_modules")
//   shell.exec("npm i")

//   shell.exec(`npm run pushtozapier`);
// })

//   //TODO - perform loop for deleted cds files
//   async function runHidden(type, generatedTrigger){
//     try {

//         const filePath = `./dynamic-app/${type}/${[generatedTrigger]}_hidden.js`
//         const readRes = fs.readFile('triggerHiddenTemplate.js', 'utf8', (err, data) => {
//           if (err) {
//             return console.log(err);
//           }

//           // Replace all occurrences of the word "replace" with "foo"
//           const modified = data.replace(/replaceTrigger/g, generatedTrigger);

//           // Write the modified content back to the file
//           const res = fs.writeFile(filePath, modified, 'utf8', (error) => {
//             if (error) {
//               return console.log(error);
//             }
//             console.log(`Successfully replaced all occurrences of "replaceTrigge" with ${generatedTrigger} in the file`);
//           });

//           return res;
//         });

//         return readRes
//     } catch (error) {
//        console.log(error)
//     }
// }
// async function run(type, generatedTrigger){
//     try {

//         const filePath = `./dynamic-app/${type}/${[generatedTrigger]}.js`
//         const readRes = fs.readFile('triggerTemplate.js', 'utf8', (err, data) => {
//           if (err) {
//             return console.log(err);
//           }

//           // Replace all occurrences of the word "replace" with "foo"
//           const modified = data.replace(/replaceTrigger/g, generatedTrigger);

//           // Write the modified content back to the file
//           const res = fs.writeFile(filePath, modified, 'utf8', (error) => {
//             if (error) {
//               return console.log(error);
//             }
//             console.log(`Successfully replaced all occurrences of "replaceTrigge" with ${generatedTrigger} in the file`);
//           });

//           return res;
//         });

//         return readRes
//     } catch (error) {
//        console.log(error)
//     }
// }
//const res = addToIndex(obj.added)

// function run(){
//   //test
//   let obj = {
//     added: ["erc20", "erc721", "gnosisSafe"]
//   }
//   console.log(obj);

//   const res = addToIndex(obj.added)
//   updateVersion()
//   // for (let index = 0; index < obj.added.length; index++) {
//   //   const added = `const createListWorkflows = require("./creates/` + obj.added[index] + `")`;
//   //   const res = addToIndex(added)
//   //   console.log(res)
//   // }
// }
// run()

// const jsonData = "hello world"
// app.get('/updateCDS', (req, res)=>{
//     const value = updateCDS(jsondata);
//     res.send(value);
// })

// // endpoint that runs the function and returns its value
// app.patch('/updateFile', (req, res) => {
//   const value = updateFile(jsondata);
//   res.send(value);
// });
// app.post('/createFile', (req, res) => {
//     const value = createFile(jsondata);
//     res.send(value);
// });
