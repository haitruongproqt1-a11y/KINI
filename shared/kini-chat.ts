export const deliveryStatuses = ["sent", "delivered", "read"] as const;
export type DeliveryStatus = (typeof deliveryStatuses)[number];

const rank: Record<DeliveryStatus, number> = { sent: 1, delivered: 2, read: 3 };

export function deliveryLabel(status: DeliveryStatus): string {
  return status === "sent" ? "Đã gửi" : status === "delivered" ? "Đã nhận" : "Đã xem";
}

export function highestDeliveryStatus(statuses: DeliveryStatus[]): DeliveryStatus {
  return statuses.reduce<DeliveryStatus>((current, candidate) => rank[candidate] > rank[current] ? candidate : current, "sent");
}

export function isKiniUsernameValid(username: string): boolean {
  return /^[a-zA-Z0-9._-]{3,64}$/.test(username);
}
