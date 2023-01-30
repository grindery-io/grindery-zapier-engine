import express from "express"; //Import the express dependency
import shell from "shelljs"; //for using the shell terminal
import bp from "body-parser";
import fs from "fs"; //write read files
import axios from "axios"; //call endpoint
import util from "util"; //use promises for fs library
import path from "path"
import { keyNames, getBranch } from "./src/Utilities.js";

//import {jsondata} from './erc20.json' assert { type: "json" };

const PORT = process.env.PORT || 5000; //define port
const app = express(); //Instantiate an express app, the main work horse of this server
app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));

// Convert fs.readFile to return a promise
const readFile = util.promisify(fs.readFile);
// Convert fs.unlink to return a promise
const deleteFile = util.promisify(fs.unlink)
// Convert fs.writeFile to return a promise
const writeFile = util.promisify(fs.writeFile);

async function runHidden(type, cds, repoName) {
  try {
    let data = {};
    
    let modified = {};
    let filePath = ``;
    let camelCase = cds.replace(/-/g, "_")
    let titleCase = camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
    if (type === "triggers") {
      data = await readFile("triggerHiddenTemplate.js", "utf8");
      console.log("triggersHidden, ",cds)
      modified = data.replace(/replaceDriver/g, cds);
      modified = modified.replace(/replaceTriggerTitleCase/g, titleCase);
      modified = modified.replace(/replaceTriggerCamelCase/g, camelCase);
      filePath = `./${repoName}/${type}/${[camelCase]}_hidden.js`;
    } else {
      data = await readFile("actionHiddenTemplate.js", "utf8");
      console.log("ActionsHidden, ",cds)
      modified = data.replace(/replaceDriver/g, cds);
      modified = modified.replace(/replaceActionTitleCase/g, titleCase);
      modified = modified.replace(/replaceActionCamelCase/g, camelCase);
      filePath = `./${repoName}/triggers/${[camelCase]}_action_hidden.js`;
    }
    await writeFile(filePath, modified, "utf8");
  } catch (error) {
    console.log("runHidden ", error);
  }
}

