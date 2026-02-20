export interface MockFeedback {
  title: string;
  status: { name: string; color: string };
  tags: Array<{ id: string; name: string; color: string }>;
  commentCount: number;
  timeAgo: string;
  upvotes: number;
  downvotes: number;
}

export const MOCK: MockFeedback = {
  title: "Add keyboard shortcuts for common actions",
  status: { name: "Planned", color: "blue" },
  tags: [
    { id: "1", name: "UX", color: "purple" },
    { id: "2", name: "Feature", color: "green" },
  ],
  commentCount: 7,
  timeAgo: "3 days ago",
  upvotes: 24,
  downvotes: 3,
};

export const MOCK_VOTERS = ["AS", "JD", "MK", "RL", "TS"];

export const MOCK_LIST: readonly MockFeedback[] = [
  MOCK,
  {
    title: "Dark mode support for the dashboard",
    status: { name: "In Progress", color: "amber" },
    tags: [{ id: "3", name: "Design", color: "pink" }],
    commentCount: 12,
    timeAgo: "1 day ago",
    upvotes: 41,
    downvotes: 2,
  },
  {
    title: "Export feedback data as CSV",
    status: { name: "Under Review", color: "purple" },
    tags: [{ id: "4", name: "Data", color: "blue" }],
    commentCount: 3,
    timeAgo: "5 days ago",
    upvotes: 8,
    downvotes: 1,
  },
];
