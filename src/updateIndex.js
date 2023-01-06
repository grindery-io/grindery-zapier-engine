import fs from "fs";
import shell from "shelljs"; //for using the shell terminal

let counter = 18;

export const addToIndex = (value, type) => {
  // Read the contents of the file
  try {
    const readRes = fs.readFile("./dynamic-app/index.js", "utf8", (err, data) => {
      if (err) {
        throw err;
      }
  
      const lines = data.split("\n");
  
      const added =
        `const ` + value + ` = require("./${type}/` + value + `_hidden")`;
      lines.splice(counter, 0, added); // Insert the new line at the specified index
      console.log(lines[counter])
      // Join the lines back together and write the modified contents back to the file
      const res = fs.writeFile("./dynamic-app/index.js", lines.join("\n"), "utf8", (err) => {
        if (err) {
          throw err;
        }
      });
      return res;
    });
    return readRes
    
  } catch (error) {
    console.log(error)
  }
  
};


export const checkTriggerAction = () => {
  //pull new cds

  fs.readFile("index.js", "utf8", (err, data) => {
    if (err) {
      throw err;
    }
  });
};

export const keyNames =(value) =>{
  let output = []
  console.log(Array.isArray(value))
  if(Array.isArray(value)){
      for(var i = 0; i <= value.length - 1; i++){
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

