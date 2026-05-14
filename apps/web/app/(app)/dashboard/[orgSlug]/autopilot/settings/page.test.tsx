import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toOrgId } from "@/lib/convex-helpers";
import AutopilotSettingsPage from "./page";

type ResetScopeForTest = Array<{
  description: string;
  items: string[];
  title: string;
}>;

interface DangerZonePropsForTest {
  isResetting: boolean;
  onReset: () => void;
  resetScope: ResetScopeForTest | undefined;
}

const { mockDangerZoneRender, mockToastError, mockUseQuery, mutationHandlers } =
  vi.hoisted(() => ({
    mockDangerZoneRender: vi.fn(),
    mockToastError: vi.fn(),
    mockUseQuery: vi.fn(),
    mutationHandlers: new Map<string, ReturnType<typeof vi.fn>>(),
  }));

vi.mock("convex/react", () => ({
  useMutation: (mutation: string) => {
    const handler = mutationHandlers.get(mutation);
    if (!handler) {
      throw new Error(`Unhandled mutation: ${mutation}`);
    }
    return handler;
  },
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    autopilot: {
      mutations: {
        config: {
          initConfig: "autopilot.config.initConfig",
          updateConfig: "autopilot.config.updateConfig",
          upsertCredentials: "autopilot.config.upsertCredentials",
        },
        routines: {
          getResetScope: "autopilot.routines.getResetScope",
          resetAllData: "autopilot.routines.resetAllData",
        },
      },
      queries: {
        config: {
          getConfig: "autopilot.config.getConfig",
        },
      },
    },
    billing: {
      queries: {
        getStatus: "billing.getStatus",
      },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: vi.fn(),
  },
}));

vi.mock("@/features/autopilot/components/autopilot-context", () => ({
  useAutopilotContext: () => ({
    isAdmin: true,
    organizationId: toOrgId("org_123"),
    orgSlug: "acme",
  }),
}));

vi.mock("@/features/autopilot/components/settings/billing-section", () => ({
  BillingSection: () => null,
  BillingSectionSkeleton: () => null,
  BillingUnavailableSection: () => null,
}));

vi.mock("@/features/autopilot/components/settings/budget-settings", () => ({
  BudgetSettings: () => null,
}));

vi.mock("@/features/autopilot/components/settings/danger-zone", () => ({
  DangerZone: (props: DangerZonePropsForTest) => {
    mockDangerZoneRender(props);
    return <div data-testid="danger-zone" />;
  },
}));

const config = {
  _id: "config_123",
  adapter: "builtin",
  dailyCostCapUsd: 25,
  emailDailyLimit: 20,
  maxTasksPerDay: 5,
  perAgentDailyCapUsd: undefined,
};

const resetScope = [
  {
    title: "Execution history",
    description: "Tasks and their run records.",
    items: ["Tasks", "Runs"],
  },
];

function renderSettingsPage() {
  render(<AutopilotSettingsPage />);
}

beforeEach(() => {
  mutationHandlers.set("autopilot.config.initConfig", vi.fn());
  mutationHandlers.set("autopilot.config.updateConfig", vi.fn());
  mutationHandlers.set("autopilot.config.upsertCredentials", vi.fn());
  mutationHandlers.set("autopilot.routines.resetAllData", vi.fn());
  mockUseQuery.mockImplementation((queryName: unknown) => {
    if (queryName === "autopilot.config.getConfig") {
      return config;
    }
    if (queryName === "billing.getStatus") {
      return { tier: "pro" };
    }
    if (queryName === "autopilot.routines.getResetScope") {
      return resetScope;
    }
    return undefined;
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mutationHandlers.clear();
});

describe("AutopilotSettingsPage", () => {
  it("does not call initialization for non-pro organizations", async () => {
    const initConfig = vi.fn(() => Promise.resolve("config_123"));
    mutationHandlers.set("autopilot.config.initConfig", initConfig);
    mockUseQuery.mockImplementation((queryName: unknown) => {
      if (queryName === "autopilot.config.getConfig") {
        return null;
      }
      if (queryName === "billing.getStatus") {
        return { tier: "free" };
      }
      return undefined;
    });

    await renderSettingsPage();

    expect(
      screen.queryByRole("button", { name: /initialize autopilot/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText("Autopilot requires Pro")).toBeInTheDocument();
    expect(initConfig).not.toHaveBeenCalled();
  });

  it("locks existing settings when billing access is no longer Pro", async () => {
    const updateConfig = vi.fn(() => Promise.resolve(null));
    mutationHandlers.set("autopilot.config.updateConfig", updateConfig);
    mockUseQuery.mockImplementation((queryName: unknown) => {
      if (queryName === "autopilot.config.getConfig") {
        return config;
      }
      if (queryName === "billing.getStatus") {
        return { tier: "free" };
      }
      if (queryName === "autopilot.routines.getResetScope") {
        return resetScope;
      }
      return undefined;
    });

    await renderSettingsPage();
    const input = screen.getByLabelText("Maximum tasks per day");

    expect(screen.getByText("Autopilot requires Pro")).toBeInTheDocument();
    expect(input).toBeDisabled();
    fireEvent.change(input, { target: { value: "8" } });
    fireEvent.blur(input);

    expect(updateConfig).not.toHaveBeenCalled();
    expect(screen.queryByTestId("danger-zone")).not.toBeInTheDocument();
  });

  it("saves exponent integer limits as the entered numeric value", async () => {
    const updateConfig = vi.fn(() => Promise.resolve(null));
    mutationHandlers.set("autopilot.config.updateConfig", updateConfig);

    await renderSettingsPage();
    const input = screen.getByLabelText("Maximum tasks per day");

    fireEvent.change(input, { target: { value: "1e2" } });
    fireEvent.blur(input);

    await waitFor(() =>
      expect(updateConfig).toHaveBeenCalledWith({
        configId: config._id,
        maxTasksPerDay: 100,
      })
    );
  });

  it("rejects decimal task limits instead of truncating them", async () => {
    const updateConfig = vi.fn(() => Promise.resolve(null));
    mutationHandlers.set("autopilot.config.updateConfig", updateConfig);

    await renderSettingsPage();
    const input = screen.getByLabelText("Maximum tasks per day");

    fireEvent.change(input, { target: { value: "1.9" } });
    fireEvent.blur(input);

    await waitFor(() => expect(input).toHaveValue(5));
    expect(updateConfig).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith(
      "Tasks per day must be a whole number of at least 1"
    );
  });

  it("passes the backend reset scope into the danger zone", async () => {
    await renderSettingsPage();

    expect(mockUseQuery).toHaveBeenCalledWith(
      "autopilot.routines.getResetScope",
      {}
    );
    expect(mockDangerZoneRender).toHaveBeenCalledWith(
      expect.objectContaining({ resetScope })
    );
  });

  it("rolls back edited limits when saving fails", async () => {
    const updateConfig = vi.fn(() => Promise.reject(new Error("Save failed")));
    mutationHandlers.set("autopilot.config.updateConfig", updateConfig);

    await renderSettingsPage();
    const input = screen.getByLabelText("Maximum tasks per day");

    fireEvent.change(input, { target: { value: "8" } });
    fireEvent.blur(input);

    await waitFor(() => expect(input).toHaveValue(5));
    expect(updateConfig).toHaveBeenCalledWith({
      configId: config._id,
      maxTasksPerDay: 8,
    });
    expect(mockToastError).toHaveBeenCalledWith("Save failed");
  });
});
