import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchReveal,
  runTestConnection,
  submitChat,
  submitGenreTopic,
  submitGuess,
  submitTopic,
} from "#/lib/client-api";
import {
  type ConnectionCheckState,
  countValidQuestions,
  type DraftSetup,
  type GameOutcome,
  type GamePhase,
  type HistoryEntry,
  INITIAL_CONNECTION_STATE,
  type PendingHistoryEntry,
  probeResultToView,
  type TopicMode,
  type WizardDirection,
} from "#/lib/client-types";
import { type ConfigResult, type ErrorCode, type RevealResult, toErrorCode } from "#/lib/contract";
import {
  type BgmSettings,
  clearApiKey,
  clearSession,
  clearVerifiedConnection,
  DEFAULT_BGM_SETTINGS,
  loadApiKey,
  loadBgmSettings,
  loadSession,
  loadVerifiedConnection,
  saveApiKey,
  saveBgmSettings,
  saveSession,
  saveVerifiedConnection,
} from "#/lib/storage";

const EMPTY_DRAFT: DraftSetup = {
  mode: "custom",
  answer: "",
  notes: "",
  genre: "",
  useSearch: false,
  questionLimit: null,
};

const SERVER_KEY_SIGNATURE = "__server__";

function createEntryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isConnectionReady(connection: ConnectionCheckState, useSearch: boolean): boolean {
  return (
    connection.decisions.status === "ok" &&
    connection.text.status === "ok" &&
    (!useSearch || connection.search.status === "ok")
  );
}

