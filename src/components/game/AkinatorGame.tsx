import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { ApiKeySettingsDialog } from "#/components/game/ApiKeySettingsDialog";
import { ConnectScreen } from "#/components/game/ConnectScreen";
import { GenreScreen } from "#/components/game/GenreScreen";
import { HandoffScreen } from "#/components/game/HandoffScreen";
import { IntroScreen } from "#/components/game/IntroScreen";
import { LandingScreen } from "#/components/game/LandingScreen";
import { ModeScreen } from "#/components/game/ModeScreen";
import { PlayScreen } from "#/components/game/PlayScreen";
import { ResultScreen } from "#/components/game/ResultScreen";
import { StartingScreen } from "#/components/game/StartingScreen";
import { TopicScreen } from "#/components/game/TopicScreen";
import { useAkinatorGame } from "#/lib/client-game";
import type { WizardDirection } from "#/lib/client-types";
import type { ConfigResult } from "#/lib/contract";
import { useBgm, useCorrectSound } from "#/lib/use-bgm";

type AkinatorGameProps = {
  config: ConfigResult;
};

export function AkinatorGame({ config }: AkinatorGameProps) {
  const game = useAkinatorGame(config);
  const prefersReduced = useReducedMotion();
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (game.phase !== "play") {
      setIsListening(false);
    }
  }, [game.phase]);

  useBgm({
    active: game.phase === "play",
    enabled: game.bgmSettings.enabled,
    volume: game.bgmSettings.volume,
    ducked: isListening,
  });

  useCorrectSound(
    game.phase === "result" && game.outcome === "correct",
    game.bgmSettings.enabled,
    game.bgmSettings.volume,
  );

  const enterTransition = prefersReduced
    ? { duration: 0.14 }
    : {
        x: { type: "spring" as const, stiffness: 360, damping: 32 },
        opacity: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
      };

  const exitTransition = prefersReduced
    ? { duration: 0.12 }
    : { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const };

  const stageVariants = {
    enter: (dir: WizardDirection) =>
      prefersReduced ? { opacity: 0, x: 0 } : { opacity: 0, x: dir * 32 },
    center: {
      opacity: 1,
      x: 0,
      transition: enterTransition,
    },
    exit: (dir: WizardDirection) =>
      prefersReduced
        ? { opacity: 0, x: 0, transition: exitTransition }
        : { opacity: 0, x: dir * -24, transition: exitTransition },
  };

  return (
    <MotionConfig reducedMotion="user">
      {/* Reserve bottom clearance for the fixed bottom-right settings gear (bottom-4 right-4 size-12) below 1360px */}
      <main className="h-dvh w-full overflow-hidden pb-14 sm:pb-16 min-[1360px]:pb-0">
        <AnimatePresence mode="wait" custom={game.direction} initial={false}>
          <motion.div
            key={game.phase}
            custom={game.direction}
            variants={stageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="size-full overflow-hidden"
          >
            {game.phase === "landing" && <LandingScreen onStart={game.goToMode} />}

            {game.phase === "mode" && (
              <ModeScreen
                selectedMode={game.draftSetup.mode}
                onBack={game.backToLanding}
                onSelectMode={game.handleSelectMode}
              />
            )}

            {game.phase === "intro" && (
              <IntroScreen onBack={game.backToMode} onContinue={game.goToTopic} />
            )}

            {game.phase === "topic" && (
              <TopicScreen
                initialDraft={game.draftSetup}
                onBack={game.backToIntro}
                onNext={game.handleTopicNext}
              />
            )}

            {game.phase === "genre" && (
              <GenreScreen
                initialDraft={game.draftSetup}
                errorCode={game.errorCode}
                onDismissError={game.dismissError}
                onBack={game.backToMode}
                onNext={game.handleTopicNext}
              />
            )}

            {game.phase === "connect" && (
              <ConnectScreen
                topicMode={game.draftSetup.mode}
                serverHasKey={config.serverHasKey}
                apiKey={game.apiKey}
                useSearch={game.draftSetup.useSearch}
                connection={game.connection}
                errorCode={game.errorCode}
                onApiKeyChange={game.handleApiKeyChange}
                onClearApiKey={game.handleClearApiKey}
                onTestConnection={game.handleTestConnection}
                onDismissError={game.dismissError}
                onBack={game.handleBackToTopic}
                onStart={() => void game.handleStartRegister()}
                onStartWithoutSearch={() => void game.handleStartRegister(false)}
              />
            )}

            {game.phase === "starting" && <StartingScreen topicMode={game.draftSetup.mode} />}

            {game.phase === "handoff" && <HandoffScreen onStart={game.startPlay} />}

            {game.phase === "play" && (
              <PlayScreen
                history={game.history}
                pendingEntry={game.pendingEntry}
                questionCount={game.questionCount}
                questionLimit={game.questionLimit}
                isGuessOnly={game.isGuessOnly}
                isSubmitting={game.isSubmitting}
                apiKey={game.activeApiKey}
                errorCode={game.errorCode}
                onChat={game.handleChat}
                onGuess={game.handleGuess}
                onGiveUp={game.handleGiveUp}
                onDismissError={game.dismissError}
                onReset={game.handleRestart}
                onListeningChange={setIsListening}
              />
            )}

            {game.phase === "result" && (
              <ResultScreen
                outcome={game.outcome}
                questionCount={game.questionCount}
                questionLimit={game.questionLimit}
                history={game.history}
                reveal={game.reveal}
                isLoadingReveal={game.isLoadingReveal}
                errorCode={game.errorCode}
                onDismissError={game.dismissError}
                onRetryReveal={game.retryReveal}
                onRestart={game.handleRestart}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <ApiKeySettingsDialog
          serverHasKey={config.serverHasKey}
          apiKey={game.apiKey}
          bgmSettings={game.bgmSettings}
          onApiKeyChange={game.handleApiKeyChange}
          onClearApiKey={game.handleClearApiKey}
          onBgmEnabledChange={game.handleBgmEnabledChange}
          onBgmVolumeChange={game.handleBgmVolumeChange}
        />
      </main>
    </MotionConfig>
  );
}
