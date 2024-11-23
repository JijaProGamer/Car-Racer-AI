import gymnasium
import asyncio
import json
import numpy as np
from websockets import connect

#env = gymnasium.make("Ant-v5")

env = gymnasium.make("Pendulum-v1")

#env = gymnasium.make("Humanoid-v5")

#env = gymnasium.make("CarRacing-v3", domain_randomize=True, render_mode='human')
#env = gymnasium.make("CarRacing-v2", domain_randomize=True)

def rescale_to_env_space(values):
    return env.action_space.low + (values + 1) * (env.action_space.high - env.action_space.low) / 2.0

async def main():
    async with connect("ws://localhost:5555") as websocket:
        await websocket.send(json.dumps( ["environment", [env.observation_space.shape, env.action_space.shape] ]))
        #await websocket.send(json.dumps(["environment", [env.observation_space.shape, int(env.action_space.n)]]))
        await websocket.recv()

        while True:
            obs, info = env.reset()
            done = False

            while not done:
                await websocket.send(json.dumps(["action", obs.tolist()]))
                #action = json.loads(await websocket.recv())
                action = list(json.loads(await websocket.recv()).values())
                #action = int(await websocket.recv())

                rescaled_actions = rescale_to_env_space(np.array(action))

                next_obs, reward, terminated, truncated, info = env.step(rescaled_actions)

                await websocket.send( json.dumps( ["reward", [reward, terminated, action, obs.tolist(), next_obs.tolist()]] ))

                obs = next_obs
                done = terminated or truncated

            await websocket.send(json.dumps(["done"]))
            stop = int(await websocket.recv())

            if(stop):
                break

        env.close()

        #obs, info = env_render.reset()
        #done = False

        #while not done:
        #    await websocket.send(json.dumps(["action", obs.tolist()]))
        #    action = json.loads(await websocket.recv())
        #
        #    observation, reward, terminated, truncated, info = env_render.step(action)
        #
        #    obs = observation
        #    done = terminated or truncated
        #
        #env_render.close()

asyncio.run(main())
