const express = require('express'); //Import the express dependency
const app = express();              //Instantiate an express app, the main work horse of this server         
const shell = require('shelljs')    //for using the shell terminal

const {updateFile, createFile} = require("./src/CRUD.js") //crud files
const {updateCDS} = require("./src/updateCDS.js") //updateCDS


const jsondata = require('../erc20.json');
const PORT = process.env.PORT || 5000; //define port

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


app.listen(PORT, () => {            //server starts listening for any attempts from a client to connect at port: {port}
    console.log(`Now listening on port ${port}`); 
});