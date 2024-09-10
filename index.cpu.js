const GymEnvironment = require("./gymnasium/gymjs.js");
const LaunchGymEnvironment = require("./gymnasium/launchGym.js");

const DQN = require("./src/DQN.js");


const { createCanvas } = require('canvas');
const fs = require('fs');



let brains;

global.forceExploit = false;

let stepsTotal = 0;

async function calculateAction(state) {
    stepsTotal++;

    await brains.train();

    if (stepsTotal % 1500 == 0) {
        //if (stepsTotal % Math.pow(10, 2) == 0) {
        brains.updateTargetModel();
    }

    return brains.selectAction(state, false);
}

let currentEpisode = 0;
let episodes = 1000;

let episodeReward = 0;
let rewardsHistory = Array.from({ length: episodes }, () => 0);

async function onDone() {
    currentEpisode++;
    brains.updateEpsilon();

    console.log(`Episode ${currentEpisode}/${episodes} reward: ${episodeReward}`);

    rewardsHistory[currentEpisode - 1] = episodeReward;
    episodeReward = 0;

    let shouldStop = currentEpisode / episodes >= 1;

    if (shouldStop || currentEpisode % 25 == 0) {
        drawCanvas();
    }

    return shouldStop;
}

const windowSize = 50;
function drawCanvas() {
    const width = 2400;
    const height = Math.round((width * 9 / 16) / 2) * 2;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const margin = 50;
    const graphWidth = width - 2 * margin;
    const graphHeight = height - 2 * margin - 100; // Adjust height for the legend space
    const minValue = Math.min(...rewardsHistory.filter(value => value !== 0));
    const maxValue = Math.max(...rewardsHistory);
    const scaledRewards = rewardsHistory.map(value => Math.max((value - minValue) / (maxValue - minValue), 0));

    const slidingWindowRewards = [];
    for (let i = 0; i < rewardsHistory.length; i++) {
        if(i >= (currentEpisode - windowSize)){
            slidingWindowRewards.push(0);
            continue;
        }

        const start = Math.max(0, i - windowSize + 1);
        const window = scaledRewards.slice(start, i + 1);
        const avgReward = window.reduce((acc, r) => acc + r, 0) / window.length;
        slidingWindowRewards.push(avgReward);
    }

    const nonZeroMin = Math.min(...slidingWindowRewards.filter(value => value > 0));
    const adjustedSlidingWindowRewards = slidingWindowRewards.map(value => value === 0 ? nonZeroMin : value);

    const logSlidingWindowRewards = adjustedSlidingWindowRewards.map(value => Math.log10(Math.max(value, Number.MIN_VALUE)));
    const minLogValue = Math.min(...logSlidingWindowRewards);
    const maxLogValue = Math.max(...logSlidingWindowRewards);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin, height - margin - 100);
    ctx.lineTo(margin, margin);
    ctx.moveTo(margin, height - margin - 100);
    ctx.lineTo(width - margin, height - margin - 100);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(192, 75, 192, 1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    logSlidingWindowRewards.forEach((value, index) => {
        const x = margin + (index / (logSlidingWindowRewards.length - 1)) * graphWidth;
        const y = margin + ((maxLogValue - value) / (maxLogValue - minLogValue)) * graphHeight;
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    // Draw smallest and largest values
    ctx.font = '20px Arial';
    ctx.fillStyle = '#000000';
    ctx.fillText(`Min Value: ${minValue.toFixed(2)}`, margin, height - margin - 30);
    ctx.fillText(`Max Value: ${maxValue.toFixed(2)}`, width - margin - 200, height - margin - 30);

    ctx.font = '24px Arial';
    ctx.fillStyle = '#000000';
    for (let i = 0; i < rewardsHistory.length; i += 25) {
        const start = Math.max(0, i - windowSize + 1);
        const window = rewardsHistory.slice(start, i + 1);
        const avgReward = window.reduce((acc, r) => acc + r, 0) / window.length;

        const x = margin + (i / (rewardsHistory.length - 1)) * graphWidth;
        let reward = parseInt(avgReward.toFixed(0));

        if(i >= (currentEpisode - windowSize)){
            reward = 0;
        }

        ctx.fillText(reward, x, height - margin - 80);
    }

    const legendY = height - margin - 50;
    ctx.font = '30px Arial';
    ctx.fillStyle = '#000000';
    ctx.fillText('Legend:', margin, legendY);

    ctx.fillStyle = 'rgba(192, 75, 192, 1)';
    ctx.fillRect(margin + 150, legendY - 20, 30, 30);
    ctx.fillStyle = '#000000';
    ctx.fillText('Sliding Window Average (Log Scale)', margin + 190, legendY + 10);

    const out = fs.createWriteStream(__dirname + '/graph.png');
    const stream = canvas.createPNGStream();
    stream.pipe(out);
}

function addMemory(item) {
    episodeReward += item.reward;
    brains.memory.add(item);
}

function makeBrains(inputs, outputs) {
    brains = new DQN(inputs, outputs);
    brains.epsilonDecay = Math.pow(brains.minEpsilon, 1 / episodes);
    brains.memory.init(500 * episodes, 500 * 5);
}

GymEnvironment(calculateAction, onDone, addMemory, makeBrains)

LaunchGymEnvironment()