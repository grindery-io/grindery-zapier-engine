import express from 'express'; //Import the express dependency
import shell from 'shelljs'    //for using the shell terminal

import {updateFile, createFile} from "./src/CRUD.js" //crud files
import {updateCDS} from "./src/updateCDS.js" //updateCDS


//import {jsondata} from './erc20.json' assert { type: "json" };

const PORT = process.env.PORT || 5000; //define port
const app = express();              //Instantiate an express app, the main work horse of this server       
const jsonData = "hello world"
app.get('/updateCDS', (req, res)=>{
    const value = updateCDS(jsondata);
    res.send(value);
})

// endpoint that runs the function and returns its value
app.patch('/updateFile', (req, res) => {
  const value = updateFile(jsondata);
  res.send(value);
});
app.post('/createFile', (req, res) => {
    const value = createFile(jsondata);
    res.send(value);
});

app.post('/githubUpdate', (req, res) => {
    const value = ""
    res.send(value);
});


app.post("/push", async(req, res)=>{
    const repository = req.query.repository
    
    let path = `./GrinderyPublic/connex-grindery`
    shell.cd(path)
    shell.exec(`git init `)
    shell.exec(`git pull ${repository}`)
    console.log(path)
    shell.exec(`npm i`)
    //shell.exec(`zapier login`)
    shell.exec(`zapier push`)
    res.sendFile('index.html', {root: __dirname}); 
})

app.post("/pushpokeapi", async(req, res)=>{
    const repository = req.query.repository
    let path = `./PokeApi/poke-api`
    shell.cd(path)
    shell.exec(`git init `)
    shell.exec(`git pull ${repository}`)
    console.log(path)
    shell.exec(`npm i`)
    //shell.exec(`zapier login`)
    path = `../../`
    shell.cd(path)
    shell.exec(`npm run pushtozapier`)
    res.sendFile('index.html', {root: __dirname}); 
})

app.post('/githubUpdate', (req, res) => {
    console.log(req.body)
    const value = JSON.parse(req.body)
    const added = value.commits.added
    const removed = value.commits.removed
    console.log(removed)
    const modified = value.commits.modified
    console.log(modified)
    res.send(added);
});

app.listen(PORT, () => {            //server starts listening for any attempts from a client to connect at port: {port}
    console.log(`Now listening on port ${PORT}`); 
});