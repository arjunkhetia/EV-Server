var express = require("express");
var router = express.Router();
var db = require("../dbconfig");
var ObjectId = require("mongodb").ObjectID;
var async = require("async");
var httpUtil = require("../utilities/http-messages");

router.post("/", function (req, res, next) {
  let data = req.body
    ? {
        createdAt: Date.now(),
        data: req.body,
      }
    : "";
  db.get()
    .collection("evpush")
    .insertOne(data, function (err, result) {
      if (err) {
        res.status(500).send(httpUtil.error(500, "EV-Push creation error."));
      } else {
        res.send(httpUtil.success(200, "EV-Push created.", ""));
      }
    });
});

module.exports = router;
