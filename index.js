import express from "express"; //Import the express dependency
import shell from "shelljs"; //for using the shell terminal
import bp from "body-parser";
import fs from "fs"; //write read files
import axios from "axios"; //call endpoint
import util from "util"; //use promises for fs library
import path, { parse } from "path"
import { keyNames, getBranch } from "./src/Utilities.js";
import dotenv from 'dotenv';
dotenv.config();

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
// Convert fs.exists to return a promise
const existFile = util.promisify(fs.exists);

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

async function run(type, cds, repoName, label, description) {
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
      modified = modified.replace(/replaceLabel/g, label);
      modified = modified.replace(/replaceDescription/g, description);
    } else {
      console.log("actions, ",titleCase)
      data = await readFile("actionTemplate.js", "utf8");
      modified = data.replace(/replaceDriver/g, cds);
      modified = modified.replace(/replaceActionTitleCase/g, titleCase);
      modified = modified.replace(/replaceActionCamelCase/g, camelCase);
      modified = modified.replace(/replaceLabelAction/g, label);
      modified = modified.replace(/replaceDescription/g, description);
    }
    
    await writeFile(filePath, modified, "utf8");
    await addToIndex(camelCase, type, repoName);
    if(camelCase == "evmWallet"){
      await importantFile(filePath)
    }
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

const removeFromIndex = async (value, type, repoName) => {
  const FILE_LOCATION = `./${repoName}/index.js`
  
  const readRes = await readFile(FILE_LOCATION, "utf8");
  //console.log(readRes);
  let lines = readRes.split("\n");
  console.log("running remove from index")
  for (let index = 0; index < lines.length; index++) {
      if(lines[index].includes(`const ${value} = require("./${type}/${value}")`)){
          console.log(lines[index])
          delete lines[index];
          const res = await writeFile(
              FILE_LOCATION,
              lines.join("\n"),
              "utf8"
          );
      } 
  };
  console.log("running remove from index 2")
  const readRes2 = await readFile(FILE_LOCATION, "utf8");
  let lines2 = readRes2.split("\n");
  for (let index = 0; index < lines2.length; index++) {
    if(lines2[index].includes(`const ${value}_action = require("./${type}/${value}")`)){
      console.log(lines2[index])
      delete lines2[index];
      const res = await writeFile(
          FILE_LOCATION,
          lines2.join("\n"),
          "utf8"
      );
    }
  }
};

const removeFiles = async(cds, repoName) => {
  try {
    console.log("running remove files")
    const createsPath =  `${repoName}/creates`;
    const triggersPath = `${repoName}/triggers`;
    let camelCase = cds.replace(/-/g, "_")
    
    const createsFiles = [`${camelCase}.js`];
    const triggersFiles = [`${camelCase}.js`] //, `${camelCase}_hidden.js`, `${camelCase}_action_hidden.js`];
    
    for (let index = 0; index < createsFiles.length; index++) {
      const file = createsFiles[index];
      console.log(file)
      const filePath = path.join(createsPath, file);
      const condition = await existFile(filePath)
      if(condition){
        await hiddenFiles(filePath); //deleteFiles(filePath)
      }  
    };
    for (let index = 0; index < triggersFiles.length; index++) {
      const file = triggersFiles[index];
      console.log(file)
      const filePath = path.join(triggersPath, file);
      const condition = await existFile(filePath)
      if(condition){
        await hiddenFiles(filePath); //deleteFiles
      }
    };

    //await removeFromIndex(camelCase, "creates", repoName)
    //await removeFromIndex(camelCase, "triggers", repoName)
  }catch{

  }
}

