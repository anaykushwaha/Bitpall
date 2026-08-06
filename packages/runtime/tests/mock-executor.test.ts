import { describe, expect, it } from "vitest";
import { MockResponseExecutor } from "../src/index.js";

describe("MockResponseExecutor", () => {
  const context = {
    workspaceName: "corporate_network",
    ruleName: "suspicious_encryption_chain",
    eventIds: ["e1"],
    simulated: true as const,
  };

  it("records simulated isolation without touching real systems", () => {
    const executor = new MockResponseExecutor();
    const result = executor.execute(
      {
        type: "isolate_endpoint",
        target: "finance_laptop",
        ruleName: context.ruleName,
        workspaceName: context.workspaceName,
      },
      context,
    );
    expect(result.status).toBe("simulated");
    expect(executor.getAuditLog()).toHaveLength(1);
  });

  it("keeps approval-gated actions pending", () => {
    const executor = new MockResponseExecutor();
    const result = executor.execute(
      {
        type: "terminate_process",
        requiresApproval: true,
        ruleName: context.ruleName,
        workspaceName: context.workspaceName,
      },
      context,
    );
    expect(result.status).toBe("pending_approval");
    expect(executor.getPendingApprovals()).toHaveLength(1);
  });

  it("records rollback actions separately", () => {
    const executor = new MockResponseExecutor();
    const result = executor.execute(
      {
        type: "reconnect_endpoint",
        target: "finance_laptop",
        ruleName: context.ruleName,
        workspaceName: context.workspaceName,
      },
      context,
    );
    expect(result.status).toBe("recorded_rollback");
    expect(executor.getRollbackActions()).toHaveLength(1);
  });
});
