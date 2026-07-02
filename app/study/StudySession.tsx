"use client";

import type { Goal } from "@prisma/client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  goal: Goal;
  sessionId: string;
  startedAt: string;
};

const motivationalMessages = [
  "Let's finish this goal together.",
  "You're doing great.",
  "Stay focused, you're getting closer.",
  "One more step toward your dream.",
  "Hydration check! Drink some water.",
  "Your future self will thank you.",
  "You can do this.",
];

const DEFAULT_WATER_REMINDER_SECONDS = 30 * 60;
const TIMER_SAVE_SECONDS = 10;

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":");
}

export function StudySession({ goal, sessionId, startedAt }: Props) {
  const isTimerGoal = goal.goalType === "TIMER";
  const lastSavedProgress = useRef(goal.progress);
  const elapsedRef = useRef(0);
  const snoozedUntilRef = useRef<number | null>(null);
  const waterIntervalSecondsRef = useRef(DEFAULT_WATER_REMINDER_SECONDS);
  const nextWaterReminderAtRef = useRef(DEFAULT_WATER_REMINDER_SECONDS);

  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    return Math.floor(
      (Date.now() - new Date(startedAt).getTime()) / 1000
    );
  });
  const [progress, setProgress] = useState(goal.progress);
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [showWaterReminder, setShowWaterReminder] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);
  const [waterIntervalMinutes, setWaterIntervalMinutes] = useState(30);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | "unsupported">(() => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return "unsupported";
      }

      return Notification.permission;
    });
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    if (!isTimerGoal) return 0;

    const elapsed = Math.floor(
      (Date.now() - new Date(startedAt).getTime()) / 1000
    );

    return Math.max(goal.target * 60 - elapsed, 0);
  });

  const notifyWaterReminder = useCallback(() => {
    setShowWaterReminder(true);

    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationPermission("granted");

      try {
        new Notification("Water Reminder", {
          body: "Time to drink some water!",
          tag: "water-reminder",
        });
      } catch {
        // Some browsers can still reject notifications in restricted contexts.
      }

      return;
    }

    setNotificationPermission(Notification.permission);
  }, []);

  const checkWaterReminder = useCallback(() => {
    const elapsed = elapsedRef.current;
    const waterIntervalSeconds = waterIntervalSecondsRef.current;

    if (
      elapsed === 0 ||
      elapsed < nextWaterReminderAtRef.current ||
      (snoozedUntilRef.current !== null &&
        Date.now() < snoozedUntilRef.current)
    ) {
      return;
    }

    notifyWaterReminder();

    while (nextWaterReminderAtRef.current <= elapsed) {
      nextWaterReminderAtRef.current += waterIntervalSeconds;
    }
  }, [notifyWaterReminder]);

  const timerProgressForElapsed = useCallback(
    (seconds: number) => {
      if (!isTimerGoal) {
        return goal.progress;
      }

      const elapsedMinutes = Math.ceil(seconds / 60);

      return Math.min(
        Math.max(goal.progress + elapsedMinutes, 0),
        goal.target,
      );
    },
    [goal.progress, goal.target, isTimerGoal],
  );

  const saveTimerProgress = useCallback(
    async (seconds: number, keepalive = false) => {
      if (!isTimerGoal || seconds <= 0) {
        return;
      }

      const nextProgress = timerProgressForElapsed(seconds);

      if (nextProgress <= lastSavedProgress.current) {
        return;
      }

      const response = await fetch(`/api/goals/${goal.id}/progress`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "set",
          progress: nextProgress,
        }),
        keepalive,
      });

      if (!response.ok) {
        throw new Error("Unable to save timer progress");
      }

      lastSavedProgress.current = nextProgress;
      await response.json().catch(() => null);
    },
    [goal.id, isTimerGoal, timerProgressForElapsed],
  );

  async function requestNotifications() {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - new Date(startedAt).getTime()) / 1000
      );

      elapsedRef.current = elapsed;
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [startedAt]);

  useEffect(() => {
    elapsedRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((previousIndex) => (
        previousIndex + 1
      ) % motivationalMessages.length);
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isTimerGoal) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - new Date(startedAt).getTime()) / 1000
      );

      setRemainingSeconds(
        Math.max(goal.target * 60 - elapsed, 0)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, goal.target, isTimerGoal]);

  useEffect(() => {
    if (
      !isTimerGoal ||
      elapsedSeconds === 0 ||
      elapsedSeconds % TIMER_SAVE_SECONDS !== 0
    ) {
      return;
    }

    saveTimerProgress(elapsedSeconds).catch(() => undefined);
  }, [elapsedSeconds, isTimerGoal, saveTimerProgress]);

  useEffect(() => {
    if (!isTimerGoal || remainingSeconds !== 0) {
      return;
    }

    saveTimerProgress(elapsedSeconds).catch(() => undefined);
  }, [elapsedSeconds, isTimerGoal, remainingSeconds, saveTimerProgress]);

  useEffect(() => {
    if (!isTimerGoal) {
      return;
    }

    const saveBeforeLeaving = () => {
      saveTimerProgress(elapsedRef.current, true).catch(() => undefined);
    };

    window.addEventListener("pagehide", saveBeforeLeaving);
    document.addEventListener("visibilitychange", saveBeforeLeaving);

    return () => {
      window.removeEventListener("pagehide", saveBeforeLeaving);
      document.removeEventListener("visibilitychange", saveBeforeLeaving);
    };
  }, [isTimerGoal, saveTimerProgress]);

  useEffect(() => {
    snoozedUntilRef.current = snoozedUntil;
  }, [snoozedUntil]);

  useEffect(() => {
    const waterIntervalSeconds = waterIntervalMinutes * 60;
    const elapsed = elapsedRef.current;

    waterIntervalSecondsRef.current = waterIntervalSeconds;
    nextWaterReminderAtRef.current =
      Math.floor(elapsed / waterIntervalSeconds) * waterIntervalSeconds +
      waterIntervalSeconds;
  }, [waterIntervalMinutes]);

  useEffect(() => {
    checkWaterReminder();

    const interval = window.setInterval(() => {
      checkWaterReminder();
    }, 1000);

    return () => window.clearInterval(interval);
  }, [checkWaterReminder]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkWaterReminder();
      }
    };

    window.addEventListener("focus", checkWaterReminder);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", checkWaterReminder);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [checkWaterReminder]);

  const displayedProgress = isTimerGoal
    ? timerProgressForElapsed(elapsedSeconds)
    : progress;

  const percentage =
    goal.target > 0
      ? Math.min(Math.max((displayedProgress / goal.target) * 100, 0), 100)
      : 0;

  async function updateProgress(action: "increment" | "decrement") {
    setError("");
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/goals/${goal.id}/progress`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to update progress");
      }

      const updatedGoal: Goal = await response.json();
      setProgress(updatedGoal.progress);
    } catch {
      setError("Could not update progress.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function endSession() {
    setError("");
    setIsUpdating(true);

    try {
      if (isTimerGoal) {
        await saveTimerProgress(elapsedSeconds);
        setProgress(timerProgressForElapsed(elapsedSeconds));
      }

      const response = await fetch(`/api/study-session/${sessionId}`, {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Unable to end session");
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Could not end session. Please try again.");
      setIsUpdating(false);
    }
  }

  function snoozeWaterReminder() {
    setSnoozedUntil(Date.now() + 10 * 60 * 1000);
    setShowWaterReminder(false);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
        Active Session
      </p>

      <div className="mt-4 flex items-center gap-3">
        <label htmlFor="water-reminder" className="text-sm font-medium">
          Water Reminder
        </label>
        <select
          id="water-reminder"
          value={waterIntervalMinutes}
          onChange={(event) => {
            setWaterIntervalMinutes(Number(event.target.value));
          }}
          className="rounded border border-slate-300 p-2 text-sm"
        >
          <option value={15}>Every 15 mins</option>
          <option value={30}>Every 30 mins</option>
          <option value={45}>Every 45 mins</option>
          <option value={60}>Every 60 mins</option>
        </select>
      </div>

      {notificationPermission !== "granted" ? (
        <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p>
            Browser notification popups are {notificationPermission === "denied"
              ? "blocked"
              : "not enabled"}.
          </p>
          {notificationPermission === "default" ? (
            <button
              type="button"
              onClick={requestNotifications}
              className="mt-3 rounded bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700"
            >
              Enable Notifications
            </button>
          ) : null}
          {notificationPermission === "denied" ? (
            <p className="mt-2">
              Enable notifications for this site in your browser settings to see popups.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col items-center">
        <Image
          src="/v-avatar.jpg"
          alt="Study Companion"
          width={220}
          height={220}
          className="rounded-full border-4 border-pink-300 shadow-lg"
        />

        <p className="mt-4 text-center text-lg font-medium text-slate-700">
          {motivationalMessages[messageIndex]}
        </p>
      </div>

      <div className="mt-8 text-center">
        <h1 className="text-3xl font-bold text-slate-950">{goal.title}</h1>

        <p className="mt-2 text-lg text-slate-700">
          {goal.goalType === "QUESTIONS"
            ? "Questions Solved"
          : goal.goalType === "CHAPTER"
              ? "Chapters Completed"
              : "Focus Minutes"}
          : {displayedProgress} / {goal.target}
        </p>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm uppercase text-slate-500">
          {isTimerGoal ? "Time Remaining" : "Session Duration"}
        </p>

        <p className="mt-2 font-mono text-5xl font-bold text-slate-950">
          {isTimerGoal ? formatDuration(remainingSeconds) : formatDuration(elapsedSeconds)}
        </p>
      </div>

      <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-600"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      {!isTimerGoal ? (
        <div className="mt-6 flex justify-center gap-4">
          <button
            type="button"
            disabled={isUpdating || progress >= goal.target}
            onClick={() => updateProgress("increment")}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isUpdating ? "Updating..." : "+1 Progress"}
          </button>

          <button
            type="button"
            disabled={isUpdating || progress <= 0}
            onClick={() => updateProgress("decrement")}
            className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {isUpdating ? "Updating..." : "-1 Progress"}
          </button>
        </div>
      ) : null}

      {showWaterReminder ? (
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
          <p className="font-medium text-blue-950">Time to drink some water.</p>
          <button
            type="button"
            onClick={snoozeWaterReminder}
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Snooze
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-center text-red-600">{error}</p>
      ) : null}

      <div className="mt-10 flex justify-center">
        <button
          type="button"
          disabled={isUpdating}
          onClick={endSession}
          className="rounded-lg bg-red-500 px-8 py-3 font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
        >
          {isUpdating ? "Ending..." : "End Session"}
        </button>
      </div>
    </section>
  );
}
