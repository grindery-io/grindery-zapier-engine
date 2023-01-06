import express from "express"; //Import the express dependency
import shell from "shelljs"; //for using the shell terminal
import bp from "body-parser";
import fs from "fs";

import { updateVersion, keyNames } from "./src/updateIndex.js";


//import {jsondata} from './erc20.json' assert { type: "json" };

const PORT = process.env.PORT || 5000; //define port
const app = express(); //Instantiate an express app, the main work horse of this server
app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));


import util from 'util'

// Convert fs.readFile to return a promise
const readFile = util.promisify(fs.readFile);

// Convert fs.writeFile to return a promise
const writeFile = util.promisify(fs.writeFile);

async function runHidden(type, generatedTrigger) {
  try {
    const filePath = `./dynamic-app/${type}/${[generatedTrigger]}_hidden.js`;
    const data = await readFile('triggerHiddenTemplate.js', 'utf8');
    const modified = data.replace(/replaceTrigger/g, generatedTrigger);
    await writeFile(filePath, modified, 'utf8');
  } catch (error) {
    console.log("runHidden ", error);
  }
}

async function run(type, generatedTrigger) {
  try {
    const filePath = `./dynamic-app/${type}/${[generatedTrigger]}.js`;
    const data = await readFile('triggerTemplate.js', 'utf8');
    const modified = data.replace(/replaceTrigger/g, generatedTrigger);
  
    await writeFile(filePath, modified, 'utf8');
    await addToIndex(generatedTrigger, type)
  } catch (error) {
    console.log("run ", error);
  }
}

const addToIndex = async(value, type) => {
  let counter = 23
  // Read the contents of the file
  try {
    const readRes = await readFile("./dynamic-app/index.js", "utf8")
    console.log(readRes)
    const lines = readRes.split("\n");
    const added = `const ` + value + ` = require("./${type}/` + value + `")`;
    lines.splice(counter, 0, added); // Insert the new line at the specified index
    console.log(lines[counter])
    counter = counter - 1
    // Join the lines back together and write the modified contents back to the file
    const res = await writeFile("./dynamic-app/index.js", lines.join("\n"), "utf8")
    return res
    
  } catch (error) {
    console.log("addToIndex ", error)
  }
};

app.post("/githubUpdate", async (req, res) => {
  //parse payload from github webhook
  const value = JSON.parse(req.body.payload);
  //reporsitory = 
  shell.cd(`git clone "https://github.com/connex-clientaccess/dynamic-app"`)
  shell.cd(`git clone "https://github.com/grindery-io/grindery-nexus-schema-v2"`)
  //format key name files
  const added = keyNames(value.commits[0].added);
  if(added != undefined){
    //const added= ["erc20", "erc721", "gnosisSafe"]
    
    // const removed = keyNames(value.commits[0].removed);
    // console.log(removed);
    for (let index = 0; index < added.length; index++) {
      const element = added[index];
      await runHidden("triggers", added[index])
      await run("triggers", added[index])
    }
    
    // push to zapier
    await pushDynamic();
    
    res.status(200).json({"res": "hello"})
  }else{
    res.status(400).json({"res": "request again", "payload": value})
  }
 
  //pushDynamic("https://github.com/connex-clientaccess/dynamic-app");
})


const pushDynamic = async(repository) => {
  //shell.cd(`git clone ${repository}`)
  let path = `./dynamic-app`;
  shell.cd(path);
  //shell.exec(`git init `);
  //shell.exec(`git pull ${repository}`);
  console.log(path);
  shell.exec(`npm i`);
  
  //shell.exec(`zapier login`)
  path = `../`;
  updateVersion(); //update version before pushing to zapier
  shell.test('-d', 'path')  // dir
  shell.cd(path);
  shell.exec(`npm run pushdynamic`);
};



const generateCDSfiles = async(cds) => {
  try {
    //test if trigger
    let trigger_result = checkIftriggerOrAction(cds, 1);
    if (trigger_result) {
      let type = "triggers";
      let generatedTrigger = cds

      await fs.copyFileSync(
        `triggerTemplate.js`,
        `./dynamic-app/${type}/${[generatedTrigger]}.js`
      );

      await fs.copyFileSync(
        `triggerHiddenTemplate.js`,
        `./dynamic-app/${type}/${[generatedTrigger]}_hidden.js`
      );
      await replaceInFile(`./dynamic-app/${type}/${[generatedTrigger]}_hidden.js`, generatedTrigger)
      await replaceInFile(`./dynamic-app/${type}/${[generatedTrigger]}.js`, generatedTrigger)
      console.log("replace in file ", generatedTrigger)
      await addToIndex(generatedTrigger, type);
      console.log("add to index ", generatedTrigger)
      
      
    }
    return 1

    //test if action
  } catch (error) {
    console.log("Error copying or replacing files: ", error);
  }
};
//Example to use console.log(checkIftriggerOrAction("algorand", 1))
const checkIftriggerOrAction = (value, type) => {
  //Trigger = 1, Action = 2 @Juan
  const filePath = `./grindery-nexus-schema-v2/cds/web3/${value}.json`;

  const fileContent = fs.readFileSync(filePath, "utf8"); // read the file

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
};
async function addedFunction(added){
  await added.map(async (cds) => {
    generateCDSfiles(cds);
  })
  return 123
}

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
  

app.listen(PORT, () => {
  //server starts listening for any attempts from a client to connect at port: {port}
  console.log(`Now listening on port ${PORT}`);
});
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