async function run(type, cds, repoName) {
  try {
    let data = {};
    let modified = {};
   
    let camelCase = cds.replace(/-/g, "_")
    let titleCase = camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
    let filePath = `./${repoName}/${type}/${[camelCase]}.js`;
    console.log(cds)
    if (type === "triggers") {
      data = await readFile("triggerTemplate.js", "utf8");
      console.log("triggers, ",titleCase)
      modified = data.replace(/replaceDriver/g, cds);
      modified = modified.replace(/replaceTriggerTitleCase/g, titleCase);
      modified = modified.replace(/replaceTriggerCamelCase/g, camelCase);
    } else {
      console.log("actions, ",titleCase)
      data = await readFile("actionTemplate.js", "utf8");
      modified = data.replace(/replaceDriver/g, cds);
      modified = modified.replace(/replaceActionTitleCase/g, titleCase);
      modified = modified.replace(/replaceActionCamelCase/g, camelCase);
    }
    
    await writeFile(filePath, modified, "utf8");
    await addToIndex(camelCase, type, repoName);
  } catch (error) {
    console.log("run ", error);
  }
}
async function replaceRCfile(type, repoName) {
  try {
    let data = {};
    let modified = {};
    let filePath = `./${repoName}/.zapierapprc`;
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
   
    const fileContent = await readFile(filePath, "utf8"); // read the file
    
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

const removeFromIndex = async (value, type) => {
  const FILE_LOCATION = './dynamic-app/index.js'
  
  const readRes = await readFile(FILE_LOCATION, "utf8");
  //console.log(readRes);
  let lines = readRes.split("\n");
  console.log("running remove from index")
  lines.map(async (line, index) => {
      if(line.includes(`const ${value} = require("./${type}/${value}")`)){
          console.log(lines[index])
          delete lines[index];
          const res = await writeFile(
              FILE_LOCATION,
              lines.join("\n"),
              "utf8"
          );
      } 
  });
  const readRes2 = await readFile(FILE_LOCATION, "utf8");
  let lines2 = readRes2.split("\n");
  lines2.map(async (line, index) => {
    if(line.includes(`const ${value}_action = require("./${type}/${value}")`)){
      console.log(lines2[index])
      delete lines2[index];
      const res = await writeFile(
          FILE_LOCATION,
          lines2.join("\n"),
          "utf8"
      );
    }
  })
};

const removeFiles = (cds, repoName) => {
  try {
    console.log("running remove files")
    const createsPath =  'dynamic-app/creates';
    const triggersPath = 'dynamic-app/triggers';
    let camelCase = cds.replace(/-/g, "_")
    
    const createsFiles = [`${camelCase}.js`];
    const triggersFiles = [`${camelCase}.js`, `${camelCase}_hidden.js`, `${camelCase}_action_hidden.js`];
    
    createsFiles.forEach(file => {
      console.log(file)
      const filePath = path.join(createsPath, file);
     
      //deleteFile(filePath);
    });
    triggersFiles.forEach(file => {
      const filePath = path.join(triggersPath, file);
      console.log(filePath)
      //deleteFile(filePath);
    });

    removeFromIndex(camelCase, "creates")
    removeFromIndex(camelCase, "triggers")
  }catch{

  }
}

const addToIndex = async (value, type, repoName) => {
  let counter = 18;
  // Read the contents of the file
  try {
    const readRes = await readFile(`./${repoName}/index.js`, "utf8");
   
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
      `./${repoName}/index.js`,
      lines.join("\n"),
      "utf8"
    );
    return res;
  } catch (error) {
    console.log("addToIndex ", error);
  }
};

app.post("/githubUpdate", async (req, res) => {
  const value = JSON.parse(req.body.payload); //PRODUCTION
  //const value = req.body; //TESTING POSTMAN
  //format key name files
  let added = ""
  let removed = ""
  if(value.commits[0].added != undefined){
    added = keyNames(value.commits[0].added); //get key names'
  }
  if(value.commits[0].removed != undefined){
    removed = keyNames(value.commits[0].removed);
  }
  console.log(value.commits[0].removed)
  console.log(removed)
  //const removed = keyNames(value.commits[0].removed);
  const branch = getBranch(value.ref); //get branch
  console.log(branch)
  let repoName = ""

  //Pull repositories
  pullSchema(
    "https://connex-clientaccess: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@github.com/grindery-io/grindery-nexus-schema-v2"
  );
  if(branch == "staging"){
    //repository = "https://connex-clientaccess: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@github.com/connex-clientaccess/${repoName}"
    repoName = "dynamic-app"
    pullRepository(
      `https://connex-clientaccess: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@github.com/connex-clientaccess/${repoName}`,
      repoName
    );  
  }else if(branch == "master"){
    repoName = "GrinderyGatewayV3"
    pullRepository(
      `https://connex-clientaccess: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@github.com/connex-clientaccess/${repoName}`,
      repoName
    );
  }
  
  if (added != undefined || removed != undefined) {
    //const added= ["erc20", "erc721", "gnosisSafe"]

    // const removed = keyNames(value.commits[0].removed);
    // console.log(removed);
    console.log(removed)
    if(removed != undefined){
      for (let index = 0; index < removed.length; index++) {
        const element = removed[index];
        removeFiles(element, repoName)
      }
    }
    if(added != undefined){
      for (let index = 0; index < added.length; index++) {
        const element = added[index];
        const trigger = await checkIftriggerOrAction(element, 1);
        const action = await checkIftriggerOrAction(element, 2);
        if (trigger) {
          await runHidden("triggers", element, repoName);
          await run("triggers", element, repoName);
        }
        if (action) {
          //TO-DO
          await runHidden("creates", element, repoName);
          await run("creates", element, repoName);
        }
      }
    }
    console.log(branch)
    if(branch == "staging"){
      // {
      //   "id": 174957,
      //   "key": "App174957"
      // }
      await replaceRCfile("staging", repoName)
      await pushToZapier(repoName)
    }else if(branch == "master"){
      // {
      //   "id": 175726,
      //   "key": "App175726"
      // }
      await replaceRCfile("production", repoName)
      await pushToZapier(repoName);
    }
  
    //await sendNotification()
    
    res.status(200).json({ res: "Done!" });
  } else {
    res.status(400).json({ res: "request again", payload: value });
  }

  //pushDynamic("https://github.com/connex-clientaccess/${repoName}");
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


const pullRepository = (repository, repoName) => {
  let path = `./${repoName}`;
  //console.log("root folder")
  //shell.exec(`dir .`)
  shell.cd(path); //inside dynamic
  shell.exec(`git init `);
  shell.exec(`git pull https://connex-clientaccess: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@github.com/connex-clientaccess/${repoName}`);
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

const updateVersion = (repoName) => {
  shell.cd(`./${repoName}`);
  shell.exec(`npm version patch --no-git-tag-version`);
};
const updateClient = () =>{
  shell.exec('npm update grindery-nexus-client')
}

const pushToZapier = async (repoName) => {
  console.log("root folder");
  shell.exec("dir .");
  //shell.cd("..")
  console.log("after");
  updateVersion(repoName); //update version before pushing to zapier
  updateClient()
  //STOP GITHUB PUSH 
  shell.exec("git init");
  shell.exec(`git config user.email clientaccess@connex.digital`);
  shell.exec(`git config user.name connex-clientaccess`);
  shell.exec("git add .");
  shell.exec(`git commit -m "some message"`);
  shell.exec(
    `git push https://connex-clientaccess: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@github.com/connex-clientaccess/${repoName}`
  );
  //Until here
  console.log("after update version");
  shell.cd("..");
  if(repoName == "GrinderyGatewayV3"){
    shell.exec(`npm run pushgateway`);
  }else if(repoName == "dynamic-app"){
    shell.exec(`npm run pushdynamic`);
  }
  //shell.exec('npm run pushdynamicLink')
  
};
 
app.listen(PORT, () => {
  //server starts listening for any attempts from a client to connect at port: {port}
  console.log(`Now listening on port ${PORT}`);
});
// app.post("/runPull", async (req, res) => {
//   let repository = "https://connex-clientaccess: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@github.com/connex-clientaccess/${repoName}"
//   let path = `./${repoName}`
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

//   let repository = "https://connex-clientaccess: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@github.com/connex-clientaccess/${repoName}"
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

//         const filePath = `./${repoName}/${type}/${[generatedTrigger]}_hidden.js`
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

//         const filePath = `./${repoName}/${type}/${[generatedTrigger]}.js`
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
