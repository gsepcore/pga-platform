import React from "react";
import { Composition } from "remotion";
import { Video } from "./Video";
import { VideoShort, TOTAL_FRAMES_SHORT } from "./VideoShort";
import { FPS, TOTAL_FRAMES } from "./styles/theme";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="GSEPDemo"
        component={Video}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="GSEPDemoShort"
        component={VideoShort}
        durationInFrames={TOTAL_FRAMES_SHORT}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
