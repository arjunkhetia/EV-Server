var express = require("express");
var router = express.Router();
var db = require("../dbconfig");
var ObjectId = require("mongodb").ObjectID;
var async = require("async");
var httpUtil = require("../utilities/http-messages");

router.post("/", function (req, res, next) {
  let id = req.query.id ? req.query.id : "";
  let data = req.body
    ? {
        createdAt: Date.now(),
        data: req.body,
      }
    : "";
  async.waterfall(
    [
      function (callback) {
        db.get()
          .listCollections({ name: id })
          .toArray(function (err, result) {
            if (result.length === 1) {
              callback(null, result);
            } else {
              db.get().createCollection(id, function (err, result) {
                if (err) callback(err);
                callback(null, result);
              });
            }
          });
      },
      function (result, callback) {
        db.get()
          .collection(id)
          .insertOne(data, function (err, result) {
            if (err) callback(err);
            callback(null, result);
          });
      },
    ],
    function (err, result) {
      if (err) {
        res.status(500).send(httpUtil.error(500, "Session creation error."));
      } else {
        res.send(httpUtil.success(200, "Session created.", ""));
      }
    }
  );
});

module.exports = router;
