// Import modules
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const avo = require('avo-js');

// Import config
const config = require('./config.json');
const directory = require('./directory.json');

const app = express();

// Create .signatures if it does not already exist
fs.readFile('.signatures','utf8',function(err, data){
    if (err) {
      fs.writeFile('.signatures', '', function(err) {
          if (err) {
              console.error(err);
          }
          console.info(".signatures created");
      });
    } else {
      avo('signatures').value = data
        .split('\n')
        .filter(l => l.trim().length)
        .map(l => ({
          name: l.split('|')[0].trim(),
          from: l.split('|')[1].trim() || undefined
        }));
      avo('signatures').bind(async () => {
        fs.writeFile(
          '.signatures',
          avo('signatures').value
            .map(s => `${s.name}|${s.from}`)
            .join('\n'),
          {}
        );
      });
    }
  });

// Add middleware
app.use(express.static('static'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json());
app.get('*', (request, response, next) => {
  if (directory[request.path] !== undefined) {
    return response.render(directory[request.path], {
      parameters: request.query,
      config,
      //md,
      cookies: request.cookies,
    });
  }

  if (next) return next();
  return response.status(404).end();
});
app.set('view engine', 'pug');
app.set('views', './templates/');

// Routes
app.get('/pledge/', async (request,response) => {
  response.render('pledge', {
    signatures: avo('signatures').value
  });
})

app.post('/pledge/', async (request, response) => {
  const proposed = {name: request.body.name, from: request.body.from};
  if (
    typeof request.body.name === 'string' &&
    typeof request.body.from === 'string' &&
    request.body.name.length < 32 &&
    request.body.from.length < 64 &&
    JSON.stringify(avo('signatures').value.slice(-1)[0]) !== JSON.stringify(proposed)
  ) {
    avo('signatures').value = [
      ...avo('signatures').value,
      proposed
    ];
  }
  response.render('pledge', {
    signatures: avo('signatures').value
  });
});

// Listen on port in config.json
app.listen(config.port, async () => {
  console.info('Serving awesomeness on port ' + config.port);
});
