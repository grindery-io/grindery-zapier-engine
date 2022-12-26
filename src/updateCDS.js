import shell from "shelljs"  //for using the shell terminal

export const updateCDS = async () => {
    try {
        const repository = "https://github.com/grindery-io/grindery-nexus-schema-v2/blob/master/cds/web3"
    
        let path = `./cds`
        shell.cd(path)
        shell.exec(`git init`)
        shell.exec(`git pull ${repository}`)
        return "Updated"
    } catch (error) {
        return error
    }  
}
