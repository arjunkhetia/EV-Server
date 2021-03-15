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
var sendMail = require("../utilities/sendMail");

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
    client_secret: "ABD4VDON3C",
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

router.get("/user", function (req, res, next) {
  const uid = req.query.uid ? ObjectId(req.query.uid) : "";
  db.get()
    .collection("users")
    .find({ _id: uid })
    .toArray(function (err, result) {
      if (err) throw err;
      if (result[0]) {
        res.send(httpUtil.success(200, "", result[0]));
      } else {
        res.status(500).send(httpUtil.error(500, "User Data Not Found."));
      }
    });
});

router.post("/user", function (req, res, next) {
  const name = req.body.name ? req.body.name : "";
  const email = req.body.email ? req.body.email : "";
  const mobile = req.body.mobile ? req.body.mobile : "";
  const stationId = req.body.stationId ? req.body.stationId : "";
  const connecctorId = req.body.connecctorId ? req.body.connecctorId : "";
  const cardName = req.body.cardName ? req.body.cardName : "";
  const cardNumber = req.body.cardNumber ? req.body.cardNumber : "";
  const cardCvv = req.body.cardCvv ? req.body.cardCvv : "";
  const cardExpMonth = req.body.cardExpMonth ? req.body.cardExpMonth : "";
  const cardExpYear = req.body.cardExpYear ? req.body.cardExpYear : "";
  const refId = nanoid.nanoid(15);
  let context = {
    name: name,
    stationId: stationId,
    connecctorId: connecctorId,
  };
  db.get()
    .collection("settings")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      var data = JSON.stringify({
        createTransactionRequest: {
          merchantAuthentication: {
            name: "37Xbna3d2Fza",
            transactionKey: "88f9A2VUrKmJ3Z5d",
          },
          refId: refId,
          transactionRequest: {
            transactionType: "authOnlyTransaction",
            amount: result[0].authAmount,
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
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
        }),
        data: data,
      };
      axios(config)
        .then(function (response) {
          let user = {
            name: name,
            email: email,
            mobile: mobile,
            refId: refId,
            stationId: stationId,
            connecctorId: connecctorId,
            authCode: response.data.transactionResponse.authCode,
            transId: response.data.transactionResponse.transId,
            accountNumber: response.data.transactionResponse.accountNumber,
            accountType: response.data.transactionResponse.accountType,
            networkTransId: response.data.transactionResponse.networkTransId,
            createdAt: Date.now(),
            updatedAt: null,
            status: "Authorize",
          };
          db.get()
            .collection("users")
            .insertOne(user, function (err, dbresult) {
              if (err) callback(err);
              sendMail("Authorize", email, context)
                .then((result) => {
                  res.send(httpUtil.success(200, "", dbresult));
                })
                .catch((error) => {
                  res.send(httpUtil.success(200, "", dbresult));
                });
            });
        })
        .catch(function (error) {
          console.log(error);
        });
    });
});

router.post("/startSession", function (req, res, next) {
  const uid = req.body.uid ? ObjectId(req.body.uid) : "";
  const stationId = req.body.stationId ? req.body.stationId : "";
  const connectorId = req.body.connectorId ? req.body.connectorId : "";
  const accessToken = req.body.accessToken ? req.body.accessToken : "";
  async.waterfall(
    [
      function (callback) {
        var data = qs.stringify({
          response_url:
            "http://ec2-13-235-241-129.ap-south-1.compute.amazonaws.com:3000/session?id=" +
            connectorId,
          token: "UC1111",
          location_id: stationId,
          evse_id: connectorId,
        });
        var config = {
          method: "POST",
          url:
            "https://120.72.88.163:11443/v1/ocpi/cpo/2.2/commands/START_SESSION",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Bearer " + accessToken,
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false,
          }),
          data: data,
        };
        axios(config)
          .then(function (response) {
            console.log(response);
            // if (response.data.commandResponse.result === "ACCEPTED") {
            //   callback(null, response);
            // } else {
            //   res.status(500).send(httpUtil.error(500, "Start Session Error"));
            // }
          })
          .catch(function (error) {
            console.log(error);
            res
              .status(500)
              .send(
                httpUtil.error(
                  500,
                  error?.response?.statusText
                    ? error?.response?.statusText
                    : "Start Session Error"
                )
              );
          });
      },
    ],
    function (err, result) {
      if (err) {
        res.status(500).send(httpUtil.error(500, "Start Session error."));
      } else {
        res.send(httpUtil.success(200, "Start Session created.", result));
      }
    }
  );
});

module.exports = router;
