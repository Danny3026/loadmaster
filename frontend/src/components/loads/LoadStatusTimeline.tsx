import React from 'react';

export interface TimelineEvent {
  id: string;
  status: string;
  date: string;
  location?: string;
  description: string;
  isCompleted: boolean;
}

interface LoadStatusTimelineProps {
  events: TimelineEvent[];
  isLoading?: boolean;
}

export const LoadStatusTimeline: React.FC<LoadStatusTimelineProps> = ({ events, isLoading = false }) => {
  if (isLoading) {
    return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-gray-200 rounded w-3/4"></div><div className="h-4 bg-gray-200 rounded"></div></div></div>;
  }

  if (!events || events.length === 0) {
    return <div className="text-gray-500 text-sm">No status updates available.</div>;
  }

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {events.map((event, eventIdx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {eventIdx !== events.length - 1 ? (
                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${event.isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium text-gray-900">{event.status}</span>{' '}
                      {event.location && `at ${event.location}`}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                  </div>
                  <div className="whitespace-nowrap text-right text-sm text-gray-500">
                    <time dateTime={event.date}>{new Date(event.date).toLocaleString()}</time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
