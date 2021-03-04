var MongoClient = require('mongodb').MongoClient;

// var URI = "mongodb://localhost:27017";
var URI = "mongodb+srv://arjunkhetia:Arjun@1990@emancitech.m10zy.mongodb.net/ev?retryWrites=true&w=majority";

var connection = null;

var option = {
  keepAlive: true,
  poolSize : 10,
  connectTimeoutMS: 5000,
  useNewUrlParser: true,
  useUnifiedTopology: true
};

var MongoDBClient = new MongoClient(URI, option);

module.exports.connect = () => new Promise((resolve, reject) => {
    MongoDBClient.connect(function(err, client) {
        if (err) { reject(err); return; };
        var db = client.db('ev');
        resolve(db);
        connection = db;
    });
});

module.exports.get = () => {
    if(!connection) {
        throw new Error('Call Connect First...');
    }
    return connection;
}

module.exports.close = () => {
    if(!connection) {
        throw new Error('Call Connect First...');
    }
    MongoDBClient.close();
}
