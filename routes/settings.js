var express = require("express");
var router = express.Router();
var db = require("../dbconfig");
var ObjectId = require("mongodb").ObjectID;
var async = require("async");
var httpUtil = require("../utilities/http-messages");

router.get("/", function (req, res, next) {
  db.get()
    .collection("settings")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      res.send(httpUtil.success(200, "", result));
    });
});

router.post("/", function (req, res, next) {
  const id = req.body.id ? ObjectId(req.body.id) : "";
  let data = {
    $set: {
      authAmount: req.body.authAmount ? req.body.authAmount : "",
      adminEmail: req.body.adminEmail ? req.body.adminEmail : "",
      kwh: req.body.kwh ? req.body.kwh : "",
      min: req.body.min ? req.body.min : "",
      updatedAt: Date.now(),
    },
  };
  db.get()
    .collection("settings")
    .updateOne({ _id: id }, data, function (err, dbresult) {
      if (err) callback(err);
      res.send(httpUtil.success(200, "", dbresult));
    });
});

module.exports = router;
