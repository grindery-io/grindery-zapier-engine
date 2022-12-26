const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = "mongodb+srv://connex_testing:MkLvwusz9i2K7mOT@cluster0.5d0qb9x.mongodb.net/?retryWrites=true&w=majority"//`mongodb+srv://${process.env.mongo_user}:${process.env.mongo_password}@cluster0.5d0qb9x.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

export const updateFile = async (parseData) => {
    try {
        await client.connect()  //connect

        const collection = client
        .db("Cluster0")
        .collection("CDS");

        const new_signal_token = {
        $set: parseData,
        };
        //search for one document by token
        search_result_token = await collection.findOne({
            key: parseData.key,
        });
        console.log(search_result_token)
        //update one document by token
        const insert_signal_result = await collection.updateOne(
            { key: parseData.key },
            new_signal_token,
            { upsert: true }
        );
        return "Added"
    } catch (error) {
        return error
    }  
}

export const createFile = async (parseData) => {
    try {
        await client.connect()  //connect

        const collection = client
        .db("Cluster0")
        .collection("CDS");
        
        //update one document by token
        const insert_signal_result = await collection.insertOne(parseData)
        return "Added"
    } catch (error) {
        return error
    }  
}
