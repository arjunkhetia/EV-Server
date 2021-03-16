var express = require("express");
var router = express.Router();
var db = require("../dbconfig");
var ObjectId = require("mongodb").ObjectID;
var async = require("async");
var axios = require("axios");
var qs = require("qs");
var https = require("https");
var httpUtil = require("../utilities/http-messages");
var sendMail = require("../utilities/sendMail");

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

router.post("/", async function (req, res, next) {
  const pushData = req.body ? req.body : "";
  let user;
  let chargedAmount;
  const data = req.body
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
  if (pushData?.transactionType === "StartTransaction") {
    async.waterfall(
      [
        function (callback) {
          db.get()
            .collection("users")
            .find({
              stationId: pushData.properties[0].chargePointIdentifier.toString(),
              connecctorId: pushData.properties[0].connectorId.toString(),
              status: "Requested",
            })
            .toArray(function (err, result) {
              if (err) throw err;
              user = result[0];
              callback(null, result[0]);
            });
        },
        function (result, callback) {
          if (result) {
            let dt = pushData.properties[0].timestamp
              ? new Date(pushData.properties[0].timestamp)
              : Date.now();
            let data = {
              $set: {
                chargingStartAt: dt.getTime(),
                transactionId: pushData.properties[0].transactionId,
                updatedAt: Date.now(),
                status: "Charging",
              },
            };
            db.get()
              .collection("users")
              .updateOne(
                { _id: ObjectId(result._id) },
                data,
                function (err, dbresult) {
                  if (err) callback(err);
                  callback(null, result);
                }
              );
          } else {
            callback(null, result);
          }
        },
        function (result, callback) {
          let context = {
            name: result.name,
            stationId: result.stationId,
            connecctorId: result.connecctorId,
            link:
              "http://evstation.s3-website.ap-south-1.amazonaws.com/charging?userId=" +
              result._id,
          };
          sendMail("Started", result.email, context)
            .then((result) => {
              callback(null, result);
            })
            .catch((error) => {
              callback(null, error);
            });
        },
      ],
      function (err, result) {
        if (err) {
          console.log("Error in Start Transaction Process.");
        } else {
          console.log("Start Transaction Process Completed Successfully.");
        }
      }
    );
  } else if (pushData?.transactionType === "MeterValues") {
    await asyncForEach(pushData.properties, async (properties) => {
      async.waterfall(
        [
          function (callback) {
            db.get()
              .collection("users")
              .find({
                transactionId: properties.transactionId,
                status: "Charging",
              })
              .toArray(function (err, result) {
                if (err) throw err;
                user = result[0];
                callback(null, result[0]);
              });
          },
          function (result, callback) {
            let startTime = new Date(user.chargingStartAt);
            let currentTime = properties.meterValue[0].timestamp
              ? new Date(properties.meterValue[0].timestamp)
              : Date.now();
            const diff = currentTime - startTime;
            const hours = parseInt((Math.abs(diff) / (1000 * 60 * 60)) % 24);
            const minutes = parseInt((Math.abs(diff) / (1000 * 60)) % 60);
            const seconds = parseInt((Math.abs(diff) / 1000) % 60);
            let data = {
              time:
                hours.toLocaleString("en-US", {
                  minimumIntegerDigits: 2,
                  useGrouping: false,
                }) +
                ":" +
                minutes.toLocaleString("en-US", {
                  minimumIntegerDigits: 2,
                  useGrouping: false,
                }) +
                ":" +
                seconds.toLocaleString("en-US", {
                  minimumIntegerDigits: 2,
                  useGrouping: false,
                }),
              unit: properties.meterValue[0].sampledValue[0].value,
            };
            callback(null, data);
          },
          function (result, callback) {
            let data = {
              $set: {
                time: result.time,
                unit: result.unit,
                updatedAt: Date.now(),
              },
            };
            db.get()
              .collection("users")
              .updateOne(
                { _id: ObjectId(user._id) },
                data,
                function (err, dbresult) {
                  if (err) callback(err);
                  callback(null, result);
                }
              );
          },
        ],
        function (err, result) {
          if (err) {
            console.log("Error in Meter Values Process.");
          } else {
            console.log("Meter Values Process Completed Successfully.");
          }
        }
      );
    });
  } else if (pushData?.transactionType === "StopTransaction") {
    async.waterfall(
      [
        function (callback) {
          db.get()
            .collection("users")
            .find({
              transactionId: pushData.properties[0].transactionId,
              status: "Charging",
            })
            .toArray(function (err, result) {
              if (err) throw err;
              user = result[0];
              callback(null, result[0]);
            });
        },
        function (result, callback) {
          db.get()
            .collection("settings")
            .find({})
            .toArray(function (err, result) {
              if (err) throw err;
              const settings = result[0];
              let startTime = new Date(user.chargingStartAt);
              let stopTime = pushData.properties[0].timestamp
                ? new Date(pushData.properties[0].timestamp)
                : Date.now();
              const diff = stopTime - startTime;
              const hours = parseInt((Math.abs(diff) / (1000 * 60 * 60)) % 24);
              const minutes = parseInt((Math.abs(diff) / (1000 * 60)) % 60);
              const seconds = parseInt((Math.abs(diff) / 1000) % 60);
              if (settings.price === "pricetime") {
                const price = parseFloat(settings.min);
                chargedAmount =
                  hours * (price * 60) +
                  minutes * price +
                  seconds * (price / 60);
                let data = {
                  time:
                    hours.toLocaleString("en-US", {
                      minimumIntegerDigits: 2,
                      useGrouping: false,
                    }) +
                    ":" +
                    minutes.toLocaleString("en-US", {
                      minimumIntegerDigits: 2,
                      useGrouping: false,
                    }) +
                    ":" +
                    seconds.toLocaleString("en-US", {
                      minimumIntegerDigits: 2,
                      useGrouping: false,
                    }),
                  chargedAmount: chargedAmount,
                };
                callback(null, data);
              } else if (settings.price === "pricekwh") {
                const price = parseFloat(settings.kwh);
                const meter = parseFloat(pushData.properties[0].meterStop);
                chargedAmount = (meter * price).toFixed(2);
                let data = {
                  time:
                    hours.toLocaleString("en-US", {
                      minimumIntegerDigits: 2,
                      useGrouping: false,
                    }) +
                    ":" +
                    minutes.toLocaleString("en-US", {
                      minimumIntegerDigits: 2,
                      useGrouping: false,
                    }) +
                    ":" +
                    seconds.toLocaleString("en-US", {
                      minimumIntegerDigits: 2,
                      useGrouping: false,
                    }),
                  chargedAmount: chargedAmount,
                };
                callback(null, data);
              }
            });
        },
        function (result, callback) {
          if (result) {
            let dt = pushData.properties[0].timestamp
              ? new Date(pushData.properties[0].timestamp)
              : Date.now();
            let data = {
              $set: {
                time: result.time,
                unit: pushData.properties[0].meterStop,
                price: result.chargedAmount,
                chargingStopAt: dt.getTime(),
                updatedAt: Date.now(),
                status: "Complete",
              },
            };
            db.get()
              .collection("users")
              .updateOne(
                { _id: ObjectId(user._id) },
                data,
                function (err, dbresult) {
                  if (err) callback(err);
                  callback(null, result);
                }
              );
          } else {
            callback(null, result);
          }
        },
        function (result, callback) {
          var data = JSON.stringify({
            createTransactionRequest: {
              merchantAuthentication: {
                name: "37Xbna3d2Fza",
                transactionKey: "88f9A2VUrKmJ3Z5d",
              },
              refId: user.refId,
              transactionRequest: {
                transactionType: "priorAuthCaptureTransaction",
                amount: result.chargedAmount,
                refTransId: user.transId,
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
              callback(null, result);
            })
            .catch(function (error) {
              callback(null, result);
            });
        },
        function (result, callback) {
          let context = {
            name: user.name,
            stationId: user.stationId,
            connecctorId: user.connecctorId,
            time: result.time,
            unit: pushData.properties[0].meterStop,
            price: result.chargedAmount,
          };
          sendMail("Complete", user.email, context)
            .then((result) => {
              callback(null, result);
            })
            .catch((error) => {
              callback(null, result);
            });
        },
      ],
      function (err, result) {
        if (err) {
          console.log("Error in Stop Transaction Process.");
        } else {
          console.log("Stop Transaction Process Completed Successfully.");
        }
      }
    );
  } else {
    Console.log("No Signal");
  }
});

module.exports = router;