const addToIndex = async (value, type, repoName) => {
  let counter = 18;
  // Read the contents of the file
  try {
    await removeFromIndex(value, type, repoName)
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

const getLabelDescriptionAccess = async(element, type, branch) =>{
  try {
    //Trigger = 1, Action = 2 @Juan
    const deployToStaging = false; //if access = Beta || access property is undefined
    const filePath = `./grindery-nexus-schema-v2/cds/web3/${element}.json`;
   
    const fileContent = await readFile(filePath, "utf8"); // read the file
    let description = ""
    let access = true
    
    const parseContent = JSON.parse(fileContent);
    if(type == "trigger"){
      if(parseContent.description != undefined && parseContent.description != ""){
        if(parseContent.description.includes("Triggers when") && parseContent.description.includes(".")){
          description = parseContent.description
        }else{
          description = `Triggers when a ${parseContent.name} Blockchain event is initiated.`
        }
      }else{
        description = `Triggers when a ${parseContent.name} Blockchain event is initiated.`
      }
    }else{
      if(parseContent.description != undefined && parseContent.description != ""){
        if(parseContent.description.includes("Triggers when") && parseContent.description.includes(".")){
          description = `Configure actions using ${parseContent.name} directly in Zapier.`
        }else{
          description = `Configure actions using ${parseContent.name} directly in Zapier.`
        }
      }else{
        description = `Configure actions using ${parseContent.name} directly in Zapier.`
      }
    }
    if(parseContent.access != undefined && parseContent.access == "Public"){
      access = true
    }
    if(parseContent.access == undefined || parseContent.access == "Beta"){
      deployToStaging = true;
    }

    const data = {
      name: parseContent.name,
      description: description,
      access: access,
      deployToStaging: deployToStaging
    }

    console.log(data)
    return data
  }catch(error){
    console.log("get label", error)
  }
}

const getVersion = async(repoName) => {
  const data = await readFile(`./${repoName}/package.json`, 'utf8')
  
  const packageJson = JSON.parse(data);
 
  return packageJson.version
}

const hiddenFiles = async(filePath) => {
  console.log("running hidden from index")
  const FILE_LOCATION = filePath // `./${repoName}/${type}/${cds}.js`
  const data = await readFile(FILE_LOCATION, 'utf8')
  
  //console.log(readRes);
  let lines = data.split("\n");
  for (let index = 0; index < lines.length; index++) {
      if(lines[index].includes(`display: {`)){
          lines.splice(index + 2, 0, `    hidden: true,`);
          
          console.log(lines[index + 1])
         
          const res = await writeFile(
              FILE_LOCATION,
              lines.join("\n"),
              "utf8"
          );
      } 
  }; 
}

const importantFile = async(filePath) => {
  console.log("running important file from index")
  const FILE_LOCATION = filePath // `./${repoName}/${type}/${cds}.js`
  const data = await readFile(FILE_LOCATION, 'utf8')
  
  //console.log(readRes);
  let lines = data.split("\n");

  for (let index = 0; index < lines.length; index++) {
      if(lines[index].includes(`display: {`)){
          lines.splice(index + 2, 0, `    important: true,`);
          
          console.log(lines[index + 1])
         
          const res = await writeFile(
              FILE_LOCATION,
              lines.join("\n"),
              "utf8"
          );
      } 
  }; 
}

async function runPayload(value){
  //format key name files
  let added = ""
  let removed = ""
  let modified = ""
  if(value.commits[0].added != undefined){
    added = keyNames(value.commits[0].added); //get key names'
  }
  if(value.commits[0].removed != undefined){
    removed = keyNames(value.commits[0].removed);
  }
  if(value.commits[0].modified != undefined){
    modified = keyNames(value.commits[0].modified);
  }
  added = added.concat(modified)
  console.log(added)
  //const removed = keyNames(value.commits[0].removed);
  const branch = getBranch(value.ref); //get branch
  console.log(branch)
  let repoName = ""
  let staging_repoName = ""

  //remove conditionals & repo
  /*if(branch == "staging"){
    //repository = "https://connex-clientaccess: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@github.com/connex-clientaccess/${repoName}"
    repoName = `${process.env.staging_name}` //config_var
    pullRepository(
      `${process.env.account_repo}${repoName}`,
      repoName
    );//config_var account_repo

  }else */
  if(branch == "master"){
      //Pull repositories
    pullSchema(
      "https://connex-clientaccess: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@github.com/grindery-io/grindery-nexus-schema-v2",
      "master"
    );
    //move items here
    const infoAction = {};
    if (added != undefined || removed != undefined || modified != undefined) {
      //const added= ["erc20", "erc721", "gnosisSafe"]
  
      // const removed = keyNames(value.commits[0].removed);
      // console.log(removed);
      let master_counter = 0;
      let staging_counter = 0;
      
      //removed limitation - if no branches
      if(removed != undefined){
        for (let index = 0; index < removed.length; index++) {
          const element = removed[index];
          await removeFiles(element, repoName)
          master_counter++
        }
      }

      if(added != undefined){

        repoName = `${process.env.production_name}` //config_var
        pullRepository(
          `${process.env.account_repo}${repoName}`,
          repoName
        );//config_var account_repo

        staging_repoName = `${process.env.staging_name}` //config_var
        pullRepository(
          `${process.env.account_repo}${staging_repoName}`,
          staging_repoName
        );//config_var account_repo
        
        for (let index = 0; index < added.length; index++) {
          const element = added[index];
          const trigger = await checkIftriggerOrAction(element, 1);
          const action = await checkIftriggerOrAction(element, 2);
          const infoTrigger = await getLabelDescriptionAccess(element, "trigger", branch)
          const infoAction = await getLabelDescriptionAccess(element, "action", branch)
          if (trigger) {
            if(infoTrigger.access == true){

              await runHidden("triggers", element, repoName);
              await run("triggers", element, repoName, infoTrigger.name, infoTrigger.description);
              master_counter++
            }
            if(infoTrigger.access == false && infoTrigger.deployToStaging == true){

              await runHidden("triggers", element, staging_repoName);
              await run("triggers", element, staging_repoName, infoTrigger.name, infoTrigger.description);
              staging_counter++
            }
          }
          if (action) {
            if(infoAction.access == true){
            //TO-DO
            await runHidden("creates", element, repoName);
            await run("creates", element, repoName, infoAction.name, infoAction.description);
            master_counter++
            }
            if(infoAction.access == false && infoAction.deployToStaging == true){
              await runHidden("creates", element, staging_repoName);
              await run("creates", element, staging_repoName, infoAction.name, infoAction.description);
              staging_counter++
            }
          }
        }
      }
      console.log(staging_counter, master_counter)
      // if(staging_counter > 0){

      //   await replaceRCfile("staging", staging_repoName)
      //   await pushToZapier(staging_repoName)

      // }else if(master_counter > 0){

      //   await replaceRCfile("production", repoName)
      //   await pushToZapier(repoName);

      //   const version = await getVersion(repoName)
      //   await sendNotification(version, branch, added, removed)

      // }
    }
  }
}

app.post("/githubUpdate", async (req, res) => {
  //const value = JSON.parse(req.body.payload); //PRODUCTION
  const value = req.body; //TESTING POSTMAN

  runPayload(value);
  res.status(200).json({ res: "Payload Received successfully. Processing..." });
});


async function sendNotification(version, branch, added, removed) {
  try {
    const data = {
      version, branch, added, removed
    }
    const response = await axios.post(
      "https://hooks.zapier.com/hooks/catch/92278/bjtiv8m/",
      data
    );
    console.log(response.data);
  } catch (error) {
    console.error(error);
  }
}


const pullRepository = (branch, repoName) => {
  let path = `./${repoName}`;
  //console.log("root folder")
  //shell.exec(`dir .`)
  shell.cd(path); //inside dynamic
  shell.exec(`git init `);
  shell.exec(`git pull ${process.env.account_repo}${repoName} master`);
  //console.log(path)
  shell.exec(`npm i`);
  console.log(`${process.env.account_repo}${repoName}`)
  shell.exec(`dir .`)

  shell.cd(".."); //back to index
  //console.log("back to root folder")
  //shell.exec(`dir .`)
};

const pullSchema = (repository, branch) => {
  shell.cd("./grindery-nexus-schema-v2");
  shell.exec("git init");
  
  shell.exec(`git pull ${repository}`);
  shell.exec(`git switch ${branch}`)
  shell.cd("..");
};

const updateVersion = (repoName) => {
  shell.cd(`./${repoName}`);
  shell.exec(`npm version patch --no-git-tag-version`);
};
const updateClient = () =>{
  shell.exec('npm update grindery-nexus-client')
  shell.exec('npm view grindery-nexus-client version')
}

const pushToZapier = async (repoName) => {
  console.log("root folder");
  shell.exec("dir .");
  const lastversion = await getVersion(repoName)
  let version = lastversion.replace(/(\d+)\.(\d+)\.(\d+)/, function(match, p1, p2, p3) {
    p3 = parseInt(p3) + 1;
    return p1 + '.' + p2 + '.' + p3;
  });
  //shell.cd("..")
  console.log("after");
  updateVersion(repoName); //update version before pushing to zapier
  updateClient()
  //STOP GITHUB PUSH 
  shell.exec("git init");
  shell.exec(`git config user.email ${process.env.gitHub_email}`); //config_var
  shell.exec(`git config user.name ${process.env.gitHub_username}`); //config_var
  shell.exec("git add .");
  shell.exec(`git commit -m "some message"`);
  shell.exec(
    `git push ${process.env.account_repo}${repoName}`
  );
  //Until here
  console.log("after update version");
  shell.cd("..");
  if(repoName == `${process.env.production_name}`){ //config_var
    shell.cd(`./${process.env.production_name}`);
    shell.exec(`zapier push`); 
    shell.exec(`zapier promote ${version} -y`); 
    shell.exec(`zapier migrate ${version} ${lastversion}`); 
    
  }else if(repoName == `${process.env.staging_name}`){ //config_var
    process.env.version = await getVersion(repoName)
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
