import * as tf from "@tensorflow/tfjs"
tf.setBackend("webgl");

class Memory {
    buffer = []
    indices = []
    maxLength = 0
    added = 0
    index = 0

    init(maxLength) {
        this.maxLength = maxLength;
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

        //this.indices = [...Array(this.added).keys()].map((v) => { return { v, r: Math.random() } }).sort((a, b) => a.r - b.r).map((v) => v.v);
    }
}

class DQN {
    model;
    targetModel;
    modelOptimizer;

    outputs;

    batchSize = 64;
    gamma = 0.99;
    epsilon = 1;
    episode = 0;
    minEpsilon = 0.1;
    targetUpdateInterval = 8;
    epsilonDecay = 1 / 2400;

    memory = new Memory();

    /*makeSingleModel(inputs, outputs){
        this.outputs = outputs;

        const input = tf.input({ shape: [inputs] });

        const dense1 = tf.layers.dense({ units: 64, kernelInitializer: 'heNormal' }).apply(input);
        const prelu1 = tf.layers.prelu().apply(dense1);
        const dense2 = tf.layers.dense({ units: 32, kernelInitializer: 'heNormal' }).apply(prelu1);
        const prelu2 = tf.layers.prelu().apply(dense2);
        const dense3 = tf.layers.dense({ units: outputs }).apply(prelu2);

        const model = tf.model({ inputs: input, outputs: dense3 });
    
        model.compile({
            loss: 'meanSquaredError', 
            optimizer: tf.train.rmsprop(1e-3)
        });
    
        return model;
    }*/

    makeSingleModel(inputs, outputs) {
        let optimizer = tf.train.adam(1e-3)//tf.train.adam(1e-4);
        this.outputs = outputs;

        let model = tf.sequential();
        model.add(tf.layers.dense({ units: 256, inputShape: [inputs], activation: "relu" }));
        model.add(tf.layers.dense({ units: 128, activation: "relu" }));
        model.add(tf.layers.dense({ units: 64, activation: "relu" }));
        model.add(tf.layers.dense({ units: outputs, activation: "linear" }))

        model.compile({
            loss: 'meanSquaredError',
            optimizer
        });

        return {model, optimizer};
    }

    makeModel(inputs, outputs) {
        let model = this.makeSingleModel(inputs, outputs);
        this.model = model.model;
        this.modelOptimizer = model.optimizer;

        this.targetModel = this.makeSingleModel(inputs, outputs).model;
    }

    selectAction(state, ignoreEpsilon) {
        if (!ignoreEpsilon && (Math.random() < this.epsilon)) {
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

    /*async train() {
        const batch = this.memory.sample(this.batchSize);
        if (batch.length !== this.batchSize) return;

        const states = batch.map(exp => exp.state);
        const actions = batch.map(exp => exp.action);
        const rewards = batch.map(exp => exp.reward);
        const nextStates = batch.map(exp => exp.nextState);
        const dones = batch.map(exp => exp.done);

        const statesTensor = tf.stack(states);
        const nextStatesTensor = tf.stack(nextStates);

        const qValuesNext = this.targetModel.predict(nextStatesTensor);
        const qValuesNextMax = qValuesNext.max(-1)
        let qValuesNextValue = qValuesNextMax.dataSync();

        const targets = rewards.map((reward, i) => reward + (1 - dones[i]) * this.gamma * qValuesNextValue[i]);

        const prediction = this.model.predict(statesTensor)
        const qValues = prediction.arraySync();

        for (let i = 0; i < this.batchSize; i++) {
            qValues[i][actions[i]] = targets[i];
        }

        const targetsTensor = tf.stack(qValues);

        await this.model.fit(statesTensor, targetsTensor, { epochs: 1, verbose: 0 });

        statesTensor.dispose();
        nextStatesTensor.dispose();
        targetsTensor.dispose();
        prediction.dispose();
        qValuesNext.dispose();
        qValuesNextMax.dispose();
        tf.dispose(states);
        tf.dispose(nextStates);




        this.updateEpsilon();

        if (this.episode % this.updateInterval == 0) {
            this.updateTargetModel();
        }
    }*/

    async train() {
        const batch = this.memory.sample(this.batchSize);

        const grads = tf.variableGrads(() => this.calculateBatchLoss(batch));
        this.modelOptimizer.applyGradients(grads.grads);
        tf.dispose(grads);



        this.updateEpsilon();

        if (this.episode % this.targetUpdateInterval == 0) {
            this.updateTargetModel();
        }
    }

    calculateBatchLoss(batch) {
        return tf.tidy(() => {
            const stateTensor = tf.stack(batch.map(exp => tf.tensor1d(exp.state)));    
            const actionTensor = tf.tensor1d(batch.map(exp => exp.action), 'int32');    
            const qs = this.model.apply(stateTensor, { training: true }).mul(tf.oneHot(actionTensor, this.outputs)).sum(-1);
    
            const nextStateTensor = tf.stack(batch.map(exp => tf.tensor1d(exp.nextState)));    
            const nextMaxQTensor = this.targetModel.predict(nextStateTensor).max(-1);    
            const rewardTensor = tf.tensor1d(batch.map(exp => exp.reward));            
            const doneMask = tf.scalar(1).sub(tf.tensor1d(batch.map(exp => exp.done)).asType('float32'));    
            const targetQs = rewardTensor.add(nextMaxQTensor.mul(doneMask).mul(this.gamma));
    
            return tf.losses.meanSquaredError(targetQs, qs);
        })
    }

    updateTargetModel() {
        this.targetModel.setWeights(this.model.getWeights());
    }

    updateEpsilon() {
        this.epsilon -= this.epsilonDecay;

        if (this.epsilon < this.minEpsilon) {
            this.epsilon = this.minEpsilon;
        }
    }
}

window.DQN = DQN;