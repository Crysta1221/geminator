import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { HowItWorksScreen } from "#/components/game/inspect/HowItWorksScreen";
import { PlayScreen } from "#/components/game/play/PlayScreen";
import { ResultScreen } from "#/components/game/result/ResultScreen";
import { ConnectScreen } from "#/components/game/setup/ConnectScreen";
import { GenreAnnounceScreen } from "#/components/game/setup/GenreAnnounceScreen";
import { GenreScreen } from "#/components/game/setup/GenreScreen";
import { HandoffScreen } from "#/components/game/setup/HandoffScreen";
import { IntroScreen } from "#/components/game/setup/IntroScreen";
import { LandingScreen } from "#/components/game/setup/LandingScreen";
import { ModeScreen } from "#/components/game/setup/ModeScreen";
import { StartingScreen } from "#/components/game/setup/StartingScreen";
import { TopicScreen } from "#/components/game/setup/TopicScreen";
import { FloatingUtilityDock } from "#/components/game/shared/FloatingUtilityDock";
import { useAkinatorGame } from "#/hooks/use-akinator-game";
import { useBgm, useCorrectSound } from "#/hooks/use-bgm";
import type { WizardDirection } from "#/lib/client-types";
import type { ConfigResult } from "#/lib/contract";

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
      {/* Reserve bottom clearance for the fixed bottom-right utility dock below 1360px */}
      <main className="h-dvh w-full overflow-hidden pb-14 min-[1360px]:pb-0 sm:pb-16">
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
            {game.phase === "landing" && (
              <LandingScreen onStart={game.goToMode} onInspect={game.goToInspect} />
            )}

            {game.phase === "inspect" && (
              <HowItWorksScreen
                serverHasKey={config.serverHasKey}
                apiKey={game.apiKey}
                activeApiKey={game.activeApiKey}
                onApiKeyChange={game.handleApiKeyChange}
                onClearApiKey={game.handleClearApiKey}
                onBack={game.backToLanding}
              />
            )}

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

            {game.phase === "genre_announce" && (
              <GenreAnnounceScreen genre={game.sessionConfig.genre} onComplete={game.startPlay} />
            )}

            {game.phase === "handoff" && <HandoffScreen onStart={game.startPlay} />}

            {game.phase === "play" && (
              <PlayScreen
                history={game.history}
                pendingEntry={game.pendingEntry}
                questionCount={game.questionCount}
                questionLimit={game.questionLimit}
                genre={
                  game.sessionConfig.mode === "genre" && game.sessionConfig.genre
                    ? game.sessionConfig.genre
                    : undefined
                }
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
                sessionConfig={game.sessionConfig}
                siteUrl={config.siteUrl}
                onDismissError={game.dismissError}
                onRetryReveal={game.retryReveal}
                onReplaySameMode={game.handleReplaySameMode}
                onRestart={game.handleRestart}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <FloatingUtilityDock
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
