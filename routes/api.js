var express = require("express");
var router = express.Router();
var db = require("../dbconfig");
var ObjectId = require("mongodb").ObjectID;
var async = require("async");
var httpUtil = require("../utilities/http-messages");
var axios = require("axios");
var qs = require("qs");
var https = require("https");
var nanoid = require("nanoid");

router.get("/station", function (req, res, next) {
  const stationId = req.query.id ? req.query.id : "";
  db.get()
    .collection("station")
    .find({ stationId: stationId })
    .toArray(function (err, result) {
      if (err) throw err;
      res.send(httpUtil.success(200, "", result));
    });
});

router.get("/client", function (req, res, next) {
  var data = qs.stringify({
    grant_type: "client_credentials",
    client_id: "UniversalCharging_API",
    client_secret: "7TPPUNMFF6",
  });
  var config = {
    method: "post",
    url: "https://120.72.88.163:11443/v1/connect/token",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
    data: data,
  };
  axios(config)
    .then(function (response) {
      res.send(httpUtil.success(200, "", response.data));
    })
    .catch(function (error) {
      res.status(500).send(httpUtil.error(500, "Client creation error."));
    });
});

router.post("/user", function (req, res, next) {
  const name = req.body.name ? req.body.name : "";
  const email = req.body.email ? req.body.email : "";
  const mobile = req.body.mobile ? req.body.mobile : "";
  const cardName = req.body.cardName ? req.body.cardName : "";
  const cardNumber = req.body.cardNumber ? req.body.cardNumber : "";
  const cardCvv = req.body.cardCvv ? req.body.cardCvv : "";
  const cardExpMonth = req.body.cardExpMonth ? req.body.cardExpMonth : "";
  const cardExpYear = req.body.cardExpYear ? req.body.cardExpYear : "";
  const refId = nanoid.nanoid(15);
  var data = JSON.stringify({
    createTransactionRequest: {
      merchantAuthentication: {
        name: "37Xbna3d2Fza",
        transactionKey: "88f9A2VUrKmJ3Z5d",
      },
      refId: refId,
      transactionRequest: {
        transactionType: "authCaptureTransaction",
        amount: "10",
        payment: {
          creditCard: {
            cardNumber: cardNumber,
            expirationDate: cardExpYear + "-" + cardExpMonth,
            cardCode: cardCvv,
          },
        },
      },
    },
  });
  var config = {
    method: "POST",
    url: "https://apitest.authorize.net/xml/v1/request.api",
    headers: {
      "Content-Type": "application/json",
    },
    data: data,
  };
  axios(config)
    .then(function (response) {
      let user = {
        name: name,
        email: email,
        mobile: mobile,
        refId: refId,
        authCode: response.data.transactionResponse.authCode,
        transId: response.data.transactionResponse.transId,
        accountNumber: response.data.transactionResponse.accountNumber,
        accountType: response.data.transactionResponse.accountType,
        networkTransId: response.data.transactionResponse.networkTransId,
        createdAt: Date.now(),
        updatedAt: null,
        status: null,
      };
      db.get()
        .collection("users")
        .insertOne(user, function (err, dbresult) {
          if (err) callback(err);
          res.send(httpUtil.success(200, "", dbresult));
        });
    })
    .catch(function (error) {
      console.log(error);
    });
});

module.exports = router;