export function useAkinatorGame(config: ConfigResult) {
  const [phase, setPhase] = useState<GamePhase>("landing");
  const [direction, setDirection] = useState<WizardDirection>(1);
  const [token, setToken] = useState("");
  const [questionLimit, setQuestionLimit] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [referenceBlobs, setReferenceBlobs] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<GameOutcome>("gave_up");
  const [reveal, setReveal] = useState<RevealResult | null>(null);
  const [draftSetup, setDraftSetup] = useState<DraftSetup>(EMPTY_DRAFT);
  const [connection, setConnection] = useState<ConnectionCheckState>(INITIAL_CONNECTION_STATE);
  const [apiKey, setApiKey] = useState("");
  const [bgmSettings, setBgmSettings] = useState<BgmSettings>(DEFAULT_BGM_SETTINGS);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [pendingEntry, setPendingEntry] = useState<PendingHistoryEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReveal, setIsLoadingReveal] = useState(false);
  const [recentRevealedNames, setRecentRevealedNames] = useState<string[]>([]);

  const hydratedRef = useRef(false);
  const testReqIdRef = useRef(0);

  const navigate = useCallback((nextPhase: GamePhase, dir: WizardDirection) => {
    setDirection(dir);
    setPhase(nextPhase);
  }, []);

  const loadRevealData = useCallback(async (activeToken: string, blobs: string[]) => {
    setIsLoadingReveal(true);
    setErrorCode(null);
    try {
      const result = await fetchReveal({
        token: activeToken,
        referenceBlobs: blobs,
      });
      setReveal(result);
      const revealedName = result.identified.name.trim();
      if (revealedName) {
        setRecentRevealedNames((prev) =>
          [revealedName, ...prev.filter((n) => n !== revealedName)].slice(0, 20),
        );
      }
    } catch (err) {
      setErrorCode(toErrorCode(err));
    } finally {
      setIsLoadingReveal(false);
    }
  }, []);

  useEffect(() => {
    const loadedKey = loadApiKey();
    setApiKey(loadedKey);
    setBgmSettings(loadBgmSettings());

    const keySignature = config.serverHasKey ? SERVER_KEY_SIGNATURE : loadedKey.trim();
    const verified = loadVerifiedConnection(keySignature);
    if (verified?.coreOk) {
      setConnection({
        isTesting: false,
        decisions: { status: "ok", ms: 0 },
        text: { status: "ok", ms: 0 },
        search: verified.searchOk ? { status: "ok", ms: 0 } : { status: "idle" },
      });
    }

    const saved = loadSession();
    if (saved) {
      const limit = saved.questionLimit ?? null;
      setPhase(saved.phase);
      setToken(saved.token);
      setHistory(saved.history);
      setReferenceBlobs(saved.referenceBlobs);
      setQuestionLimit(limit);
      setOutcome(saved.outcome ?? "gave_up");
      if (saved.phase === "result") {
        void loadRevealData(saved.token, saved.referenceBlobs);
      }
    }
    hydratedRef.current = true;
  }, [config.serverHasKey, loadRevealData]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if ((phase === "handoff" || phase === "play" || phase === "result") && token) {
      saveSession({
        phase,
        token,
        history,
        referenceBlobs,
        questionLimit,
        outcome: phase === "result" ? outcome : undefined,
      });
    } else if (phase === "landing" || phase === "mode") {
      clearSession();
    }
  }, [phase, token, history, referenceBlobs, questionLimit, outcome]);

  const activeApiKey = config.serverHasKey ? undefined : apiKey;
  const keySignature = config.serverHasKey ? SERVER_KEY_SIGNATURE : apiKey.trim();
  const questionCount = countValidQuestions(history);
  const isGuessOnly = questionLimit !== null && questionCount >= questionLimit;

  const handleApiKeyChange = useCallback((value: string) => {
    setApiKey(value);
    saveApiKey(value);
    clearVerifiedConnection();
    setConnection(INITIAL_CONNECTION_STATE);
    setErrorCode(null);
  }, []);

  const handleClearApiKey = useCallback(() => {
    setApiKey("");
    clearApiKey();
    clearVerifiedConnection();
    setConnection(INITIAL_CONNECTION_STATE);
    setErrorCode(null);
  }, []);

  const handleBgmEnabledChange = useCallback((enabled: boolean) => {
    setBgmSettings((prev) => {
      const next = { ...prev, enabled };
      saveBgmSettings(next);
      return next;
    });
  }, []);

  const handleBgmVolumeChange = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    setBgmSettings((prev) => {
      const next = { ...prev, volume: clamped };
      saveBgmSettings(next);
      return next;
    });
  }, []);

  const handleTestConnection = useCallback(async () => {
    const reqId = ++testReqIdRef.current;
    const checkSearch = draftSetup.useSearch;
    const currentSignature = keySignature;
    setErrorCode(null);
    setConnection({
      isTesting: true,
      decisions: { status: "running" },
      text: { status: "running" },
      search: checkSearch ? { status: "running" } : { status: "idle" },
    });
    try {
      const res = await runTestConnection({
        apiKey: activeApiKey,
        checkSearch,
      });
      if (testReqIdRef.current !== reqId) return;
      const decisions = probeResultToView(res.decisions);
      const text = probeResultToView(res.text);
      const search =
        checkSearch && res.search ? probeResultToView(res.search) : { status: "idle" as const };
      setConnection({
        isTesting: false,
        decisions,
        text,
        search,
      });
      if (decisions.status === "ok" && text.status === "ok") {
        saveVerifiedConnection(currentSignature, {
          coreOk: true,
          searchOk: checkSearch ? search.status === "ok" : false,
        });
      } else {
        clearVerifiedConnection();
      }
    } catch (err) {
      if (testReqIdRef.current !== reqId) return;
      const code = toErrorCode(err);
      setErrorCode(code);
      clearVerifiedConnection();
      setConnection({
        isTesting: false,
        decisions: { status: "fail", error: code },
        text: { status: "fail", error: code },
        search: checkSearch ? { status: "fail", error: code } : { status: "idle" },
      });
    }
  }, [activeApiKey, draftSetup.useSearch, keySignature]);

  const startRegisterWithDraft = useCallback(
    async (draft: DraftSetup, overrideUseSearch?: boolean) => {
      const nextUseSearch = overrideUseSearch ?? draft.useSearch;
      const confirmedLimit = draft.questionLimit;
      if (overrideUseSearch !== undefined) {
        setDraftSetup((prev) => ({ ...prev, useSearch: nextUseSearch }));
      }
      setErrorCode(null);
      navigate("starting", 1);
      try {
        const isGenre = draft.mode === "genre";
        const res = isGenre
          ? await submitGenreTopic({
              genre: draft.genre,
              useSearch: nextUseSearch,
              excludeNames: recentRevealedNames,
              apiKey: activeApiKey,
            })
          : await submitTopic({
              answer: draft.answer,
              notes: draft.notes,
              useSearch: nextUseSearch,
              apiKey: activeApiKey,
            });
        // 開始前に、平文のお題・補足・ジャンル入力をメモリから消去する
        setDraftSetup(EMPTY_DRAFT);
        setToken(res.token);
        setQuestionLimit(confirmedLimit);
        setHistory([]);
        setReferenceBlobs([]);
        setReveal(null);
        setErrorCode(null);
        navigate(isGenre ? "play" : "handoff", 1);
      } catch (err) {
        const code = toErrorCode(err);
        setErrorCode(code);
        if (code === "invalid_api_key" || code === "missing_api_key") {
          clearVerifiedConnection();
          setConnection(INITIAL_CONNECTION_STATE);
          navigate("connect", -1);
          return;
        }
        navigate(draft.mode === "genre" ? "genre" : "connect", -1);
      }
    },
    [activeApiKey, navigate, recentRevealedNames],
  );

  const handleStartRegister = useCallback(
    (overrideUseSearch?: boolean) => startRegisterWithDraft(draftSetup, overrideUseSearch),
    [draftSetup, startRegisterWithDraft],
  );

  const handleTopicNext = useCallback(
    (nextDraft: DraftSetup) => {
      setDraftSetup(nextDraft);
      setErrorCode(null);

      const hasKey = config.serverHasKey || apiKey.trim().length > 0;
      if (hasKey && isConnectionReady(connection, nextDraft.useSearch)) {
        void startRegisterWithDraft(nextDraft);
        return;
      }

      if (nextDraft.useSearch && connection.search.status === "fail") {
        setConnection((prev) => ({ ...prev, search: { status: "idle" } }));
      }
      navigate("connect", 1);
    },
    [apiKey, config.serverHasKey, connection, navigate, startRegisterWithDraft],
  );

  const handleSelectMode = useCallback(
    (selected: TopicMode) => {
      setDraftSetup((prev) => ({ ...prev, mode: selected }));
      setErrorCode(null);
      navigate(selected === "genre" ? "genre" : "intro", 1);
    },
    [navigate],
  );

  const handleBackToTopic = useCallback(() => {
    testReqIdRef.current += 1;
    setConnection((prev) => (prev.isTesting ? { ...prev, isTesting: false } : prev));
    setErrorCode(null);
    navigate(draftSetup.mode === "genre" ? "genre" : "topic", -1);
  }, [draftSetup.mode, navigate]);

  const handleRestart = useCallback(() => {
    testReqIdRef.current += 1;
    clearSession();
    setToken("");
    setQuestionLimit(null);
    setHistory([]);
    setPendingEntry(null);
    setReferenceBlobs([]);
    setOutcome("gave_up");
    setReveal(null);
    setDraftSetup(EMPTY_DRAFT);
    setErrorCode(null);
    navigate("mode", -1);
  }, [navigate]);

  const handleGuess = useCallback(
    async (guess: string): Promise<boolean> => {
      const entryId = createEntryId();
      setPendingEntry({ id: entryId, kind: "guess", text: guess });
      setIsSubmitting(true);
      setErrorCode(null);
      try {
        const res = await submitGuess({ token, guess, apiKey: activeApiKey });
        setPendingEntry(null);
        setHistory((prev) => [
          ...prev,
          {
            id: entryId,
            kind: "guess",
            text: guess,
            verdict: res.verdict,
          },
        ]);
        if (res.verdict === "correct") {
          setOutcome("correct");
          navigate("result", 1);
          void loadRevealData(token, referenceBlobs);
        }
        return true;
      } catch (err) {
        setPendingEntry(null);
        setErrorCode(toErrorCode(err));
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [activeApiKey, loadRevealData, navigate, referenceBlobs, token],
  );

  const handleChat = useCallback(
    async (message: string): Promise<boolean> => {
      if (questionLimit !== null && countValidQuestions(history) >= questionLimit) {
        return handleGuess(message);
      }
      const entryId = createEntryId();
      setPendingEntry({ id: entryId, kind: "chat", text: message });
      setIsSubmitting(true);
      setErrorCode(null);
      try {
        const res = await submitChat({
          token,
          message,
          apiKey: activeApiKey,
        });
        setPendingEntry(null);
        if (res.kind === "ask") {
          const nextEntry: HistoryEntry = {
            id: entryId,
            kind: "ask",
            text: message,
            verdict: res.verdict,
            probabilities: res.probabilities,
            searched: res.searched,
          };
          setHistory((prev) => [...prev, nextEntry]);
          if (res.referenceBlob) {
            const blob = res.referenceBlob;
            setReferenceBlobs((prev) => [...prev, blob]);
          }
        } else {
          setHistory((prev) => [
            ...prev,
            {
              id: entryId,
              kind: "guess",
              text: message,
              verdict: res.verdict,
            },
          ]);
          if (res.verdict === "correct") {
            setOutcome("correct");
            navigate("result", 1);
            void loadRevealData(token, referenceBlobs);
          }
        }
        return true;
      } catch (err) {
        setPendingEntry(null);
        setErrorCode(toErrorCode(err));
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      activeApiKey,
      handleGuess,
      history,
      loadRevealData,
      navigate,
      questionLimit,
      referenceBlobs,
      token,
    ],
  );

  const handleGiveUp = useCallback(() => {
    setOutcome("gave_up");
    navigate("result", 1);
    void loadRevealData(token, referenceBlobs);
  }, [loadRevealData, navigate, referenceBlobs, token]);

  return {
    phase,
    direction,
    history,
    pendingEntry,
    questionLimit,
    questionCount,
    isGuessOnly,
    outcome,
    reveal,
    draftSetup,
    connection,
    apiKey,
    activeApiKey,
    bgmSettings,
    errorCode,
    isSubmitting,
    isLoadingReveal,
    dismissError: () => setErrorCode(null),
    goToMode: () => navigate("mode", 1),
    backToLanding: () => navigate("landing", -1),
    handleSelectMode,
    backToMode: () => navigate("mode", -1),
    goToTopic: () => navigate("topic", 1),
    backToIntro: () => navigate("intro", -1),
    handleTopicNext,
    handleBackToTopic,
    handleApiKeyChange,
    handleClearApiKey,
    handleBgmEnabledChange,
    handleBgmVolumeChange,
    handleTestConnection,
    handleStartRegister,
    startPlay: () => navigate("play", 1),
    retryReveal: () => void loadRevealData(token, referenceBlobs),
    handleRestart,
    handleChat,
    handleGuess,
    handleGiveUp,
  };
}
