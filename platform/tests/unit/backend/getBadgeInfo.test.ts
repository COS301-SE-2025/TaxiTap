import { getBadgeInfo } from "../../../convex/functions/badges/badgeService";

describe("getBadgeInfo", () => {
  it("returns correct badge info for trusted_payer", () => {
    const result = getBadgeInfo("trusted_payer");

    expect(result).toEqual({
      badgeType: "trusted_payer",
      name: "Trusted Payer",
      description: "Paid for 100% of rides",
      icon: "shield-check",
      color: "#10B981",
    });
  });

  it("returns correct badge info for frequent_rider", () => {
    const result = getBadgeInfo("frequent_rider");

    expect(result).toEqual({
      badgeType: "frequent_rider",
      name: "Frequent Rider",
      description: "Completed 10+ rides",
      icon: "star",
      color: "#3B82F6",
    });
  });

  it("returns correct badge info for loyal_member", () => {
    const result = getBadgeInfo("loyal_member");

    expect(result).toEqual({
      badgeType: "loyal_member",
      name: "Loyal Member",
      description: "7-day ride streak",
      icon: "heart",
      color: "#8B5CF6",
    });
  });

  it("returns correct badge info for marathon_driver", () => {
    const result = getBadgeInfo("marathon_driver");

    expect(result).toEqual({
      badgeType: "marathon_driver",
      name: "Marathon Driver",
      description: "Completed at least one ride",
      icon: "trophy",
      color: "#FF6B35",
    });
  });

  it("returns correct badge info for top_earner", () => {
    const result = getBadgeInfo("top_earner");

    expect(result).toEqual({
      badgeType: "top_earner",
      name: "Top Earner",
      description: "Top 10 driver by earnings",
      icon: "diamond",
      color: "#FFD700",
    });
  });

  it("returns null for invalid badge type", () => {
    const result = getBadgeInfo("invalid_badge");

    expect(result).toBeNull();
  });

  it("returns null for empty badge type", () => {
    const result = getBadgeInfo("");

    expect(result).toBeNull();
  });

  it("returns null for undefined badge type", () => {
    const result = getBadgeInfo(undefined as any);

    expect(result).toBeNull();
  });

  it("returns null for null badge type", () => {
    const result = getBadgeInfo(null as any);

    expect(result).toBeNull();
  });
});
