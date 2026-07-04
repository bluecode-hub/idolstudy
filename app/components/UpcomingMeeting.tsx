"use client";

import type { calendar_v3 } from "googleapis";
import { useEffect, useState } from "react";

function meetingKey(meeting: calendar_v3.Schema$Event) {
  return meeting.id ?? meeting.etag ?? meeting.summary ?? "meeting";
}

function meetingJoinLink(meeting: calendar_v3.Schema$Event) {
  return (
    meeting.hangoutLink ??
    meeting.conferenceData?.entryPoints?.find(
      (entryPoint) => entryPoint.entryPointType === "video" && entryPoint.uri,
    )?.uri ??
    undefined
  );
}

export default function UpcomingMeetings() {
  const [meetings, setMeetings] = useState<calendar_v3.Schema$Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/calendar")
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error ?? "Unable to load upcoming meetings.");
        }

        if (!Array.isArray(data)) {
          throw new Error("Unable to load upcoming meetings.");
        }

        setMeetings(data);
      })
      .catch((caughtError: unknown) => {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load upcoming meetings.",
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <section className="mb-8 mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-slate-950">
        Upcoming Meetings
      </h2>

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-600">Loading meetings...</p>
      ) : null}

      {!isLoading && error ? (
        <p className="mt-4 text-sm text-slate-600">{error}</p>
      ) : null}

      {!isLoading && !error && meetings.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No upcoming meetings found.</p>
      ) : null}

      <div className="mt-4 space-y-3">
        {meetings.map((meeting) => {
          const meetLink = meetingJoinLink(meeting);
          const startDate = meeting.start?.dateTime ?? meeting.start?.date;

          return (
            <div
              key={meetingKey(meeting)}
              className="rounded-lg border border-slate-200 p-4"
            >
              <h3 className="font-semibold text-slate-950">
                {meeting.summary ?? "Upcoming meeting"}
              </h3>

              <p className="mt-1 text-sm text-slate-600">
                {startDate
                  ? new Date(startDate).toLocaleString()
                  : "Time not available"}
              </p>

              {meetLink ? (
                <a
                  href={meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                >
                  Join Now
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
