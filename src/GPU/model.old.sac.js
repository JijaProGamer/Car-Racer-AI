function uint8ToImage(uint8Array) {
    let tensor = tf.tensor(uint8Array, [uint8Array.length, uint8Array[0].length, 3], 'float32');
    const normalizedTensor = tensor.div(tf.scalar(255));

    return normalizedTensor;
}

function makeConvLayer(input, filters, kernelSize) {
    let conv = tf.layers.separableConv2d({ filters, kernelSize, padding: 'same', useBias: false }).apply(input);
    let prelu = tf.layers.prelu({ alphaInitializer: 'glorotNormal', useBias: false }).apply(conv);
    let pool = tf.layers.maxPooling2d({ poolSize: [2, 2] }).apply(prelu);
    let batchNorm = tf.layers.batchNormalization().apply(pool);

    return batchNorm;
}

function makeDenseLayer(input, units) {
    let dense = tf.layers.dense({ units, useBias: false }).apply(input);
    let prelu = tf.layers.prelu({ alphaInitializer: 'glorotNormal' }).apply(dense);
    let batchNorm = tf.layers.batchNormalization().apply(prelu);

    return batchNorm;
}

class SAC {
    init() {
        this.actorModel = this.createActorModel();
        this.criticModel1 = this.createCriticModel();
        this.criticModel2 = this.createCriticModel();

        this.targetCriticModel1 = this.createCriticModel();
        this.targetCriticModel2 = this.createCriticModel();

        this.targetCriticModel1.setWeights(this.criticModel1.getWeights());
        this.targetCriticModel2.setWeights(this.criticModel2.getWeights());

        this.actorOptimizer = tf.train.adam(this.actorLR);
        this.criticOptimizer1 = tf.train.adam(this.criticLR);
        this.criticOptimizer2 = tf.train.adam(this.criticLR);

        this.logAlpha = tf.variable(tf.scalar(0.0));
        this.alpha = this.logAlpha.exp();
        this.alphaOptimizer = tf.train.adam(this.alphaLR);
        this.targetEntropy = -this.outputs[0];
    }

    createActorModel() {
        const input = tf.input({ shape: [this.inputs] });
        let output = makeDenseLayer(input, 64);
        output = makeDenseLayer(output, 32);

        const mean = tf.layers.dense({ units: this.outputs[0], activation: 'linear' }).apply(output);
        const logStd = tf.layers.dense({ units: this.outputs[0], activation: 'tanh' }).apply(output);

        const model = tf.model({ inputs: input, outputs: [mean, logStd] });
        return model;
    }

    createCriticModel() {
        const stateInput = tf.input({ shape: [this.inputs] });
        const actionInput = tf.input({ shape: [this.outputs[0]] });

        let stateOut = makeDenseLayer(stateInput, 64);
        stateOut = makeDenseLayer(stateOut, 32);
        let actionOut = makeDenseLayer(actionInput, 64);

        const concat = tf.layers.concatenate().apply([stateOut, actionOut]);
        let out = makeDenseLayer(concat, 256);
        out = makeDenseLayer(out, 256);
        const output = tf.layers.dense({ units: 1 }).apply(out);

        return tf.model({ inputs: [stateInput, actionInput], outputs: output });
    }

    calculateActions(stateBatch, runMode = false) {
        return tf.tidy(() => {
            if (!stateBatch.shape) {
                stateBatch = tf.tensor2d([stateBatch], [1, this.inputs]);
            }

            const [mean, logStd] = this.actorModel.predict(stateBatch);
            const std = logStd.exp();

            let action;

            if (runMode) {
                action = mean.tanh();
            } else {
                const normal = tf.randomNormal(mean.shape);
                action = mean.add(std.mul(normal)).tanh();
            }

            //return action.dataSync();
            return [...action.dataSync()];
        });
    }

