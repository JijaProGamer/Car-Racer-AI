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
        //this.xPrev = new Array(this.mean.shape[0]).fill(0);
        this.xPrev = Array.from({ length: this.mean.shape[0] }, () => (Math.random() * 2 - 1) * this.stdDev);
    }
}



class TD3 {
    actorModel;
    actorModelOptimizer;

    criticModel1;
    criticModel2;
    criticModel1Optimizer;
    criticModel2Optimizer;

    targetActorModel;
    targetCriticModel1;
    targetCriticModel2;

    noise;

    outputs;
    inputs;

    gamma;
    tau;
    batchSize;

    actorLR;
    criticLR;

    policyDelay;
    actionNoise;
    noiseClip;
    step = 0;

    epsilon;
    minEpsilon;

    init() {
        this.noise = new OUActionNoise(Array(this.outputs).fill(0), 0.3, 0.25, 1e-2);

        this.actorModel = this.createActorModel();
        this.criticModel1 = this.createCriticModel();
        this.criticModel2 = this.createCriticModel();

        this.targetActorModel = this.createActorModel();
        this.targetCriticModel1 = this.createCriticModel();
        this.targetCriticModel2 = this.createCriticModel();

        this.targetActorModel.setWeights(this.actorModel.getWeights());
        this.targetCriticModel1.setWeights(this.criticModel1.getWeights());
        this.targetCriticModel2.setWeights(this.criticModel2.getWeights());

        this.actorModelOptimizer = tf.train.adam(this.actorLR);
        this.criticModel1Optimizer = tf.train.adam(this.criticLR);
        this.criticModel2Optimizer = tf.train.adam(this.criticLR);
    }

    createActorModel() {
        const input = tf.input({ shape: this.inputs });

        let output = tf.layers.dense({ units: 256, activation: 'relu', useBias: true }).apply(input)
        output = tf.layers.dense({ units: 128, activation: 'relu', useBias: true }).apply(output)

        output = tf.layers.dense({ units: this.outputs[0], activation: 'tanh', kernelInitializer: tf.initializers.randomUniform({ minval: -0.003, maxval: 0.003 }) }).apply(output);

        const model = tf.model({ inputs: input, outputs: output });
        return model;
    }

    createCriticModel() {
        const stateInput = tf.input({ shape: this.inputs });
        let stateOut = tf.layers.dense({ units: 256, activation: 'relu', useBias: true }).apply(stateInput);
        stateOut = tf.layers.dense({ units: 128, activation: 'relu', useBias: true }).apply(stateOut);

        const actionInput = tf.input({ shape: this.outputs });
        let actionOut = tf.layers.dense({ units: 256, activation: 'relu', useBias: true }).apply(actionInput);

        const concat = tf.layers.concatenate().apply([stateOut, actionOut]);

        let out = tf.layers.dense({ units: 512, activation: 'relu', useBias: true }).apply(concat);
        out = tf.layers.dense({ units: 128, activation: 'relu', useBias: true }).apply(out);
        const outputs = tf.layers.dense({ units: 1 }).apply(out);

        const model = tf.model({ inputs: [stateInput, actionInput], outputs: outputs });
        return model;
    }

    calculateActions(state, ignoreEpsilon) {
        return tf.tidy(() => {
            state = tf.tensor1d(state).expandDims(0);
            let actions = this.actorModel.predict(state).squeeze();

            if (!ignoreEpsilon) {
                actions = actions.add(this.noise.call()).clipByValue(-1, 1);
            }

            return actions.dataSync();
        });
    }

    async train(batch) {
        return tf.tidy(() => {
            const stateBatch = tf.stack(batch.map(exp => tf.tensor1d(exp.state)));
            const nextStateBatch = tf.stack(batch.map(exp => tf.tensor1d(exp.nextState)));
            const actionBatch = tf.stack(batch.map(exp => tf.tensor1d(exp.action)));
            const rewardBatch = tf.tensor1d(batch.map(exp => exp.reward));
            const doneMask = tf.scalar(1).sub(tf.tensor1d(batch.map(exp => exp.done)).asType('float32'));

            const noise = tf.clipByValue(tf.randomNormal(this.outputs).mul(this.actionNoise), -this.noiseClip, this.noiseClip);
            let targetActions = this.targetActorModel.predict(nextStateBatch).add(noise).clipByValue(-1, 1);

            const targetQ1 = this.targetCriticModel1.predict([nextStateBatch, targetActions]).squeeze();
            const targetQ2 = this.targetCriticModel2.predict([nextStateBatch, targetActions]).squeeze();
            const targetQ = tf.minimum(targetQ1, targetQ2);

            const y = rewardBatch.add(targetQ.mul(this.gamma).mul(doneMask));

            let { grads: critic_gradients1, value: critic_loss1 } = tf.variableGrads(() => {
                const criticQs1 = this.criticModel1.predict([stateBatch, actionBatch]).squeeze();
                return tf.losses.meanSquaredError(y, criticQs1);
            }, this.criticModel1.getWeights());
            this.criticModel1Optimizer.applyGradients(critic_gradients1);

            let { grads: critic_gradients2, value: critic_loss2 } = tf.variableGrads(() => {
                const criticQs2 = this.criticModel2.predict([stateBatch, actionBatch]).squeeze();
                return tf.losses.meanSquaredError(y, criticQs2);
            }, this.criticModel2.getWeights());
            this.criticModel2Optimizer.applyGradients(critic_gradients2);

            let actor_loss;

            if (this.step % this.policyDelay === 0) {
                let { grads: actor_gradients, value: _actor_loss } = tf.variableGrads(() => {
                    const predictedActions = this.actorModel.predict(stateBatch).squeeze();
                    const criticValue = this.criticModel1.predict([stateBatch, predictedActions]).squeeze();
                    return criticValue.mean().neg();
                }, this.actorModel.getWeights());

                this.actorModelOptimizer.applyGradients(actor_gradients);

                actor_loss = _actor_loss;
            }

            this.step += 1;

            return {
                critic_loss1: critic_loss1.dataSync()['0'],
                critic_loss2: critic_loss2.dataSync()['0'],
                actor_loss: actor_loss ? actor_loss.dataSync()['0'] : null
            };
        });
    }

    updateTargetModel() {
        tf.tidy(() => {
            const modelPairs = [
                [this.targetActorModel, this.actorModel],
                [this.targetCriticModel1, this.criticModel1],
                [this.targetCriticModel2, this.criticModel2],
            ];

            modelPairs.forEach(([targetModel, model]) => {
                const targetWeights = targetModel.getWeights();
                const modelWeights = model.getWeights();

                for(let i = 0; i < targetWeights.length; i++){
                    targetWeights[i] = targetWeights[i].mul(1 - this.tau).add(modelWeights[i].mul(this.tau));
                }

                targetModel.setWeights(targetWeights);
            });
        });
    }

    async saveModel() {
        await this.actorModel.save(`http://localhost:${location.port}/actor`);
        await this.targetActorModel.save(`http://localhost:${location.port}/targetActor`);
        await this.criticModel1.save(`http://localhost:${location.port}/critic1`);
        await this.criticModel2.save(`http://localhost:${location.port}/critic2`);
        await this.targetCriticModel1.save(`http://localhost:${location.port}/targetCritic1`);
        await this.targetCriticModel2.save(`http://localhost:${location.port}/targetCritic2`);
    }
}

window.TD3 = TD3;