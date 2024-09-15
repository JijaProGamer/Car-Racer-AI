const playwright = require("playwright")
const express = require('express');
const path = require("path")
const uuid = require("uuid")
const multer = require("multer")
const { WebSocketServer } = require('ws');
const fs = require("fs")

const port = 7860;

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

class Memory {
  buffer = []
  indices = []
  maxLength = 0
  minLength = 0;
  added = 0
  index = 0

  init(maxLength, minLength) {
      this.maxLength = maxLength;
      this.minLength = minLength;
      this.buffer = new Array(maxLength);
      this.added = 0;
      this.index = 0;
      this.indices = [];
  }

  add(item) {
      this.buffer[this.index] = item;
      this.added = Math.min(this.added + 1, this.maxLength);

      this.index = (this.index + 1) % this.maxLength;
  }

  sample(batchSize) {
      if (this.added < this.minLength) {
          return [];
      }

      this.shuffleIndices();

      const samples = [];

      for (let i = 0; i < batchSize; i++) {
          let sample = this.buffer[this.indices[i]];
          if (sample) {
              samples.push(sample);
          }
      }

      return samples;
  }

  shuffleIndices() {
      this.indices = [...Array(this.added).keys()];
      this.indices = shuffle(this.indices);
  }
}

class ActorModel {
  criticLR      = 0.002;
  actorLR       = 0.001;
  gamma         = 0.99;
  epsilon       = 1;
  epsilonDecay  = 0.995; 
  minEpsilon    = 0.2;
  batchSize     = 64;
  tau           = 0.005;
  policyDelay   = 2;
  actionNoise   = 0.15;
  noiseClip     = 0.25;

  memory = new Memory();

  memorySize    = 3000;
  minimumMemory = 0;

  savePath;

  constructor(Inputs, Outputs) {
    this.Inputs = Inputs;
    this.Outputs = Outputs;
  }

  saveModel() {
    fs.writeFileSync(path.join(this.savePath, "/epsilon"), this.epsilon.toPrecision(2).toString())
    return this.sendRequest("save", {}, true);
  }

  remember(data) {
    this.memory.add(data);
    //this.sendRequest("remember", { data }, false);
  }

  updateEpsilon(data) {
    this.sendRequest("updateEpsilon", { data }, false);
  }

  train() {
    if(this.memory.added < this.minimumMemory) return;

    return this.sendRequest("train", { batch: this.sampleMemory() }, true);
  }

  updateTargetModel(){
    this.sendRequest("updateTargetModel", {}, false);
  }

  //async act(image, environment) {
  //  return (await this.sendRequest("act", { image, environment, resolution: this.Resolution }, true)).predictions;
  //}

  async act(state, ignoreEpsilon) {
    return (await this.sendRequest("act", { state, ignoreEpsilon }, true)).predictions;
  }

  quit(){
    this.browser.close()
  }

  sampleMemory(){
    return this.memory.sample(this.batchSize);
  }

  launchModel() {
    this.memory.init(this.memorySize, this.minimumMemory);

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
        if(!fs.existsSync(path.join(this.savePath, "/epsilon"))){
          fs.writeFileSync(path.join(this.savePath, "/epsilon"), this.epsilon.toPrecision(8).toString())
          return res.send(this.epsilon.toPrecision(8).toString());
        }
        
        res.send(this.epsilon.toPrecision(8).toString());
      });

      this.expressServer.post('/epsilon', (req, res) => {
        fs.writeFileSync(path.join(this.savePath, "/epsilon"), parseInt(req.query.epsilon).toPrecision(8).toString())
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
          policyDelay: this.policyDelay,
          actionNoise: this.actionNoise,
          noiseClip: this.noiseClip
        })
      });

      const modelSaver = (model) => {
        fs.mkdirSync(path.join(this.savePath, `/model/${model}`), { recursive: true });

        this.expressServer.get('/:name.bin', (req, res) => {
          const name = req.params.name;
          res.sendFile(path.join(this.savePath, `/model/${model}/${name}.bin`));
        });
  
        const storage = multer.diskStorage({
          destination: (req, file, cb) => {
            cb(null, path.join(this.savePath, `/model/${model}`));
          },
          filename: (req, file, cb) => {
            //if(file.originalname.includes(".bin")){
            //  file.originalname = file.split("model.").pop();
            //}
  
            cb(null, file.originalname);
          }
        });
  
        const upload = multer({ storage: storage });
        this.expressServer.post(`/${model}`, upload.any(), (req, res) => {
          if (!req.files) {
            return res.status(400).send('No files uploaded.');
          }
  
          res.send('Files uploaded successfully.');
        });
  
      }

      modelSaver("actor");
      modelSaver("critic");
      modelSaver("targetActor");
      modelSaver("targetCritic");

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