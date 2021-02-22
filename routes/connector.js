var express = require("express");
var router = express.Router();
var db = require("../dbconfig");
var ObjectId = require("mongodb").ObjectID;
var async = require("async");
var httpUtil = require("../utilities/http-messages");

router.get("/", function (req, res, next) {
  db.get()
    .collection("connector")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      res.send(httpUtil.success(200, "", result));
    });
});

router.post("/", async function (req, res, next) {
  const connectorID = req.body.connectorID ? req.body.connectorID : "";
  const connectorPinNumber = req.body.connectorPinNumber
    ? req.body.connectorPinNumber
    : "";
  const connectorTitle = req.body.connectorTitle ? req.body.connectorTitle : "";
  const station = req.body.station ? req.body.station : "";
  if (connectorID) {
    async.waterfall(
      [
        function (callback) {
          let data = {
            id: null,
            connectorID: connectorID,
            connectorPinNumber: connectorPinNumber,
            connectorTitle: connectorTitle,
            createdAt: Date.now(),
            updatedAt: null,
            status: true,
          };
          db.get()
            .collection("connector")
            .find({ connectorID: connectorID })
            .toArray(function (err, dbresult) {
              if (err) callback(err);
              if (dbresult.length) {
                res
                  .status(500)
                  .send(httpUtil.error(500, "Connector creation error."));
              } else {
                callback(null, data);
              }
            });
        },
        function (result, callback) {
          db.get()
            .collection("connector")
            .insertOne({ connectorID: connectorID }, function (err, dbresult) {
              if (err) callback(err);
              result["id"] = dbresult.insertedId;
              callback(null, result);
            });
        },
        function (result, callback) {
          station.connectors.push(result);
          let stationId = { _id: ObjectId(station._id) };
          let stationData = {
            $set: {
              connectors: station.connectors,
            },
          };
          db.get()
            .collection("station")
            .updateOne(stationId, stationData, function (err, result) {
              if (err) callback(err);
              callback(null, result);
            });
        },
      ],
      function (err, result) {
        if (err) {
          res
            .status(500)
            .send(httpUtil.error(500, "Connector creation error."));
        } else {
          res.send(httpUtil.success(200, "Connector created.", result));
        }
      }
    );
  } else {
    res.status(500).send(httpUtil.error(500, "Connector ID is missing."));
  }
});

router.put("/", function (req, res, next) {
  const station = req.body.station ? req.body.station : "";
  const station_id = req.body.station._id ? ObjectId(req.body.station._id) : "";
  const connector_id = req.body.connector_id
    ? ObjectId(req.body.connector_id)
    : "";
  const connectorID = req.body.connectorID ? req.body.connectorID : "";
  const connectorPinNumber = req.body.connectorPinNumber
    ? req.body.connectorPinNumber
    : "";
  const connectorTitle = req.body.connectorTitle ? req.body.connectorTitle : "";
  if (station_id && connector_id) {
    async.waterfall(
      [
        function (callback) {
          db.get()
            .collection("connector")
            .find({ connectorID: connectorID })
            .toArray(function (err, dbresult) {
              if (err) callback(err);
              if (dbresult.length) {
                res
                  .status(500)
                  .send(httpUtil.error(500, "Connector creation error."));
              } else {
                callback(null, dbresult);
              }
            });
        },
        function (result, callback) {
          let connectorData = {
            $set: {
              connectorID: connectorID,
            },
          };
          db.get()
            .collection("connector")
            .updateOne(
              { _id: connector_id },
              connectorData,
              function (err, result) {
                if (err) callback(err);
                callback(null, result);
              }
            );
        },
        function (result, callback) {
          station.connectors.forEach((connector) => {
            if (connector.id === req.body.connector_id) {
              connector.connectorID = connectorID;
              connector.connectorPinNumber = connectorPinNumber;
              connector.connectorTitle = connectorTitle;
              connector.updatedAt = Date.now();
              callback(null, station);
            }
          });
        },
        function (result, callback) {
          let stationId = { _id: station_id };
          let stationData = {
            $set: {
              connectors: result.connectors,
            },
          };
          db.get()
            .collection("station")
            .updateOne(stationId, stationData, function (err, result) {
              if (err) callback(err);
              callback(null, result);
            });
        },
      ],
      function (err, result) {
        if (err) {
          res
            .status(500)
            .send(httpUtil.error(500, "Connector updating error."));
        } else {
          res.send(httpUtil.success(200, "Connector updated.", ""));
        }
      }
    );
  } else {
    res
      .status(500)
      .send(httpUtil.error(500, "Station ID or Connector ID is missing."));
  }
});

router.put("/status", function (req, res, next) {
  const station_id = req.body.station_id ? ObjectId(req.body.station_id) : "";
  const connector_id = req.body.connector_id
    ? ObjectId(req.body.connector_id)
    : "";
  const status = req.body.status ? req.body.status : false;
  if (station_id && connector_id) {
    async.waterfall(
      [
        function (callback) {
          db.get()
            .collection("station")
            .find({ _id: station_id })
            .toArray(function (err, dbresult) {
              if (err) callback(err);
              callback(null, dbresult[0]);
            });
        },
        function (result, callback) {
          result.connectors.forEach((connector) => {
            if (connector.id === req.body.connector_id) {
              (connector.status = status), (connector.updatedAt = Date.now());
              callback(null, result);
            }
          });
        },
        function (result, callback) {
          let stationId = { _id: station_id };
          let stationData = {
            $set: {
              connectors: result.connectors,
            },
          };
          db.get()
            .collection("station")
            .updateOne(stationId, stationData, function (err, result) {
              if (err) callback(err);
              callback(null, result);
            });
        },
      ],
      function (err, result) {
        if (err) {
          res
            .status(500)
            .send(httpUtil.error(500, "Connector updating error."));
        } else {
          res.send(httpUtil.success(200, "Connector updated.", ""));
        }
      }
    );
  } else {
    res
      .status(500)
      .send(httpUtil.error(500, "Station ID or Connector ID is missing."));
  }
});

router.delete("/", function (req, res, next) {
  const stationId = req.query.stationId ? ObjectId(req.query.stationId) : "";
  const connectorId = req.query.connectorId
    ? ObjectId(req.query.connectorId)
    : "";
  if (stationId && connectorId) {
    let sId = { _id: stationId };
    let cId = { _id: connectorId };
    async.waterfall(
      [
        function (callback) {
          db.get()
            .collection("connector")
            .deleteOne(cId, function (err, result) {
              if (err) callback(err);
              callback(null, result);
            });
        },
        function (result, callback) {
          db.get()
            .collection("station")
            .find(sId)
            .toArray(function (err, result) {
              if (err) callback(err);
              let connectors = result[0].connectors;
              console.log(connectorId);
              for (let index = 0; index < connectors.length; index++) {
                if (connectors[index].id === req.query.connectorId) {
                  connectors.splice(index, 1);
                  callback(null, connectors);
                  break;
                }
              }
            });
        },
        function (result, callback) {
          let data = {
            $set: {
              connectors: result,
            },
          };
          db.get()
            .collection("station")
            .updateOne(sId, data, function (err, result) {
              if (err) callback(err);
              callback(null, result);
            });
        },
      ],
      function (err, result) {
        if (err) {
          res
            .status(500)
            .send(httpUtil.error(500, "Connector deletion error."));
        } else {
          res.send(httpUtil.success(200, "Connector deleted.", ""));
        }
      }
    );
  } else {
    res
      .status(500)
      .send(httpUtil.error(500, "Station ID or Connector Id is missing."));
  }
});

module.exports = router;
