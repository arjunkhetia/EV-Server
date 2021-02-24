var express = require("express");
var router = express.Router();
var db = require("../dbconfig");
var ObjectId = require("mongodb").ObjectID;
var readXlsxFile = require("read-excel-file/node");
var multer = require("multer");
var path = require("path");
var fs = require("fs");
var async = require("async");
var httpUtil = require("../utilities/http-messages");

var uploadDirectory = path.join(__dirname, "../uploads");
fs.existsSync(uploadDirectory) || fs.mkdirSync(uploadDirectory);

const schema = {
  Location: {
    prop: "location",
    type: String,
  },
  StationId: {
    prop: "stationId",
    type: String,
  },
  StationState: {
    prop: "stationState",
    type: String,
  },
  StationCity: {
    prop: "stationCity",
    type: String,
  },
  StationArea: {
    prop: "stationArea",
    type: String,
  },
  ConnectorID: {
    prop: "connectorID",
    type: String,
  },
  ConnectorTitle: {
    prop: "connectorTitle",
    type: String,
  },
  ConnectorPIN: {
    prop: "connectorPinNumber",
    type: String,
  },
};

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

var upload = multer({ storage: storage });

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

router.post("/", upload.any("file"), function (req, res, next) {
  const file = req.files ? req.files[0] : [];
  const filePath = path.join(__dirname, "../uploads/" + file.originalname);
  if (file) {
    readXlsxFile(filePath, { schema }).then(async ({ rows, errors }) => {
      await asyncForEach(rows, async (row, index) => {
        async.waterfall(
          [
            function (callback) {
              db.get()
                .collection("station")
                .find({ stationId: row.stationId })
                .toArray(function (err, dbresult) {
                  if (err) callback(err);
                  if (dbresult.length) {
                    callback(null, dbresult);
                  } else {
                    callback(null, "No Station");
                  }
                });
            },
            function (result, callback) {
              if (result === "No Station") {
                db.get()
                  .collection("station")
                  .insertOne(
                    {
                      stationName: row.location ? row.location : "",
                      stationId: row.stationId ? row.stationId : "",
                      stationState: row.stationState ? row.stationState : "",
                      stationCity: row.stationCity ? row.stationCity : "",
                      stationArea: row.stationArea ? row.stationArea : "",
                      connectors: [],
                      createdAt: Date.now(),
                      updatedAt: null,
                      status: true,
                    },
                    function (err, dbresult) {
                      if (err) callback(err);
                      callback(null, { station_id: dbresult.insertedId });
                    }
                  );
              } else {
                db.get()
                  .collection("station")
                  .updateOne(
                    { _id: result[0]._id },
                    {
                      $set: {
                        stationName: row.location ? row.location : "",
                        stationId: row.stationId ? row.stationId : "",
                        stationState: row.stationState ? row.stationState : "",
                        stationCity: row.stationCity ? row.stationCity : "",
                        stationArea: row.stationArea ? row.stationArea : "",
                        updatedAt: Date.now(),
                      },
                    },
                    function (err, dbresult) {
                      if (err) callback(err);
                      callback(null, { station_id: result[0]._id });
                    }
                  );
              }
            },
            function (result, callback) {
              if (row.connectorID) {
                db.get()
                  .collection("connector")
                  .find({ connectorID: row.connectorID })
                  .toArray(function (err, dbresult) {
                    if (err) callback(err);
                    if (dbresult.length) {
                      callback(null, {
                        station_id: result.station_id,
                        connector_id: dbresult._id,
                      });
                    } else {
                      callback(null, {
                        station_id: result.station_id,
                        connector: "No Connector",
                      });
                    }
                  });
              } else {
                callback(null, "No Connector Found");
              }
            },
            function (result, callback) {
              if (result === "No Connector Found") {
                callback(null, "No Connector Found");
              } else {
                if (result.connector === "No Connector") {
                  db.get()
                    .collection("connector")
                    .insertOne(
                      { connectorID: row.connectorID },
                      function (err, dbresult) {
                        if (err) callback(err);
                        db.get()
                          .collection("station")
                          .find({ _id: ObjectId(result.station_id) })
                          .toArray(async function (err, stationdbresult) {
                            if (err) callback(err);
                            await stationdbresult[0].connectors.push({
                              id: dbresult.insertedId,
                              connectorID: row.connectorID
                                ? row.connectorID
                                : "",
                              connectorPinNumber: row.connectorPinNumber
                                ? row.connectorPinNumber
                                : "",
                              connectorTitle: row.connectorTitle
                                ? row.connectorTitle
                                : "",
                              createdAt: Date.now(),
                              updatedAt: null,
                              status: true,
                            });
                            await db.get()
                              .collection("station")
                              .updateOne(
                                { _id: ObjectId(result.station_id) },
                                {
                                  $set: {
                                    connectors: stationdbresult[0].connectors,
                                  },
                                },
                                function (err, upresult) {
                                  if (err) callback(err);
                                  callback(null, upresult);
                                }
                              );
                          });
                      }
                    );
                } else {
                  db.get()
                    .collection("station")
                    .find({ _id: ObjectId(result.station_id) })
                    .toArray(function (err, stationdbresult) {
                      if (err) callback(err);
                      stationdbresult[0].connectors.forEach((connector) => {
                        if (connector.id === result.connector_id) {
                          connector.connectorID = row.connectorID
                            ? row.connectorID
                            : "";
                          connector.connectorPinNumber = row.connectorPinNumber
                            ? row.connectorPinNumber
                            : "";
                          connector.connectorTitle = row.connectorTitle
                            ? row.connectorTitle
                            : "";
                          connector.updatedAt = Date.now();
                          db.get()
                            .collection("station")
                            .updateOne(
                              { _id: ObjectId(result.station_id) },
                              {
                                $set: {
                                  connectors: stationdbresult[0].connectors,
                                },
                              },
                              function (err, upresult) {
                                if (err) callback(err);
                                callback(null, upresult);
                              }
                            );
                        }
                      });
                    });
                }
              }
            },
            // function (result, callback) {
            //   console.log(result);
            // },
          ],
          function (err, result) {
            if (err) {
              console.log("Got Error In Row: ", row);
            } else {
              console.log("Row Processed Successfully");
            }
          }
        );
        if (rows.length - 1 === index) {
          res.send(
            httpUtil.success(
              200,
              "Station created.",
              "File Uploaded Successfully."
            )
          );
        }
      });
    });
  } else {
    res.status(500).send(httpUtil.error(500, "File is missing."));
  }
});

module.exports = router;
