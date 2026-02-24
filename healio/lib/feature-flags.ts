export type SubscriptionPlan = "STARTER" | "GROWTH" | "PRO";
export type SubscriptionFeature =
  | "PUBLIC_BOOKING"
  | "SMS_REMINDERS"
  | "AUDIT_LOGS"
  | "ANALYTICS_DASHBOARD"
  | "TEAM_MEMBERS"
  | "AUTOMATION_CRONS";

const featureMatrix: Record<SubscriptionPlan, Record<SubscriptionFeature, boolean>> = {
  STARTER: {
    PUBLIC_BOOKING: true,
    SMS_REMINDERS: false,
    AUDIT_LOGS: false,
    ANALYTICS_DASHBOARD: false,
    TEAM_MEMBERS: false,
    AUTOMATION_CRONS: false,
  },
  GROWTH: {
    PUBLIC_BOOKING: true,
    SMS_REMINDERS: true,
    AUDIT_LOGS: false,
    ANALYTICS_DASHBOARD: true,
    TEAM_MEMBERS: true,
    AUTOMATION_CRONS: true,
  },
  PRO: {
    PUBLIC_BOOKING: true,
    SMS_REMINDERS: true,
    AUDIT_LOGS: true,
    ANALYTICS_DASHBOARD: true,
    TEAM_MEMBERS: true,
    AUTOMATION_CRONS: true,
  },
};

export function isFeatureEnabledForPlan(plan: SubscriptionPlan, feature: SubscriptionFeature) {
  return featureMatrix[plan][feature];
}

export function listPlanFeatures(plan: SubscriptionPlan) {
  return Object.entries(featureMatrix[plan]).map(([feature, enabled]) => ({
    feature: feature as SubscriptionFeature,
    enabled,
  }));
}