    async train(batch) {
        let losses = tf.tidy(() => {
            const stateBatch = tf.stack(batch.map(exp => tf.tensor1d(exp.state)));
            const nextStateBatch = tf.stack(batch.map(exp => tf.tensor1d(exp.nextState)));
            const actionBatch = tf.stack(batch.map(exp => tf.tensor1d(exp.action)));
            const rewardBatch = tf.tensor1d(batch.map(exp => exp.reward));
            const doneMask = tf.scalar(1).sub(tf.tensor1d(batch.map(exp => exp.done)).asType('float32'));

            const { criticGradients1, criticGradients2, criticLoss } = this.computeCriticLoss(
                stateBatch, actionBatch, nextStateBatch, rewardBatch, doneMask
            );

            this.criticOptimizer1.applyGradients(criticGradients1);
            this.criticOptimizer2.applyGradients(criticGradients2);

            const { actorGradients, actorLoss } = this.computeActorLoss(stateBatch);
            this.actorOptimizer.applyGradients(actorGradients);

            const { alphaGradients, alphaLoss } = this.updateAlpha(stateBatch);
            this.alphaOptimizer.applyGradients(alphaGradients);

            return { criticLoss, actorLoss };
        });

        //this.alpha = this.logAlpha.exp();

        return losses;
    }

    computeCriticLoss(stateBatch, actionBatch, nextStateBatch, rewardBatch, doneMask) {
        const rawTargetActions = this.calculateActions(nextStateBatch);
        const targetActions = tf.stack(rawTargetActions.map(exp => tf.tensor1d(Array.isArray(exp) && exp || [exp])));

        const targetQ1 = this.targetCriticModel1.predict([nextStateBatch, targetActions]).squeeze();
        const targetQ2 = this.targetCriticModel2.predict([nextStateBatch, targetActions]).squeeze();

        const minTargetQ = tf.minimum(targetQ1, targetQ2);
        const y = rewardBatch.add(minTargetQ.mul(this.gamma).mul(doneMask));

        let { grads: criticGradients1, value: criticLoss1 } = tf.variableGrads(() => {
            const criticQ1 = this.criticModel1.predict([stateBatch, actionBatch]).squeeze();
            return tf.losses.meanSquaredError(y, criticQ1);
        })

        let { grads: criticGradients2, value: criticLoss2 } = tf.variableGrads(() => {
            const criticQ2 = this.criticModel2.predict([stateBatch, actionBatch]).squeeze();
            return tf.losses.meanSquaredError(y, criticQ2);
        })

        return { criticGradients1, criticGradients2, criticLoss: criticLoss1.add(criticLoss2) };
    }

    computeActorLoss(stateBatch) {
        const [mean, logStd] = this.actorModel.predict(stateBatch);
        const std = logStd.exp();
        const normal = tf.randomNormal(mean.shape);
        const action = mean.add(std.mul(normal)).tanh();

        let { grads: actorGradients, value: actorLoss } = tf.variableGrads(() => {
            const criticQ1 = this.criticModel1.predict([stateBatch, action]).squeeze();
            const criticQ2 = this.criticModel2.predict([stateBatch, action]).squeeze();
            const minCriticQ = tf.minimum(criticQ1, criticQ2);

            return this.alpha.mul(logStd).sum().sub(minCriticQ.mean()).neg();
            //return this.alpha.mul(logStd.sum()).sub(minCriticQ).mean().neg();
        })

        return { actorGradients, actorLoss };
    }

    updateAlpha(stateBatch) {
        let { grads: alphaGradients, value: alphaLoss } = tf.variableGrads(() => {
            const [_, logStd] = this.actorModel.predict(stateBatch);
            const entropy = logStd.exp().sum().mean();
    
            return tf.scalar(this.targetEntropy).sub(entropy).mul(this.logAlpha.exp()).mean();
        })

        return { alphaGradients, alphaLoss }
    }

    updateTargetModel() {
        tf.tidy(() => {
            const modelPairs = [
                [this.targetCriticModel1, this.criticModel1],
                [this.targetCriticModel2, this.criticModel2]
            ];

            modelPairs.forEach(([targetModel, model]) => {
                const targetWeights = targetModel.getWeights();
                const modelWeights = model.getWeights();

                for (let i = 0; i < targetWeights.length; i++) {
                    targetWeights[i] = targetWeights[i].mul(1 - this.tau).add(modelWeights[i].mul(this.tau));
                }

                targetModel.setWeights(targetWeights);
            });
        });
    }

    async saveModel() {
        await this.actorModel.save(`http://localhost:${location.port}/actor`);
        await this.criticModel1.save(`http://localhost:${location.port}/critic1`);
        await this.criticModel2.save(`http://localhost:${location.port}/critic2`);
        await this.targetCriticModel1.save(`http://localhost:${location.port}/targetCritic1`);
        await this.targetCriticModel2.save(`http://localhost:${location.port}/targetCritic2`);
    }
}

window.SAC = SAC;