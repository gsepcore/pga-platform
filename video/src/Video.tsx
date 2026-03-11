import React from "react";
import { Sequence, Audio, staticFile, interpolate } from "remotion";
import { SCENE_FRAMES } from "./styles/theme";
import { Background } from "./components/Background";

// Import all 20 scenes (default exports)
import S01_Hook from "./scenes/S01_Hook";
import S02_CorePitch from "./scenes/S02_CorePitch";
import S03_Problem from "./scenes/S03_Problem";
import S04_Chromosomes from "./scenes/S04_Chromosomes";
import S05_EvolutionCycle from "./scenes/S05_EvolutionCycle";
import S06_Fitness from "./scenes/S06_Fitness";
import S07_DriftDetection from "./scenes/S07_DriftDetection";
import S08_LivingAgent from "./scenes/S08_LivingAgent";
import S09_Firewall from "./scenes/S09_Firewall";
import S10_GeneBank from "./scenes/S10_GeneBank";
import S11_Integration from "./scenes/S11_Integration";
import S12_Config from "./scenes/S12_Config";
import S13_ProofOfValue from "./scenes/S13_ProofOfValue";
import S14_Examples from "./scenes/S14_Examples";
import S15_MultiModel from "./scenes/S15_MultiModel";
import S16_ThreePillars from "./scenes/S16_ThreePillars";
import S17_Benchmarks from "./scenes/S17_Benchmarks";
import S18_Licensing from "./scenes/S18_Licensing";
import S19_GetStarted from "./scenes/S19_GetStarted";
import S20_Closing from "./scenes/S20_Closing";

// Scene list with frame durations and audio file names
const scenes = [
  { component: S01_Hook, frames: SCENE_FRAMES.S01_Hook, audio: "voiceover-s01.m4a" },
  { component: S02_CorePitch, frames: SCENE_FRAMES.S02_CorePitch, audio: "voiceover-s02.m4a" },
  { component: S03_Problem, frames: SCENE_FRAMES.S03_Problem, audio: "voiceover-s03.m4a" },
  { component: S04_Chromosomes, frames: SCENE_FRAMES.S04_Chromosomes, audio: "voiceover-s04.m4a" },
  { component: S05_EvolutionCycle, frames: SCENE_FRAMES.S05_EvolutionCycle, audio: "voiceover-s05.m4a" },
  { component: S06_Fitness, frames: SCENE_FRAMES.S06_Fitness, audio: "voiceover-s06.m4a" },
  { component: S07_DriftDetection, frames: SCENE_FRAMES.S07_DriftDetection, audio: "voiceover-s07.m4a" },
  { component: S08_LivingAgent, frames: SCENE_FRAMES.S08_LivingAgent, audio: "voiceover-s08.m4a" },
  { component: S09_Firewall, frames: SCENE_FRAMES.S09_Firewall, audio: "voiceover-s09.m4a" },
  { component: S10_GeneBank, frames: SCENE_FRAMES.S10_GeneBank, audio: "voiceover-s10.m4a" },
  { component: S11_Integration, frames: SCENE_FRAMES.S11_Integration, audio: "voiceover-s11.m4a" },
  { component: S12_Config, frames: SCENE_FRAMES.S12_Config, audio: "voiceover-s12.m4a" },
  { component: S13_ProofOfValue, frames: SCENE_FRAMES.S13_ProofOfValue, audio: "voiceover-s13.m4a" },
  { component: S14_Examples, frames: SCENE_FRAMES.S14_Examples, audio: "voiceover-s14.m4a" },
  { component: S15_MultiModel, frames: SCENE_FRAMES.S15_MultiModel, audio: "voiceover-s15.m4a" },
  { component: S16_ThreePillars, frames: SCENE_FRAMES.S16_ThreePillars, audio: "voiceover-s16.m4a" },
  { component: S17_Benchmarks, frames: SCENE_FRAMES.S17_Benchmarks, audio: "voiceover-s17.m4a" },
  { component: S18_Licensing, frames: SCENE_FRAMES.S18_Licensing, audio: "voiceover-s18.m4a" },
  { component: S19_GetStarted, frames: SCENE_FRAMES.S19_GetStarted, audio: "voiceover-s19.m4a" },
  { component: S20_Closing, frames: SCENE_FRAMES.S20_Closing, audio: "voiceover-s20.m4a" },
];

export const Video: React.FC = () => {
  let currentFrame = 0;

  return (
    <Background>
      {/* Scenes with voiceover audio */}
      {scenes.map(({ component: SceneComponent, frames, audio }, index) => {
        const from = currentFrame;
        currentFrame += frames;
        return (
          <Sequence key={index} from={from} durationInFrames={frames} name={`S${String(index + 1).padStart(2, "0")}`}>
            <SceneComponent />
            <Audio
              src={staticFile(`audio/${audio}`)}
              volume={(f) =>
                interpolate(f, [0, 15, frames - 15, frames], [0, 0.9, 0.9, 0], {
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
