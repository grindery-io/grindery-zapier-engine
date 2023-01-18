
export const keyNames =(value) =>{
  let output = []
  console.log(value)
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

export const getBranch = (ref)=>{
    console.log(ref)
    const value = ref.split("/")
    console.log(value[value.length - 1])
    return (value[value.length - 1])
}
