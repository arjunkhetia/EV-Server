var nodemailer = require("nodemailer");
var hbs = require("nodemailer-express-handlebars");
var path = require("path");

let sendMail = (type, email, context) => {
  return new Promise(function (resolve, reject) {
    let mailBody;
    if (type === "Authorize") {
      mailBody = {
        from: "manthansetupath@gmail.com",
        to: email,
        subject: "Your card is Authorized",
        template: "authorizeEmail",
        context: context,
        attachments: [
          {
            filename: "logo.png",
            path: path.join(__dirname, "../views/logo.png"),
            cid: "logoImage",
          },
          {
            filename: "authorized.png",
            path: path.join(__dirname, "../views/authorized.png"),
            cid: "authorizedImage",
          },
          {
            filename: "call.png",
            path: path.join(__dirname, "../views/call.png"),
            cid: "callImage",
          },
        ],
      };
    } else if (type === "Complete") {
      mailBody = {
        from: "manthansetupath@gmail.com",
        to: email,
        subject: "Charging Completed",
        template: "completeEmail",
        context: context,
        attachments: [
          {
            filename: "logo.png",
            path: path.join(__dirname, "../views/logo.png"),
            cid: "logoImage",
          },
          {
            filename: "completed.png",
            path: path.join(__dirname, "../views/completed.png"),
            cid: "completedImage",
          },
          {
            filename: "call.png",
            path: path.join(__dirname, "../views/call.png"),
            cid: "callImage",
          },
        ],
      };
    }
    let transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      requireTLS: true,
      tls: {
        rejectUnauthorized: false,
      },
      auth: {
        user: "manthansetupath@gmail.com",
        pass: "ManthanSetuPath",
      },
    });
    transporter.use(
      "compile",
      hbs({
        viewEngine: {
          extname: ".hbs",
          defaultLayout: "layout",
          layoutsDir: path.join(__dirname, "../views/"),
        },
        extName: ".hbs",
        viewPath: path.join(__dirname, "../views/"),
      })
    );
    transporter.verify(function (error, success) {
      if (error) {
        console.log(error);
      } else {
        console.log("Server is ready to take our messages");
      }
    });
    transporter.sendMail(mailBody, function (err, info) {
      if (err) {
        console.log(err);
        reject("Mail not sent");
      } else {
        console.log(info);
        resolve("Mail Sent");
      }
    });
  });
};

module.exports = sendMail;
