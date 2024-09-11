class OUActionNoise {
    constructor(mean, stdDeviation, theta = 0.15, dt = 1e-2) {
        this.theta = theta;
        this.mean = tf.tensor1d(mean);
        this.stdDev = stdDeviation;
        this.dt = dt;

        this.reset();
    }

    call() {
        const x = tf.tensor1d(this.xPrev)
            .add(this.mean.sub(tf.tensor1d(this.xPrev).mul(this.theta).mul(this.dt)))
            .add(tf.scalar(this.stdDev).mul(tf.scalar(this.dt).sqrt()).mul(tf.randomNormal(this.mean.shape)));

        this.xPrev = x.dataSync();
        return x;
    }

    reset() {
        this.xPrev = new Array(this.mean.shape[0]).fill(0);
        //this.xPrev = Array.from({ length: this.mean.shape[0] }, () => Math.random() * 2 - 1);
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
    inputs;

    gamma;
    tau;
    batchSize;

    actorLR;
    criticLR;

    epsilon;
    minEpsilon;

    constructor(inputs, outputs) {
        this.inputs = inputs;
        this.outputs = outputs;
    }

    init(){
        this.noise = new OUActionNoise(Array(this.outputs).fill(0), 0.2, 0.15, 1e-2);
        //this.noise = new OUActionNoise(Array(this.outputs).fill(0), this.epsilon / 2, 0.15, 1e-2);

        this.actorModel = this.createActorModel();
        this.criticModel = this.createCriticModel();
        this.targetActorModel = this.createActorModel();
        this.targetCriticModel = this.createCriticModel();

        this.targetActorModel.setWeights(this.actorModel.getWeights());
        this.targetCriticModel.setWeights(this.criticModel.getWeights());

        this.actorModelOptimizer = tf.train.adam(this.actorLR);
        this.criticModelOptimizer = tf.train.adam(this.criticLR);
        
        //this.actorModel.
    }

    createActorModel() {
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: this.inputs }));
        model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
        model.add(tf.layers.dense({ units: this.outputs[0], activation: 'tanh', kernelInitializer: tf.initializers.randomUniform( { minval: -0.003, maxval: 0.003 }) }));
        
        return model;
    }

    createCriticModel() {
        const stateInput = tf.input({ shape: this.inputs });
        let stateOut = tf.layers.dense({ units: 16, activation: 'relu' }).apply(stateInput);
        stateOut = tf.layers.dense({ units: 32, activation: 'relu' }).apply(stateOut);

        const actionInput = tf.input({ shape: this.outputs });
        let actionOut = tf.layers.dense({ units: 32, activation: 'relu' }).apply(actionInput);

        const concat = tf.layers.concatenate().apply([stateOut, actionOut]);

        let out = tf.layers.dense({ units: 256, activation: 'relu' }).apply(concat);
        out = tf.layers.dense({ units: 256, activation: 'relu' }).apply(out);
        const outputs = tf.layers.dense({ units: 1 }).apply(out);

        const model = tf.model({ inputs: [stateInput, actionInput], outputs: outputs });

        return model;
    }

    calculateActions(state, ignoreEpsilon) {
        return tf.tidy(() => {
            state = tf.tensor1d(state).expandDims(0);

            const actions = this.actorModel.predict(state).squeeze();

            if (ignoreEpsilon) {
                return actions.dataSync();
            } else {
                const noise = this.noise.call();
                const noisyActions = actions.add(noise).clipByValue(-1, 1);

                return noisyActions.dataSync();
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
            const doneMask = tf.scalar(1).sub(tf.tensor1d(batch.map(exp => exp.done)).asType('float32'));




            let { grads: critic_gradients, value: critic_loss } = tf.variableGrads(() => {
                const targetActions = this.targetActorModel.predict(nextStateBatch);
                const targetQ = this.targetCriticModel.predict([nextStateBatch, targetActions]).squeeze();

                const y = rewardBatch.add(targetQ.mul(this.gamma).mul(doneMask));

                const criticQs = this.criticModel.predict([stateBatch, actionBatch]).squeeze();
                const criticLoss = tf.losses.meanSquaredError(y, criticQs);

                return criticLoss;
            }, this.criticModel.getWeights())



            for (const key in critic_gradients) {
                critic_gradients[key] = critic_gradients[key].clipByValue(-1, 1);
            }

            this.criticModelOptimizer.applyGradients(critic_gradients);







            let { grads: actor_gradients, value: actor_loss } = tf.variableGrads(() => {
                const predictedActions = this.actorModel.predict(stateBatch).squeeze();
                const criticValue = this.criticModel.predict([stateBatch, predictedActions]).squeeze();
                const actor_loss = criticValue.mean().neg();

                return actor_loss;
            }, this.actorModel.getWeights())


            for (const key in actor_gradients) {
                actor_gradients[key] = actor_gradients[key].clipByValue(-1, 1);
            }

            this.actorModelOptimizer.applyGradients(actor_gradients);







            return { critic_loss: critic_loss.dataSync(), actor_loss: actor_loss.dataSync() }
        });
    }



    updateTargetModel() {
        tf.tidy(() => {
            const modelPairs = [
                [this.targetActorModel, this.actorModel],
                [this.targetCriticModel, this.criticModel]
            ];
    
            modelPairs.forEach(([targetModel, model]) => {
                const targetWeights = targetModel.getWeights();
                const modelWeights = model.getWeights();
                
                const updatedWeights = targetWeights.map((targetWeight, i) => {
                    const originalWeight = modelWeights[i];
                    
                    //return tf.mul(originalWeight, this.tau).add(tf.mul(targetWeight, (1 - this.tau)))
                    return tf.mul(originalWeight, 1 - this.tau).add(tf.mul(targetWeight, this.tau))
                });
                
                targetModel.setWeights(updatedWeights);
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

        //this.noise.stdDev = this.epsilon / 2;
    }
}


window.DDPG = DDPG;