import shell from "shelljs"  //for using the shell terminal

export const updateCDS = async () => {
    try {
        const repository = "https://github.com/grindery-io/grindery-nexus-schema-v2"
        let path = `./grindery-nexus-schema-v2`
        shell.cd(path)
        shell.exec(`git init`)
        shell.exec(`git pull`)
        readJSON()
        return "Updated"
    } catch (error) {
        return error
    }  
}