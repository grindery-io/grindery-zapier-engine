import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import glob from "glob"
import fs from 'fs'
import e from "express";

const uri = "mongodb+srv://connex_testing:MkLvwusz9i2K7mOT@cluster0.5d0qb9x.mongodb.net/?retryWrites=true&w=majority"//`mongodb+srv://${process.env.mongo_user}:${process.env.mongo_password}@cluster0.5d0qb9x.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

export const mainCRUD = async(object) =>{
    //this is how object should look
    //{ added: ['web3/test5 copy.json'], removed: [ 'web3/test5 copy.json' ], modified: ['web3/test5 copy.json'] }
    if(object.added.length != 0){
        for(var i = 0; i <= object.added.length; i++){
            console.log(object.added[i])
            var output = object.added[i].split("/").pop().split(".")[0];
            crudFunction(output, "added")
        }  
    }
    if(object.removed.length != 0){
        for(var i = 0; i <= object.removed.length; i++){
            console.log(object.removed[i])
            var output = object.removed[i].split("/").pop().split(".")[0];
            crudFunction(output, "removed")
        }  
    }
    if(object.modified.length != 0){
        for(var i = 0; i <= object.modified.length; i++){
            console.log(object.modified[i])
            var output = object.modified[i].split("/").pop().split(".")[0];
            crudFunction(output, "modified")
        }  
    }
}

export const keyNames =(value) =>{
    let output = []
    console.log(Array.isArray(value))
    if(Array.isArray(value)){
        for(var i = 0; i <= value.length; i++){
            console.log(value[i])
            var v = value[i].split("/").pop().split(".")[0];
            output.push(v)
        }  
    }else{
        console.log(value)
        var v = value.split("/").pop().split(".")[0];
        output.push(v)
    }
    
    return output
} 

const crudFunction = async(parseData, type) =>{
    await client.connect()  //connect

    const collection = client
    .db("Cluster0")
    .collection("CDS");

    const search_result_key = await collection.findOne({
        key: parseData,
    });

    console.log(search_result_key)
    if(search_result_key != null && type != "added"){
        // specify the path to the folder containing the files
        //const folderPath = '../grindery-nexus-schema-v2/cds/web3';
        const folderPath = '../test-cds-files/web3';
        // get an array of file paths in the folder
        const filePaths = glob.sync(`${folderPath}/*.json`);

        // loop through the file paths
        filePaths.forEach(async(filePath) => {

            var output = filePath.split("/").pop().split(".")[0];
            if(output == parseData){
                console.log(output)
                const fileContent = fs.readFileSync(filePath, 'utf8');  // read the file

                // do something with the file content
                const parseContent = JSON.parse(fileContent);
                if(type == "removed" || type == "modified"){
                    const delete_signal_result = await collection.deleteOne(
                        { key: parseData }
                    );
                    console.log(delete_signal_result)
                }
                
                if(type == "modified"){
                    const insert_signal_result = await collection.insertOne(parseContent)
                    console.log(insert_signal_result)
                }
            }
            
        })
    }else if(type == "added"){
        const insert_signal_result = await collection.insertOne(parseContent)
        console.log(insert_signal_result)
    }
    
}
