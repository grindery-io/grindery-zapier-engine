
import fs from "fs"; //write read files
import util from "util"; //use promises for fs library
import path, { parse } from "path"
import dotenv from 'dotenv';

dotenv.config();

// Convert fs.exists to return a promise
const readdir = util.promisify(fs.readdir);

export const pullAllFiles = async() => {
    const filePath = `./grindery-nexus-schema-v2/cds/web3`
    const createsFiles = await readdir(filePath)
    console.log(createsFiles)
    const filterArray = []
    for (let index = 0; index < createsFiles.length; index++) {
      const file = createsFiles[index].split(".")[0];
      filterArray.push(file)

      // if(condition){
      //   await hiddenFiles(filePath); //deleteFiles(filePath)
      // }  
    };
    return(filterArray)
}