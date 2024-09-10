const playwright = require("playwright")
const express = require('express');
const path = require("path")
const uuid = require("uuid")
const multer = require("multer")
const { WebSocketServer } = require('ws');
const fs = require("fs")

const port = 7860;

class ActorModel {
  Resolution;

  criticLR = 0.002;
  actorLR = 0.001;
  gamma = 0.99;
  epsilon = 1;
  epsilonDecay = 0.995; 
  minEpsilon = 0.05;
  batchSize = 64;
  tau = 0.05;

  memorySize = 500000;
  minimumMemory = 128;

  constructor(Inputs, Outputs) {
    this.Inputs = Inputs;
    this.Outputs = Outputs;
  }

  saveModel() {
    fs.writeFileSync(path.join(__dirname, "/actor/epsilon"), this.epsilon.toPrecision(2).toString())
    return this.sendRequest("save", {}, true);
  }

  remember(data) {
    this.sendRequest("remember", { data }, false);
  }

  updateEpsilon(data) {
    this.sendRequest("updateEpsilon", { data }, false);
  }

  train() {
    return this.sendRequest("train", {}, true);
  }

  updateTargetModel(){
    this.sendRequest("updateTargetModel", {}, false);
  }

  //async act(image, environment) {
  //  return (await this.sendRequest("act", { image, environment, resolution: this.Resolution }, true)).predictions;
  //}

  async act(state) {
    return (await this.sendRequest("act", { state }, true)).predictions;
  }

  quit(){
    this.browser.close()
  }

  launchModel() {
    return new Promise(async (resolve, reject) => {
      this.expressServer = express();

      this.webSocketServer = new WebSocketServer({
        port: port + 1,
        perMessageDeflate: false
      });

      this.expressServer.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '/index.html'));
      });

      this.expressServer.get('/memory.js', (req, res) => {
        res.sendFile(path.join(__dirname, '/memory.js'));
      });

      this.expressServer.get('/index.js', (req, res) => {
        res.sendFile(path.join(__dirname, '/index.js'));
      });

      this.expressServer.get('/model.js', (req, res) => {
        res.sendFile(path.join(__dirname, '/model.js'));
      });

      this.expressServer.get('/model.json', (req, res) => {
        res.sendFile(path.join(__dirname, '/actor/model.json'));
      });

      this.expressServer.get('/epsilon', (req, res) => {
        if(!fs.existsSync(path.join(__dirname, "/actor/epsilon"))){
          fs.writeFileSync(path.join(__dirname, "/actor/epsilon"), this.epsilon.toPrecision(8).toString())
          return res.send(this.epsilon.toPrecision(8).toString());
        }
        
        res.send(this.epsilon.toPrecision(8).toString());
      });

      this.expressServer.post('/epsilon', (req, res) => {
        fs.writeFileSync(path.join(__dirname, "/actor/epsilon"), parseInt(req.query.epsilon).toPrecision(8).toString())
        res.sendStatus(200)
      });

      this.expressServer.get('/hyperparameters.json', (req, res) => {
        res.json({
          gamma: this.gamma,
          epsilon: this.epsilon,
          epsilonDecay: this.epsilonDecay,
          minEpsilon: this.minEpsilon,
          batchSize: this.batchSize,
          inputs: this.Inputs,
          outputs: this.Outputs,
          memorySize: this.memorySize,
          minimumMemory: this.minimumMemory,
          actorLR: this.actorLR,
          criticLR: this.criticLR,
          tau: this.tau,
        })
      });

      this.expressServer.get('/:name.bin', (req, res) => {
        const name = req.params.name;
        res.sendFile(path.join(__dirname, `/actor/model/${name}.bin`));
      });

      const storage = multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, path.join(__dirname, "/actor/model/"));
        },
        filename: (req, file, cb) => {
          //if(file.originalname.includes(".bin")){
          //  file.originalname = file.split("model.").pop();
          //}

          cb(null, file.originalname);
        }
      });

      const upload = multer({ storage: storage });
      this.expressServer.post('/model', upload.any(), (req, res) => {
        if (!req.files) {
          return res.status(400).send('No files uploaded.');
        }

        res.send('Files uploaded successfully.');
      });

      this.expressServer.listen(port, () => {
        //console.log(`Environment GPU ML Model is running at http://localhost:${port}, and WS at ws://localhost:${port + 1}`);
      });

      this.webSocketServer.on('connection', (ws) => {
        this.websocket = ws;

        this.websocket.on('error', console.error);
        //this.warmup().then(resolve)
        resolve()
      });

      this.browser = await playwright.chromium.launch({
        headless: false,
        args: [
          "--no-sandbox",
          "--use-angle=default",
          //'--use-gl=egl'
        ]
      })

      this.page = await this.browser.newPage()
      await this.page.goto(`http://localhost:${port}/`)

      //await this.page.screenshot({path: "gputest.png", fullPage: true})
    })
  }

  sendRequest(type, data, awaitResponse) {
    return new Promise((resolve, reject) => {
      let messageId = uuid.v4();
      let begin = performance.now();
      const websocket = this.websocket;

      if (awaitResponse) {
        function onMessage(message) {
          message = JSON.parse(message)
          if (message.id == messageId) {
            websocket.off("message", onMessage)

            resolve({ ...message, duration: performance.now() - begin })
          }
        }

        websocket.on("message", onMessage);
      } else {
        resolve();
      }

      websocket.send(JSON.stringify({ type, id: messageId, ...data }));
    })
  }
}

module.exports = ActorModel;