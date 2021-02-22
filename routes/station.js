var express = require("express");
var router = express.Router();
var db = require("../dbconfig");
var ObjectId = require("mongodb").ObjectID;
var async = require("async");
var httpUtil = require("../utilities/http-messages");

router.get("/", function (req, res, next) {
  db.get()
    .collection("station")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      res.send(httpUtil.success(200, "", result));
    });
});

router.post("/", async function (req, res, next) {
  const stationName = req.body.stationName ? req.body.stationName : "";
  const stationId = req.body.stationId ? req.body.stationId : "";
  const stationState = req.body.stationState ? req.body.stationState : "";
  const stationCity = req.body.stationCity ? req.body.stationCity : "";
  const stationArea = req.body.stationArea ? req.body.stationArea : "";
  if (stationId) {
    async.waterfall(
      [
        function (callback) {
          let data = {
            stationName: stationName,
            stationId: stationId,
            stationState: stationState,
            stationCity: stationCity,
            stationArea: stationArea,
            connectors: [],
            createdAt: Date.now(),
            updatedAt: null,
            status: true,
          };
          db.get()
            .collection("station")
            .find({ stationId: stationId })
            .toArray(function (err, dbresult) {
              if (err) callback(err);
              if (dbresult.length) {
                res
                  .status(500)
                  .send(httpUtil.error(500, "Station creation error."));
              } else {
                callback(null, data);
              }
            });
        },
        function (result, callback) {
          db.get()
            .collection("station")
            .insertOne(result, function (err, dbresult) {
              if (err) callback(err);
              callback(null, result);
            });
        },
      ],
      function (err, result) {
        if (err) {
          res.status(500).send(httpUtil.error(500, "Station creation error."));
        } else {
          res.send(httpUtil.success(200, "Station created.", result));
        }
      }
    );
  } else {
    res.status(500).send(httpUtil.error(500, "Station ID is missing."));
  }
});

router.put("/", function (req, res, next) {
  const station_id = req.body.station_id ? ObjectId(req.body.station_id) : "";
  const stationName = req.body.stationName ? req.body.stationName : "";
  const stationId = req.body.stationId ? req.body.stationId : "";
  const stationState = req.body.stationState ? req.body.stationState : "";
  const stationCity = req.body.stationCity ? req.body.stationCity : "";
  const stationArea = req.body.stationArea ? req.body.stationArea : "";
  if (station_id) {
    let Id = { _id: station_id };
    let data = {
      $set: {
        stationName: stationName,
        stationId: stationId,
        stationState: stationState,
        stationCity: stationCity,
        stationArea: stationArea,
        updatedAt: Date.now(),
      },
    };
    async.waterfall(
      [
        function (callback) {
          db.get()
            .collection("station")
            .find({ stationId: stationId })
            .toArray(function (err, dbresult) {
              if (err) callback(err);
              if (dbresult.length) {
                res
                  .status(500)
                  .send(httpUtil.error(500, "Station updating error."));
              } else {
                callback(null, data);
              }
            });
        },
        function (result, callback) {
          db.get()
            .collection("station")
            .updateOne(Id, data, function (err, result) {
              if (err) callback(err);
              callback(null, result);
            });
        },
      ],
      function (err, result) {
        if (err) {
          res.status(500).send(httpUtil.error(500, "Station updating error."));
        } else {
          res.send(httpUtil.success(200, "Station updated.", ""));
        }
      }
    );
  } else {
    res.status(500).send(httpUtil.error(500, "Station ID is missing."));
  }
});

router.put("/status", function (req, res, next) {
  const station_id = req.body.station_id ? ObjectId(req.body.station_id) : "";
  const status = req.body.status ? req.body.status : false;
  if (station_id) {
    let Id = { _id: station_id };
    let data = {
      $set: {
        status: status,
        updatedAt: Date.now(),
      },
    };
    db.get()
      .collection("station")
      .updateOne(Id, data, function (err, result) {
        if (err) {
          res.status(500).send(httpUtil.error(500, "Station updating error."));
        }
        res.send(httpUtil.success(200, "Station updated.", ""));
      });
  } else {
    res.status(500).send(httpUtil.error(500, "Station ID is missing."));
  }
});

router.delete("/", function (req, res, next) {
  const id = req.query.id ? ObjectId(req.query.id) : "";
  if (id) {
    let Id = { _id: id };
    async.waterfall(
      [
        function (callback) {
          db.get()
            .collection("station")
            .deleteOne(Id, function (err, result) {
              if (err) callback(err);
              callback(null, result);
            });
        },
      ],
      function (err, result) {
        if (err) {
          res.status(500).send(httpUtil.error(500, "Station deletion error."));
        } else {
          res.send(httpUtil.success(200, "Station deleted.", ""));
        }
      }
    );
  } else {
    res.status(500).send(httpUtil.error(500, "Station ID is missing."));
  }
});

module.exports = router;
