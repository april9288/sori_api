'use strict';

const express = require('express');
const app = express();
const watson = require('watson-developer-cloud');
const vcapServices = require('vcap_services');
const cors = require('cors')
const bodyParser = require('body-parser');
const indico = require('indico.io');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static(__dirname + '/static'));
app.use(cors());
indico.apiKey = process.env.indico_key;

app.post('/indico/personas', (req, res) => {
  // console.log("connected to indico and your request body is...", req.body.text);
  indico.personas(req.body.text)
    .then(response => res.send(response))
    .catch(logError => res.send(logError));
})

app.post('/indico/emotion', (req, res) => {
  // console.log("connected to indico and your request body is...", req.body.text);
  indico.emotion(req.body.text)
    .then(response => res.send(response))
    .catch(logError => res.send(logError));
})

if (process.env.VCAP_SERVICES) {
  const RateLimit = require('express-rate-limit');
  app.enable('trust proxy'); 

  const limiter = new RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    delayMs: 0 // disable delaying - full speed until the max limit is reached
  });

  app.use('/api/', limiter);

  const secure = require('express-secure-only');
  app.use(secure());
}

var sttAuthService = new watson.AuthorizationV1(
  Object.assign(
    {
      username: process.env.watson_id, 
      password: process.env.watson_pw
    },
    vcapServices.getCredentials('speech_to_text') // pulls credentials from environment in bluemix, otherwise returns {}
  )
);

app.use('/api/speech-to-text/token', function(req, res) {
  sttAuthService.getToken(
    {
      url: watson.SpeechToTextV1.URL
    },
    function(err, token) {
      if (err) {
        console.log('Error retrieving token: ', err);
        res.status(500).send('Error retrieving token');
        return;
      }
      res.send(token);
    }
  );
});

const port = process.env.PORT || process.env.VCAP_APP_PORT || 3002;
app.listen(port, function() {
  console.log('IBM Watson API and Indico API are listening at ', port);
});


if (!process.env.VCAP_SERVICES) {
  const fs = require('fs');
  const https = require('https');
  const HTTPS_PORT = 3001;

  const options = {
    key: fs.readFileSync(__dirname + '/keys/localhost.pem'),
    cert: fs.readFileSync(__dirname + '/keys/localhost.cert')
  };
  https.createServer(options, app).listen(HTTPS_PORT, function() {
    console.log('Secure server live at https://localhost:%s/', HTTPS_PORT);
  });
}