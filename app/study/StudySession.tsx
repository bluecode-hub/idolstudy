"use client";

import type { Goal, Medicine } from "@prisma/client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  goal: Goal;
  sessionId: string;
  startedAt: string;
  medicines: Medicine[];
};

type NotificationState = NotificationPermission | "unsupported";
type FocusStatus = "idle" | "connecting" | "enabled" | "unavailable" | "error";
type ChromeRuntimeResponse = {
  success?: boolean;
  error?: string;
};
type ChromeRuntime = {
  lastError?: {
    message?: string;
  };
  sendMessage: (
    extensionId: string,
    message: Record<string, unknown>,
    response?: (response?: ChromeRuntimeResponse) => void,
  ) => void;
};

type WindowWithChrome = Window & {
  chrome?: {
    runtime?: ChromeRuntime;
  };
};
type CalendarMeeting = {
  id: string;
  summary?: string;
  hangoutLink?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
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

const DEFAULT_WATER_REMINDER_MINUTES = 30;
const SNOOZE_MINUTES = 10;
const TIMER_SAVE_SECONDS = 10;
const FOCUS_EXTENSION_ID =
  process.env.NEXT_PUBLIC_FOCUS_EXTENSION_ID?.trim() ||
  "bnbbomhbhjaaedfpbafcnpjcmdnpnpom";

function medicineSnoozeStorageKey(sessionId: string) {
  return `idolstudy:medicine-snoozes:${sessionId}`;
}

function formatDuration(totalSeconds: number) {
  const boundedSeconds = Math.max(Math.floor(totalSeconds), 0);
  const hours = Math.floor(boundedSeconds / 3600);
  const minutes = Math.floor((boundedSeconds % 3600) / 60);
  const seconds = boundedSeconds % 60;

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":");
}

