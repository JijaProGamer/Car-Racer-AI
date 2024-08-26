import gymnasium as gym
import matplotlib.pyplot as plt
import numpy as np
import asyncio
import json

from websockets import connect

#env = gym.make("Ant-v4")

#env = gym.make("MountainCarContinuous-v0", render_mode='human')
env = gym.make("MountainCarContinuous-v0")

total_rewards = []
episodes = 100

async def send_and_receive(websocket, data_to_send):
    await websocket.send(data_to_send)
    return await websocket.recv()

async def main():
    cumulative_reward = 0  # Move this inside the function

    async with connect("ws://localhost:5555") as websocket:
        for episode in range(episodes):
            observation, info = env.reset()
            episode_reward = 0

            obs = observation

            last_state = None

            for _ in range(100):
                action = json.loads(await send_and_receive(websocket, data_to_send=json.dumps(["action", obs.tolist()])))

                observation, reward, terminated, truncated, info = env.step(action)

                if(last_state):
                    await send_and_receive(websocket, data_to_send=json.dumps( ["reward", [reward, *last_state, observation.tolist()]] ))
                last_state = [reward, (terminated or truncated), observation.tolist()]

                episode_reward += reward

                if terminated or truncated:
                    break

                obs = observation

            total_rewards.append(episode_reward)
            cumulative_reward += episode_reward

            print(f"Episode {episode + 1}: Reward = {episode_reward}")

        env.close()

        plt.plot(total_rewards)
        plt.xlabel('Episode')
        plt.ylabel('Total Reward')
        plt.title('Rewards per Episode')
        plt.show()

        print(f"Cumulative Reward after {episodes} episodes: {cumulative_reward}")

asyncio.run(main())
