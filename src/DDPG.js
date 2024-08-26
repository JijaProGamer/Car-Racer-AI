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

class OUActionNoise {
    constructor(mean, stdDeviation, theta = 0.15, dt = 1e-2) {
        this.theta = theta;
        this.mean = tf.tensor1d(mean);
        this.stdDev = stdDeviation;
        this.dt = dt;

        this.reset();
    }

    call() {
        const mul1 = tf.mul(this.theta * this.dt, tf.sub(this.mean, tf.tensor1d(this.xPrev)));
        const mul2 = tf.mul(tf.sqrt(this.dt), tf.mul(this.stdDev, tf.randomNormal(this.mean.shape)));

        const x = tf.add(
            tf.add(
                mul1,
                mul2
            ),
            this.xPrev
        );

        this.xPrev = x.dataSync();
        return x;
    }

    reset() {
        this.xPrev = Array(this.mean).fill(0);
    }
}

class DDPG {
    actorModel;
    actorModelOptimizer;

    criticModel;
    criticModelOptimizer;


    targetActorModel;
    targetActorModelOptimizer;

    targetCriticModel;
    targetCriticModelOptimizer;



    memory = new Memory();
    noise;

    outputs;

    gamma = 0.99;
    tau = 0.01;
    batchSize = 200;


    epsilon = 1;
    minEpsilon = 0.2;

    epsilonDecayType = "time";
    epsilonDecay = 1 / 4800; // episode
    epsilonDecayStart = Date.now();
    epsilonDecayTime = (1000 * 60) * 60; // minutes

    constructor(inputs, outputs) {
        this.outputs = outputs;
        this.noise = new OUActionNoise(Array(outputs).fill(0), this.epsilon, 0.15, 1e-2);


        let actorModel = this.createActorModel(inputs, outputs);
        this.actorModel = actorModel.model;
        this.actorModelOptimizer = actorModel.optimizer;

        let criticModel = this.createCriticModel(inputs, outputs);
        this.criticModel = criticModel.model;
        this.criticModelOptimizer = criticModel.optimizer;


        let targetActorModel = this.createActorModel(inputs, outputs);
        this.targetActorModel = targetActorModel.model;
        this.targetActorModelOptimizer = targetActorModel.optimizer;

        let targetCriticModel = this.createCriticModel(inputs, outputs);
        this.targetCriticModel = targetCriticModel.model;
        this.targetCriticModelOptimizer = targetCriticModel.optimizer;

        this.targetActorModel.setWeights(this.actorModel.getWeights());
        this.targetCriticModel.setWeights(this.criticModel.getWeights());
    }

    createActorModel(inputs, outputs) {
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 400, activation: 'relu', inputShape: [inputs] }));
        model.add(tf.layers.dense({ units: 300, activation: 'relu' }));
        model.add(tf.layers.dense({ units: outputs, activation: 'tanh', kernelInitializer: tf.initializers.randomUniform(0.003) }));

        const optimizer = tf.train.adam(1e-4);
        model.compile({
            loss: 'meanSquaredError',
            optimizer
        });

        return { model, optimizer };
    }

    createCriticModel(numStates, numActions) {
        const stateInput = tf.input({ shape: [numStates] });
        let stateOut = tf.layers.dense({ units: 400, activation: 'relu' }).apply(stateInput);
        stateOut = tf.layers.dense({ units: 300, activation: 'relu' }).apply(stateOut);

        const actionInput = tf.input({ shape: [numActions] });
        let actionOut = tf.layers.dense({ units: 300, activation: 'relu' }).apply(actionInput);

        const concat = tf.layers.concatenate().apply([stateOut, actionOut]);

        let out = tf.layers.dense({ units: 150, activation: 'relu' }).apply(concat);
        const outputs = tf.layers.dense({ units: 1 }).apply(out);

        const model = tf.model({ inputs: [stateInput, actionInput], outputs: outputs });

        const optimizer = tf.train.adam(1e-3);
        model.compile({
            loss: 'meanSquaredError',
            optimizer: optimizer
        });

        return { model, optimizer };
    }

    calculateActions(state, ignoreEpsilon) {
        return tf.tidy(() => {
            state = tf.tensor1d(state).expandDims(0);

            if (ignoreEpsilon || forceExploit) {
                const actions = this.actorModel.predict(state);

                return actions.dataSync();
            } else {
                /*const actions = this.actorModel.predict(state);
                const noise = this.noise.call();

                const noisyActions = actions.add(noise).clipByValue(-1, 1);
                return noisyActions.dataSync();*/

                if (Math.random() > this.epsilon) {
                    const actions = this.actorModel.predict(state);

                    return actions.dataSync();
                } else {
                    return Array.from({ length: this.outputs }, () => Math.random() * 2 - 1);
                }
            }
        });
    }

    async train() {
        const batch = this.memory.sample(this.batchSize);
        if (batch.length !== this.batchSize) return;

        return tf.tidy(() => {
            const stateBatch = tf.stack(batch.map(exp => tf.tensor1d(exp.state)));
            const nextStateBatch = tf.stack(batch.map(exp => tf.tensor1d(exp.nextState)));
            const actionBatch = tf.stack(batch.map(exp => tf.tensor1d(exp.action)));
            const rewardBatch = tf.tensor1d(batch.map(exp => exp.reward));
            const donesBatch = tf.tensor1d(batch.map(exp => exp.done)).asType('float32');


            let { grads: critic_gradients, value: critic_loss } = tf.variableGrads(() => {
                const targetActions = this.targetActorModel.predict(nextStateBatch);
                const targetQ = this.targetCriticModel.predict([nextStateBatch, targetActions]);

                const y = tf.add(
                    rewardBatch,
                    tf.mul(
                        tf.scalar(this.gamma),
                        tf.mul(
                            tf.scalar(1).sub(donesBatch), 
                            targetQ
                        )
                    )
                );

                const critic_value = this.criticModel.predict([stateBatch, actionBatch]);
                const critic_loss = tf.mean(tf.abs(tf.sub(y, critic_value)));

                return critic_loss;
            })

            this.criticModelOptimizer.applyGradients(critic_gradients);




            let { grads: actor_gradients, value: actor_loss } = tf.variableGrads(() => {
                const predictedActions = this.actorModel.predict(stateBatch);
                const criticValue = this.criticModel.predict([stateBatch, predictedActions]);
                const actor_loss = tf.neg(tf.mean(criticValue));

                return actor_loss;
            })

            this.actorModelOptimizer.applyGradients(actor_gradients);

            return { critic_loss, actor_loss }
        });
    }



    updateTargetModel() {
        tf.tidy(() => {
            const modelPairs = [
                [this.targetActorModel, this.actorModel],
                [this.targetCriticModel, this.criticModel]
            ];
    
            modelPairs.forEach(([targetModel, model]) => {
                const modelWeights = model.getWeights();
                const targetWeights = targetModel.getWeights();
    
                const newWeights = modelWeights.map((weight, index) => {
                    return tf.add(tf.mul(weight, tf.scalar(this.tau)), tf.mul(targetWeights[index], tf.scalar(1 - this.tau)));
                });
    
                targetModel.setWeights(newWeights);
            });
        })
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


        this.noise.stdDev = this.epsilon;
    }
}


window.DDPG = DDPG;