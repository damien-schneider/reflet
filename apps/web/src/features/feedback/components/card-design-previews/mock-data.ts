export interface MockFeedback {
  commentCount: number;
  downvotes: number;
  status: { name: string; color: string };
  tags: Array<{ id: string; name: string; color: string }>;
  timeAgo: string;
  title: string;
  upvotes: number;
}

export const MOCK: MockFeedback = {
  commentCount: 7,
  downvotes: 3,
  status: { color: "blue", name: "Planned" },
  tags: [
    { color: "purple", id: "1", name: "UX" },
    { color: "green", id: "2", name: "Feature" },
  ],
  timeAgo: "3 days ago",
  title: "Add keyboard shortcuts for common actions",
  upvotes: 24,
};

export const MOCK_VOTERS = ["AS", "JD", "MK", "RL", "TS"];

export const MOCK_LIST: readonly MockFeedback[] = [
  MOCK,
  {
    commentCount: 12,
    downvotes: 2,
    status: { color: "amber", name: "In Progress" },
    tags: [{ color: "pink", id: "3", name: "Design" }],
    timeAgo: "1 day ago",
    title: "Dark mode support for the dashboard",
    upvotes: 41,
  },
  {
    commentCount: 3,
    downvotes: 1,
    status: { color: "purple", name: "Under Review" },
    tags: [{ color: "blue", id: "4", name: "Data" }],
    timeAgo: "5 days ago",
    title: "Export feedback data as CSV",
    upvotes: 8,
  },
];
