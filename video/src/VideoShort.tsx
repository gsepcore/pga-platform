import React from "react";
import { Sequence, Audio, staticFile, interpolate } from "remotion";
import { Background } from "./components/Background";

// Condensed scenes — animations properly timed for short video
import S01_Hook_Short from "./scenes/short/S01_Hook_Short";
import S02_CorePitch_Short from "./scenes/short/S02_CorePitch_Short";
import S03_Problem_Short from "./scenes/short/S03_Problem_Short";
import S04_Chromosomes_Short from "./scenes/short/S04_Chromosomes_Short";
import S05_EvolutionCycle_Short from "./scenes/short/S05_EvolutionCycle_Short";
import S06_FitnessDrift_Short from "./scenes/short/S06_FitnessDrift_Short";
import S07_LivingAgent_Short from "./scenes/short/S07_LivingAgent_Short";
import S08_Firewall_Short from "./scenes/short/S08_Firewall_Short";
import S09_Integration_Short from "./scenes/short/S09_Integration_Short";
import S10_Benchmarks_Short from "./scenes/short/S10_Benchmarks_Short";
import S11_GetStarted_Short from "./scenes/short/S11_GetStarted_Short";
import S12_Closing_Short from "./scenes/short/S12_Closing_Short";

// Condensed scenes: 12 key scenes, ~5:30 total
const FPS = 30;
const scenes = [
  { component: S01_Hook_Short, seconds: 18, audio: "short-s01.mp3", name: "Hook" },
  { component: S02_CorePitch_Short, seconds: 22, audio: "short-s02.mp3", name: "Pitch" },
  { component: S03_Problem_Short, seconds: 18, audio: "short-s03.mp3", name: "Problem" },
  { component: S04_Chromosomes_Short, seconds: 50, audio: "short-s04.mp3", name: "Chromosomes" },
  { component: S05_EvolutionCycle_Short, seconds: 40, audio: "short-s05.mp3", name: "Evolution" },
  { component: S06_FitnessDrift_Short, seconds: 28, audio: "short-s06.mp3", name: "Fitness+Drift" },
  { component: S07_LivingAgent_Short, seconds: 45, audio: "short-s07.mp3", name: "LivingAgent" },
  { component: S08_Firewall_Short, seconds: 22, audio: "short-s08.mp3", name: "Firewall" },
  { component: S09_Integration_Short, seconds: 28, audio: "short-s09.mp3", name: "Integration" },
  { component: S10_Benchmarks_Short, seconds: 22, audio: "short-s10.mp3", name: "Benchmarks" },
  { component: S11_GetStarted_Short, seconds: 20, audio: "short-s11.mp3", name: "GetStarted" },
  { component: S12_Closing_Short, seconds: 17, audio: "short-s12.mp3", name: "Closing" },
];

export const TOTAL_FRAMES_SHORT = scenes.reduce((acc, s) => acc + s.seconds * FPS, 0);

export const VideoShort: React.FC = () => {
  let currentFrame = 0;

  return (
    <Background>
      {scenes.map(({ component: SceneComponent, seconds, audio, name }, index) => {
        const from = currentFrame;
        const frames = seconds * FPS;
        currentFrame += frames;
        return (
          <Sequence key={index} from={from} durationInFrames={frames} name={name}>
            <SceneComponent />
            <Audio
              src={staticFile(`audio/${audio}`)}
              volume={(f) =>
                interpolate(f, [0, 10, frames - 10, frames], [0, 0.95, 0.95, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              }
            />
          </Sequence>
        );
      })}
    </Background>
  );
};
