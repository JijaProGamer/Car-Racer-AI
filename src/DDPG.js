import * as tf from "@tensorflow/tfjs"
tf.setBackend("webgl");

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
        this.buffer = [];
        this.added = 0;
        this.index = 0;

        for (let i = 0; i < maxLength; i++) {
            this.buffer.push(null);
        }

        this.indices = [...Array(maxLength).keys()];
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

        if (batchSize > this.maxLength) {
            throw new Error(`batchSize exceeds buffer length.`);
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
        tf.util.shuffle(this.indices);
    }
}

class DDPG {
    model;
    targetModel;
    modelOptimizer;

    outputs;

    discountRate = 0.01;

    batchSize = 128;
    gamma = 0.99;
    epsilon = 1;
    minEpsilon = 0.2;
    epsilonFallout = 0.5;

    epsilonDecayType = "time";
    epsilonDecay = 1 / 4800; // episode
    epsilonDecayStart = Date.now();
    epsilonDecayTime = (1000 * 60) * 60; // minutes

    memory = new Memory();

    makeSingleModel(inputs, outputs) {
        let optimizer = tf.train.adam(5e-3);
        this.outputs = outputs;

        let model = tf.sequential();

        model.add(tf.layers.dense({ units: 64, inputShape: [inputs], activation: "relu" }));
        model.add(tf.layers.dense({ units: 16, activation: "relu" }));
        model.add(tf.layers.dense({ units: outputs, activation: "linear" }))

        model.compile({
            loss: 'meanSquaredError',
            optimizer
        });

        return { model, optimizer };
    }

    makeModel(inputs, outputs) {
        let model = this.makeSingleModel(inputs, outputs);
        this.model = model.model;
        this.modelOptimizer = model.optimizer;

        this.targetModel = this.makeSingleModel(inputs, outputs).model;
    }

    selectAction(state, ignoreEpsilon) {
        if (!ignoreEpsilon && (Math.random() < this.epsilon) && !forceExploit) {
            return Math.floor(Math.random() * this.outputs);
        } else {
            let action = tf.tidy(() => {
                const qValues = this.model.predict(tf.tensor1d(state).expandDims(0)).dataSync();

                let biggest = -Infinity;
                let biggestIndex = 0;
                for (let i = 0; i < qValues.length; i++) {
                    if (isNaN(qValues[i])) {
                        console.warn("GRADIENT EXPLODED");
                    }

                    if (qValues[i] > biggest) {
                        biggest = qValues[i];
                        biggestIndex = i;
                    }
                }

                return biggestIndex;
            })

            return action;
        }
    }

    async train() {
        const batch = this.memory.sample(this.batchSize);
        if (batch.length !== this.batchSize) return;

        const states = tf.stack(batch.map(exp => tf.tensor1d(exp.state)));
        const nextStates = tf.stack(batch.map(exp => tf.tensor1d(exp.nextState)));
        const rewards = tf.tensor1d(batch.map(exp => exp.reward));
        const actions = tf.tensor1d(batch.map(exp => exp.action), 'int32');
    
        const criticLossFunction = () => tf.tidy(() => {
          let targetQs;

          if (this.discountRate === 0) {
            targetQs = rewards;
          } else {
            const targetActions = this.targetActorModel.predict(nextStates);
            const targetCriticQs = this.targetCriticModel.predict(tf.concat([nextStates, targetActions], 1));
            targetQs = rewards.add(targetCriticQs.mul(this.discountRate));
          }

          const criticQs = this.criticModel.predict(tf.concat([states, actions], 1));
          const criticLoss = tf.losses.meanSquaredError(targetQs, criticQs);
          return criticLoss.asScalar();
        });

        const criticTrainableVars = this.criticModel.getWeights(true);
        const criticGradient = tf.variableGrads(criticLossFunction, criticTrainableVars);
        
        this.criticModel.optimizer.applyGradients(criticGradient.grads);
        tf.dispose(criticGradient);
    
        const actorLossFunction = () => tf.tidy(() => {
          const policyActions = this.actorModel.predict(states);
          const criticQs = this.criticModel.predict(tf.concat([states, policyActions], 1));
          const actorLoss = tf.mean(criticQs.mul(-1));
          return actorLoss.asScalar()
        });

        const actorTrainableVars = this.actorModel.getWeights(true);
        const actorGradient = tf.variableGrads(actorLossFunction, actorTrainableVars);

        this.actorModel.optimizer.applyGradients(actorGradient.grads);
        const actorLoss = actorGradient.value.dataSync()[0];
        tf.dispose(actorGradient);
    }

    updateTargetModel() {
        this.targetModel.setWeights(this.model.getWeights());
    }

    updateEpsilon() {
        switch (this.epsilonDecayType) {
            case "time":
                let timeTillEnd = ((this.epsilonDecayStart + this.epsilonDecayTime) - Date.now()) / this.epsilonDecayTime;

                this.epsilon = this.minEpsilon + (timeTillEnd * (1 - this.minEpsilon));
                break;
            case "episodes":
                this.epsilon -= this.epsilonDecay;
                break;
        }

        if (this.epsilon < this.minEpsilon) {
            this.epsilon = this.minEpsilon;
        }
    }
}

window.DDPG = DDPG;