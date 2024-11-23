const path = require("path");


const GymEnvironment = require("./gymnasium/gymjs.js");
const LaunchGymEnvironment = require("./gymnasium/launchGym.js");

const ModelServer = require("./src/GPU/server.js");

const drawCanvas = require("./visuals.js");



let brains;

let stepsThisEpisode = 0;

let mode = "train";

async function calculateAction(state) {
    //let trainResults = await brains.train();

    //brains.updateTargetModel();

    stepsThisEpisode++;

    let actions = await brains.act(state, mode == "test");

    return actions;
}


let currentEpisode = 0;
let episodes = 500;
let episodesGathering = Math.floor(episodes / 4);
let stepsPerTrain = 1;
let lastTrainPercent = -1;

let episodeReward = 0;
let rewardsHistory = Array.from({ length: episodes }, () => 0);


async function onDone() {
    switch(mode){
        case "gather":
            currentEpisode++;

            episodeReward = 0;

            if(currentEpisode >= episodesGathering){
                mode = "train";
            }

            console.log(`Gathered: ${currentEpisode}/${episodesGathering}`)
            return false;
        case "train":
            currentEpisode++;
        
            for(let i = 0; i < stepsThisEpisode / stepsPerTrain; i++){
                /*if(currentEpisode == episodesGathering + 1){
                    if(lastTrainPercent + 0.01 <= i / (stepsThisEpisode / stepsPerTrain)){
                        lastTrainPercent = i / (stepsThisEpisode / stepsPerTrain);

                        console.log(`Trained ${Math.round(lastTrainPercent * 100)}% of the gather data`);
                    }
                }*/

                await brains.train();
                
                brains.updateTargetModel();
            }

            await brains.saveModel();

            stepsThisEpisode = 0;
            episodeReward = 0;
            mode = "test";
            return false;
        case "test":
            console.log(`Episode ${currentEpisode}/${episodes} reward: ${episodeReward}`);
        
            rewardsHistory[currentEpisode - 1] = episodeReward;
            drawCanvas(rewardsHistory, currentEpisode, 2400, 25, false, path.join(__dirname, "graph_linear.png"));


            stepsThisEpisode = 0;
            episodeReward = 0;
            mode = "train"
            return currentEpisode / episodes >= 1;
    }
}


function addMemory(item) {
    episodeReward += item.reward;
    brains.remember(item);
}

async function makeBrains(inputs, outputs) {
    brains = new ModelServer(inputs, outputs);

    brains.minEpsilon = 0.2;
    brains.epsilonDecay = Math.pow(brains.minEpsilon, 1 / episodes);

    //brains.memorySize = 5000 * episodes;
    //brains.minimumMemory = 0;//500 * 5;

    brains.savePath = path.join(__dirname, "model")

    await brains.launchModel();
}

GymEnvironment(calculateAction, onDone, addMemory, makeBrains)

LaunchGymEnvironment()