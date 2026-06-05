'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DripRecipe } from '@/lib/drip-guide/types';
import { playDripCountdownAudio } from '@/lib/drip-guide/countdownAudio';
import { useRunnerTimer } from '@/hooks/drip-guide/useRunnerTimer';
import { CompletionScreen } from './runner/CompletionScreen';
import { FloatingNav } from '@/components/ui'
import { FooterControls } from './runner/FooterControls';
import { FocusGuideDisplay } from './runner/FocusGuideDisplay';

interface DripGuideRunnerProps {
  recipe: DripRecipe;
}

export const DripGuideRunner: React.FC<DripGuideRunnerProps> = ({ recipe }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const countdownSoundPlayedRef = useRef<boolean>(false);

  // Manual mode state
  const isManualMode = recipe.isManualMode ?? false;
  const [manualStepIndex, setManualStepIndex] = useState(0);

  // Sort steps
  const steps = [...recipe.steps].sort((a, b) => a.startTimeSec - b.startTimeSec);

  // Determine current step
  const autoModeStepIndex = steps.findLastIndex((step) => step.startTimeSec <= currentTime);
  const currentStepIndex = isManualMode ? manualStepIndex : autoModeStepIndex;
  const currentStep = currentStepIndex !== -1 && currentStepIndex < steps.length ? steps[currentStepIndex] : null;
  const nextStep = currentStepIndex < steps.length - 1 ? steps[currentStepIndex + 1] : null;

  // Timer logic
  useRunnerTimer({
    isRunning,
    isManualMode,
    totalDurationSec: recipe.totalDurationSec,
    onTick: setCurrentTime,
    onComplete: () => {
      setIsRunning(false);
      setIsCompleted(true);
    },
  });

  // Play countdown sound 3 seconds before next step starts
  useEffect(() => {
    if (isManualMode || !nextStep) {
      countdownSoundPlayedRef.current = false;
      return;
    }

    const countdownTime = nextStep.startTimeSec - 3;

    if (currentTime >= countdownTime && !countdownSoundPlayedRef.current) {
      playDripCountdownAudio({ volume: 0.7 }).catch(() => {});
      countdownSoundPlayedRef.current = true;
    }

    if (currentTime < countdownTime) {
      countdownSoundPlayedRef.current = false;
    }
  }, [currentTime, nextStep, isManualMode]);

  const toggleTimer = () => setIsRunning((prev) => !prev);

  const resetTimer = () => {
    setIsRunning(false);
    setCurrentTime(0);
    setIsCompleted(false);
    countdownSoundPlayedRef.current = false;
    if (isManualMode) {
      setManualStepIndex(0);
    }
  };

  const goToNextStep = () => {
    if (isManualMode && manualStepIndex < steps.length - 1) {
      setManualStepIndex((prev) => prev + 1);
    }
  };

  const goToPrevStep = () => {
    if (isManualMode && manualStepIndex > 0) {
      setManualStepIndex((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    if (isManualMode) {
      setIsCompleted(true);
    }
  };

  if (isCompleted) {
    return <CompletionScreen onReset={resetTimer} />;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-ground relative overflow-hidden">
      <FloatingNav backHref="/drip-guide" />

      <div className="flex-1 flex items-center px-5 sm:px-6 lg:px-12 pb-4 lg:pb-6 overflow-y-auto">
        <FocusGuideDisplay
          currentTime={currentTime}
          recipeName={recipe.name}
          currentStep={currentStep}
          currentStepIndex={currentStepIndex}
          totalSteps={steps.length}
        />
      </div>

      <FooterControls
        isManualMode={isManualMode}
        isRunning={isRunning}
        nextStep={nextStep}
        manualStepIndex={manualStepIndex}
        stepsLength={steps.length}
        currentStepIndex={currentStepIndex}
        onToggleTimer={toggleTimer}
        onResetTimer={resetTimer}
        onGoToNextStep={goToNextStep}
        onGoToPrevStep={goToPrevStep}
        onComplete={handleComplete}
      />
    </div>
  );
};