function formatShortDuration(totalSeconds: number) {
  const boundedSeconds = Math.max(Math.ceil(totalSeconds), 0);
  const hours = Math.floor(boundedSeconds / 3600);
  const minutes = Math.floor((boundedSeconds % 3600) / 60);
  const seconds = boundedSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function notificationState(): NotificationState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

function showBrowserNotification(title: string, body: string, tag: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  try {
    new Notification(title, {
      body,
      tag,
    });
  } catch {
    // Some browsers reject notifications in restricted contexts.
  }
}

function reminderTimeTodayMs(reminderAt: string, nowMs: number) {
  const [hours, minutes] = reminderAt.split(":").map(Number);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const reminderTime = new Date(nowMs);
  reminderTime.setHours(hours, minutes, 0, 0);
  return reminderTime.getTime();
}

function medicineLabel(medicine: Medicine) {
  const name = medicine.name.trim();

  if (!name || /^\d+$/.test(name)) {
    return "Medicine reminder";
  }

  return name;
}

export function StudySession({ goal, sessionId, startedAt, medicines }: Props) {
  const isTimerGoal = goal.goalType === "TIMER";
  const startedAtMs = useMemo(() => new Date(startedAt).getTime(), [startedAt]);
  const lastSavedProgress = useRef(goal.progress);
  const elapsedRef = useRef(0);

  const [nowMs, setNowMs] = useState(startedAtMs);
  const [progress, setProgress] = useState(goal.progress);
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [showWaterReminder, setShowWaterReminder] = useState(false);
  const [waterIntervalMinutes, setWaterIntervalMinutes] = useState(
    DEFAULT_WATER_REMINDER_MINUTES,
  );
  const [nextWaterDueAt, setNextWaterDueAt] = useState(
    () => startedAtMs + DEFAULT_WATER_REMINDER_MINUTES * 60 * 1000,
  );
  const [showReminders, setShowReminders] = useState(true);
  const [activeMedicine, setActiveMedicine] = useState<Medicine | null>(null);
  const [takenMedicineIds, setTakenMedicineIds] = useState(
    () => new Set(medicines.filter((medicine) => medicine.takenToday).map((medicine) => medicine.id)),
  );
  const [medicineSnoozes, setMedicineSnoozes] = useState<Record<string, number>>({});
  const [medicineSnoozesLoaded, setMedicineSnoozesLoaded] = useState(false);
  const [shownMedicineIds, setShownMedicineIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationState>("unsupported");
  const [focusStatus, setFocusStatus] = useState<FocusStatus>("idle");
  const [focusMessage, setFocusMessage] = useState("");

  const elapsedSeconds = Math.max(Math.floor((nowMs - startedAtMs) / 1000), 0);
  const remainingSeconds = isTimerGoal
    ? Math.max(goal.target * 60 - elapsedSeconds, 0)
    : 0;
  const [meetings, setMeetings] = useState<CalendarMeeting[]>([]);
  useEffect(()=>{
    fetch("/api/calender")
    .then((res)=>res.json())
    .then(setMeetings);
  },[]);

  const [meetingPopup,setMeetingPopup]=useState<CalendarMeeting | null>(null);
  const[snoozedMeetings,setSnoozedMeetings]=useState<string[]>([]);

  const timerProgressForElapsed = useCallback(
    (seconds: number) => {
      if (!isTimerGoal) {
        return goal.progress;
      }

      const elapsedMinutes = Math.ceil(seconds / 60);

      return Math.min(Math.max(goal.progress + elapsedMinutes, 0), goal.target);
    },
    [goal.progress, goal.target, isTimerGoal],
  );

  const pendingMedicines = medicines.filter(
    (medicine) => !takenMedicineIds.has(medicine.id),
  );
  const futureMedicineReminders = pendingMedicines
    .map((medicine) => {
      const snoozedUntil = medicineSnoozes[medicine.id];
      const reminderAtMs = reminderTimeTodayMs(medicine.reminderAt, nowMs);
      const dueAt = snoozedUntil ?? reminderAtMs ?? Number.POSITIVE_INFINITY;

      return {
        medicine,
        dueAt,
      };
    })
    .filter(({ dueAt }) => dueAt >= nowMs)
    .sort((first, second) => first.dueAt - second.dueAt)[0];
  const nextMedicineReminder = futureMedicineReminders;
  const displayedProgress = isTimerGoal
    ? timerProgressForElapsed(elapsedSeconds)
    : progress;
  const percentage =
    goal.target > 0
      ? Math.min(Math.max((displayedProgress / goal.target) * 100, 0), 100)
      : 0;
  const waterRemainingSeconds = (nextWaterDueAt - nowMs) / 1000;
  const medicineRemainingSeconds = nextMedicineReminder
    ? (nextMedicineReminder.dueAt - nowMs) / 1000
    : null;
  const medicineReminderText = nextMedicineReminder
    ? medicineRemainingSeconds !== null && medicineRemainingSeconds <= 0
      ? `${medicineLabel(nextMedicineReminder.medicine)} is due now`
      : `${medicineLabel(nextMedicineReminder.medicine)} in ${formatShortDuration(
          medicineRemainingSeconds ?? 0,
        )}`
    : "No pending medicine reminders.";

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

  function saveMedicineSnoozes(nextSnoozes: Record<string, number>) {
    try {
      window.localStorage.setItem(
        medicineSnoozeStorageKey(sessionId),
        JSON.stringify(nextSnoozes),
      );
    } catch {
      // Storage can be unavailable in private or restricted browser modes.
    }
  }

  async function requestNotifications() {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }
  useEffect(()=>{
    const interval=setInterval(()=>{
      meetings.forEach((meeting)=>{
        if(snoozedMeetings.includes(meeting.id))
          return;
        const startDate = meeting.start?.dateTime ?? meeting.start?.date;

        if (!startDate) {
          return;
        }

        const startTime=new Date(startDate).getTime();

        if (!Number.isFinite(startTime)) {
          return;
        }

        const difference=startTime-Date.now();
        const minutes=Math.floor(difference/1000/60);
        if(minutes===5){
          setMeetingPopup(meeting);
        if(Notification.permission==="granted"){
          new Notification(
            "Meeting Reminder",
            {
              body:
              `${meeting.summary} starts in 5 minutes`,
            }

          );
        }
        }
      });
    },60000);
    return ()=>clearInterval(interval);
  },[meetings,snoozedMeetings]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setNowMs(Date.now());
      setNotificationPermission(notificationState());

      try {
        const rawSnoozes = window.localStorage.getItem(
          medicineSnoozeStorageKey(sessionId),
        );

        if (!rawSnoozes) {
          setMedicineSnoozesLoaded(true);
          return;
        }

        const parsedSnoozes = JSON.parse(rawSnoozes) as Record<string, unknown>;
        const validSnoozes = Object.fromEntries(
          Object.entries(parsedSnoozes).filter(([, snoozedUntil]) => (
            typeof snoozedUntil === "number" &&
            Number.isFinite(snoozedUntil)
          )),
        ) as Record<string, number>;

        setMedicineSnoozes(validSnoozes);
      } catch {
        window.localStorage.removeItem(medicineSnoozeStorageKey(sessionId));
      } finally {
        setMedicineSnoozesLoaded(true);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [sessionId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextNow = Date.now();
      elapsedRef.current = Math.max(Math.floor((nextNow - startedAtMs) / 1000), 0);
      setNowMs(nextNow);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [startedAtMs]);

  useEffect(() => {
    elapsedRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex(
        (previousIndex) => (previousIndex + 1) % motivationalMessages.length,
      );
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isTimerGoal || elapsedSeconds === 0 || elapsedSeconds % TIMER_SAVE_SECONDS !== 0) {
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
    if (showWaterReminder || nowMs < nextWaterDueAt) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowWaterReminder(true);
      setNotificationPermission(notificationState());
      showBrowserNotification(
        "Water Reminder",
        "Time to drink some water.",
        "water-reminder",
      );
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [nextWaterDueAt, nowMs, showWaterReminder]);

  useEffect(() => {
    if (!medicineSnoozesLoaded || activeMedicine) {
      return;
    }

    const dueMedicine = pendingMedicines.find((medicine) => {
      const snoozedUntil = medicineSnoozes[medicine.id];

      if (snoozedUntil) {
        return nowMs >= snoozedUntil;
      }

      const reminderAtMs = reminderTimeTodayMs(medicine.reminderAt, nowMs);

      if (reminderAtMs === null || shownMedicineIds.has(medicine.id)) {
        return false;
      }

      return nowMs >= reminderAtMs && nowMs < reminderAtMs + 60 * 1000;
    });

    if (!dueMedicine) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setActiveMedicine(dueMedicine);
      setShownMedicineIds((previousIds) => new Set(previousIds).add(dueMedicine.id));
      setNotificationPermission(notificationState());
      showBrowserNotification(
        `Medicine: ${dueMedicine.name}`,
        `Time to take ${dueMedicine.dosage || dueMedicine.name}.`,
        `medicine-${dueMedicine.id}`,
      );
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [
    activeMedicine,
    medicineSnoozes,
    medicineSnoozesLoaded,
    nowMs,
    pendingMedicines,
    shownMedicineIds,
  ]);

  useEffect(() => {
    const onFocus = () => setNowMs(Date.now());
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setNowMs(Date.now());
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

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
    setNextWaterDueAt(Date.now() + SNOOZE_MINUTES * 60 * 1000);
    setShowWaterReminder(false);
  }

  function finishWaterReminder() {
    setNextWaterDueAt(Date.now() + waterIntervalMinutes * 60 * 1000);
    setShowWaterReminder(false);
  }

  async function markMedicineTaken() {
    if (!activeMedicine) {
      return;
    }

    const medicineId = activeMedicine.id;
    setError("");

    try {
      const response = await fetch(`/api/medicine/${medicineId}/taken`, {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Unable to update medicine");
      }

      setTakenMedicineIds((previousIds) => new Set(previousIds).add(medicineId));
      setMedicineSnoozes((previousSnoozes) => {
        const nextSnoozes = { ...previousSnoozes };
        delete nextSnoozes[medicineId];
        saveMedicineSnoozes(nextSnoozes);
        return nextSnoozes;
      });
      setActiveMedicine(null);
    } catch {
      setError("Could not mark this medicine as taken.");
    }
  }

  function snoozeMedicine() {
    if (!activeMedicine) {
      return;
    }

    const medicineId = activeMedicine.id;
    setMedicineSnoozes((previousSnoozes) => {
      const nextSnoozes = {
        ...previousSnoozes,
        [medicineId]: Date.now() + SNOOZE_MINUTES * 60 * 1000,
      };
      saveMedicineSnoozes(nextSnoozes);
      return nextSnoozes;
    });
    setActiveMedicine(null);
  }
  async function enableFocusMode() {
    setFocusStatus("connecting");
    setFocusMessage("");

    const chromeRuntime = (window as WindowWithChrome).chrome?.runtime;

    if (!chromeRuntime?.sendMessage) {
      setFocusStatus("unavailable");
      setFocusMessage("Install and enable the Idol Focus extension in Chrome first.");
      return;
    }

    const remaining = isTimerGoal
      ? `${formatShortDuration(remainingSeconds)} remaining`
      : `${displayedProgress}/${goal.target} complete`;

    try {
      const response = await new Promise<ChromeRuntimeResponse | undefined>((resolve) => {
        chromeRuntime.sendMessage(
          FOCUS_EXTENSION_ID,
          {
            type: "ENABLE_FOCUS",
            sessionId,
            goalTitle: goal.title,
            remaining,
            sessionUrl: window.location.href,
          },
          (messageResponse) => {
            const lastErrorMessage = chromeRuntime.lastError?.message;

            if (lastErrorMessage) {
              resolve({
                success: false,
                error: lastErrorMessage,
              });
              return;
            }

            resolve(messageResponse);
          },
        );
      });

      if (!response?.success) {
        throw new Error(response?.error || "The Idol Focus extension did not respond.");
      }

      setFocusStatus("enabled");
      setFocusMessage("Focus mode is enabled for this study session.");
    } catch (focusError) {
      setFocusStatus("error");
      setFocusMessage(
        focusError instanceof Error
          ? focusError.message
          : "Could not enable focus mode.",
      );
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
        Active Session
      </p>

      <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label htmlFor="water-reminder" className="text-sm font-semibold text-slate-800">
            Water reminder
          </label>
          <p className="mt-1 text-sm text-slate-600">
            Next alert in {formatShortDuration(waterRemainingSeconds)}.
          </p>
        </div>

        <select
          id="water-reminder"
          value={waterIntervalMinutes}
          onChange={(event) => {
            const minutes = Number(event.target.value);
            setWaterIntervalMinutes(minutes);
            setNextWaterDueAt(Date.now() + minutes * 60 * 1000);
            setShowWaterReminder(false);
          }}
          className="rounded border border-slate-300 bg-white p-2 text-sm"
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
            Browser notification popups are{" "}
            {notificationPermission === "denied" ? "blocked" : "not enabled"}.
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

      <div className="mt-6 flex flex-col items-center gap-2">
        <button
          type="button"
          disabled={focusStatus === "connecting"}
          onClick={enableFocusMode}
          className="rounded-lg bg-purple-600 px-5 py-2.5 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
        >
          {focusStatus === "connecting" ? "Enabling Focus..." : "Enable Focus Mode"}
        </button>
        {focusMessage ? (
          <p
            className={`text-center text-sm ${
              focusStatus === "enabled" ? "text-green-700" : "text-amber-700"
            }`}
          >
            {focusMessage}
          </p>
        ) : null}
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

      <div className="mt-8 rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-950">Remaining Time</h2>
          <button
            type="button"
            onClick={() => setShowReminders((previous) => !previous)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {showReminders ? "Hide" : "Show"}
          </button>
        </div>

        {showReminders ? (
          <div className="mt-4 space-y-4 text-sm text-slate-700">
            <p>Water in {formatShortDuration(waterRemainingSeconds)}</p>
            <p>{medicineReminderText}</p>

            {nextMedicineReminder ? (
              <p className="font-semibold text-slate-900">
                Dose: {nextMedicineReminder.medicine.dosage || "1"}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {showWaterReminder ? (
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
          <p className="font-medium text-blue-950">Time to drink some water.</p>
          <div className="mt-3 flex justify-center gap-3">
            <button
              type="button"
              onClick={finishWaterReminder}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Done
            </button>
            <button
              type="button"
              onClick={snoozeWaterReminder}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300"
            >
              Snooze 10 mins
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-center text-red-600">{error}</p> : null}

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

      {activeMedicine ? (
        <div className="fixed left-1/2 top-6 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-green-300 bg-green-50 p-5 shadow-xl sm:left-6 sm:w-96 sm:translate-x-0">
          <h2 className="text-xl font-bold text-green-800">Medicine Reminder</h2>
          <p className="mt-2 text-green-700">Time to take:</p>
          <p className="font-semibold text-slate-950">{activeMedicine.name}</p>
          {activeMedicine.dosage ? (
            <p className="text-slate-700">{activeMedicine.dosage}</p>
          ) : null}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={markMedicineTaken}
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Taken
            </button>

            <button
              type="button"
              onClick={snoozeMedicine}
              className="rounded bg-gray-200 px-4 py-2 text-slate-800 hover:bg-gray-300"
            >
              Snooze 10 mins
            </button>
          </div>
        </div>
      ) : null}
      {meetingPopup ? (
        <div className="fixed bottom-6 right-6 w-96 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl z-50">
          <h2 className="text-xl font-bold">Meeting Reminder</h2>

          <p className="mt-3">{meetingPopup.summary}</p>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => window.open(meetingPopup.hangoutLink, "_blank")}
              className="rounded bg-green-600 px-4 py-2 text-white"
            >
              Join Meet
            </button>

            <button
              type="button"
              onClick={() => {
                setSnoozedMeetings([...snoozedMeetings, meetingPopup.id]);

                setTimeout(() => {
                  setSnoozedMeetings((previous) => previous.filter((id) => id !== meetingPopup.id));
                }, 5 * 60 * 1000);

                setMeetingPopup(null);
              }}
              className="rounded bg-gray-300 px-4 py-2"
            >
              Snooze 5 mins
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
