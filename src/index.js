import "./General.js";
import "./EnvironmentFunctions.js";
import "./UIFunctions.js";
import "./UI.js";
import "./Environment.js";

import "./DQN.js";
window.brains = new DQN()

const maxSteps = 5000;

brains.makeModel(24 + 2, actions.length);
brains.memory.init(15000000, 7500); // 3300 megabytes


let raycasts;

let lastReward = null;

let lastEpsilon = 1;
let stepsExploiting = 0;

let lastEpisodeSteps = [];
let isExploiting = false;
let stepsWhileExploiting = null;

window.onEnvironmentReset = async () => {
  if (episode > 1500) {
    let canForceExploit = episode % episodesPerExploit == 0;

    if (canForceExploit) {
      lastEpsilon = brains.epsilon;
      brains.epsilon = 0;
      isExploiting = true;
      if (episodeReward > episodes[bestEpisode] || bestEpisode == -1) bestEpisode = episode;
      episodes.push(episodeReward)

      episode += 1;
    } else if (isExploiting) {
      if (stepsExploiting == 0) {
        stepsWhileExploiting = lastEpisodeSteps;
      }

      if (stepsExploiting == episodesUsingExploit) {
        brains.epsilon = lastEpsilon;
        isExploiting = false;
        stepsExploiting = 0;

        return;
      }

      //brains.epsilon = Math.random() * (lastEpsilon / 2 - brains.minEpsilon) + brains.minEpsilon;
      brains.epsilon = Math.random() * (1 - 0.66) + 0.66;

      let stepTaken = stepsWhileExploiting[Math.floor((Math.random() * (0.9 - 0.7) + 0.7) * stepsWhileExploiting.length)];
      car.x = stepTaken[0];
      car.y = stepTaken[1];
      car.angle = stepTaken[2];
      car.speed = stepTaken[3];

      window.lastPathDistance = getPathDistance();

      stepsExploiting += 1;
    } else {
      if (episodeReward > episodes[bestEpisode] || bestEpisode == -1) bestEpisode = episode;
      episodes.push(episodeReward)

      episode += 1;
    }
  } else {
    if (episodeReward > episodes[bestEpisode] || bestEpisode == -1) bestEpisode = episode;
    episodes.push(episodeReward)

    episode += 1;
  }

  if (!isExploiting) {
    for (let train = 0; train < trainsPerEpisode; train++) {
      await brains.train();
    }

    brains.updateEpsilon();
  }

  lastEpisodeSteps = [];
}

async function step() {
  if (/*brains.epsilon > 0.9 &&*/ stepsTotal % 500 == 0 && isFast) {
    await sleep(1);
  }

  /*if (steps == 0) {
    let carSpawnpoint = findSpawnPoint(24);
    track.carStart = carSpawnpoint;
  }*/

  raycasts = doRaycasts(24);
  let state = calculateEnvironment(raycasts);

  let action = brains.selectAction(state, !isExploring);

  if (carIntersectsSegments()) {
    return await resetEnvironment(state, action, true);
  } else if (steps >= maxSteps) {
    return await resetEnvironment(state, action, false);
  }

  let reward = calculateRewards(raycasts);
  episodeReward += reward;

  if (lastReward) {
    brains.memory.add({ ...lastReward, nextState: state });
    lastReward = null;
  }

  if (reward !== 0) {
    //if (reward !== 0 && lastState) {
    lastReward = { state: state, reward, done: false, action }
    //brains.memory.add({ state: lastState, nextState: state, reward, done: false, action });
  }

  lastState = state;
  steps++;
  stepsTotal++;

  lastEpisodeSteps.push([car.x, car.y, car.angle, car.speed]);


  let direction = actionToDirection(action);
  updateCar(manualDrive ? manualDirection : direction);
}

async function buildStep() {
  await sleep(16.667);
  updateCar(manualDirection);
}

let lastDrawn = performance.now();

; ((async () => {
  while (true) {
    if (!isFast) await sleep(16.667);

    if (track.startFinish.x1 == 0) {
      await buildStep();
    } else {
      await step();
    }

    if ((performance.now() - lastDrawn) > 16.667) {
      draw(raycasts || []);

      drawStatistics()
      lastDrawn = performance.now();
    }
  }
})());