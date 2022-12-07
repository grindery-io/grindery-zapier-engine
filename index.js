const express = require('express'); //Import the express dependency
const app = express();              //Instantiate an express app, the main work horse of this server
const port = 5000;                  //Save the port number where your server will be listening
const shell = require('shelljs')    //for using the shell terminal

//Idiomatic expression in express to route and respond to a client request
app.get('/', (req, res) => {        //get requests to the root ("/") will route here
    res.sendFile('index.html', {root: __dirname});      //server responds by sending the index.html file to the client's browser
                                                        //the .sendFile method needs the absolute path to the file, see: https://expressjs.com/en/4x/api.html#res.sendFile 
});


app.post("/push", async(req, res)=>{
    const repository = req.query.repository
    let path = `../GrinderyPublic`
    shell.cd(path)
    shell.exec(`git clone ${repository}`)
    
    path = `./connex-grindery`
    shell.cd(path)
    console.log(path)
    shell.exec(`npm i`)
    shell.exec(`zapier push`)
    path = `../../`
    shell.cd(path)
    shell.rm('-rf', "C:/Users/juanm/Documents/ConnexDigital/GrinderyPublic/connex-grindery");
    res.sendFile('index.html', {root: __dirname}); 
})
app.post("/pushpokeapi", async(req, res)=>{
    const repository = req.query.repository
    let path = `../GrinderyPublic`
    shell.cd(path)
    shell.exec(`git clone ${repository}`)
    
    path = `./poke-api`
    
    shell.cd(path)
    console.log(path)
    shell.exec(`npm i`)
    shell.exec(`zapier push`)
    path = `../../`
    shell.cd(path)
    shell.rm('-rf', "C:/Users/juanm/Documents/ConnexDigital/GrinderyPublic/poke-api");
    res.sendFile('index.html', {root: __dirname}); 
})

app.listen(port, () => {            //server starts listening for any attempts from a client to connect at port: {port}
    console.log(`Now listening on port ${port}`); 
});