const path = require("path");


const GymEnvironment = require("./gymnasium/gymjs.js");
const LaunchGymEnvironment = require("./gymnasium/launchGym.js");

const ModelServer = require("./src/GPU/server.js");

const drawCanvas = require("./visuals.js");



let brains;

async function calculateAction(state) {
    await brains.train();

    return await brains.act(state, false);
}


let currentEpisode = 0;
let episodes = 100;

let episodeReward = 0;
let rewardsHistory = Array.from({ length: episodes }, () => 0);




async function onDone() {
    currentEpisode++;
    brains.updateEpsilon();
    brains.updateTargetModel();


    console.log(`Episode ${currentEpisode}/${episodes} reward: ${episodeReward}`);

    rewardsHistory[currentEpisode - 1] = episodeReward;
    episodeReward = 0;

    let shouldStop = currentEpisode / episodes >= 1;

    //if (shouldStop || currentEpisode % 25 == 0) {
        drawCanvas(rewardsHistory, currentEpisode, 2400, 1, true, path.join(__dirname, "graph_log.png")); // 50 instead of 1
        drawCanvas(rewardsHistory, currentEpisode, 2400, 1, false, path.join(__dirname, "graph_linear.png")); // 50 instead of 1
    //}

    return shouldStop;
}


function addMemory(item) {
    episodeReward += item.reward;
    brains.remember(item);
}

async function makeBrains(inputs, outputs) {
    brains = new ModelServer(inputs, outputs);

    brains.minEpsilon = 0.1;
    brains.epsilonDecay = Math.pow(brains.minEpsilon, 1 / episodes);

    brains.memorySize = 5000 * episodes;
    brains.minimumMemory = 0;//500 * 5;

    await brains.launchModel();
}

GymEnvironment(calculateAction, onDone, addMemory, makeBrains)

LaunchGymEnvironment()