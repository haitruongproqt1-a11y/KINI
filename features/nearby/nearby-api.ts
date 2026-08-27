import { apiCall } from "@/lib/_core/api";

export type NearbyGender = "male" | "female" | "other" | "prefer_not";
export type NearbyStatus = "single" | "dating" | "married" | "complicated" | "prefer_not";
export type HideDuration = "24h" | "7d" | "permanent";

export type NearbyProfile = {
  kiniUserId: number; name: string; avatar: string | null; avatarColor: string;
  gender: NearbyGender | null; status: NearbyStatus | null; province: string | null;
  birthYear: number | null; bio: string | null; job: string | null; lat: number | null; lng: number | null;
  isDiscoverable: boolean; hiddenUntil: string | null; setupComplete: boolean;
};
export type NearbyUser = { userId: number; name: string; avatar: string | null; avatarColor: string; gender: NearbyGender | null; status: NearbyStatus | null; province: string | null; birthYear: number | null; age: number | null; bio: string | null; job: string | null; distanceKm: number; relation: "none" | "incoming" | "outgoing" | "friends"; };
const json = (body: Record<string, unknown>) => ({ method: "POST", body: JSON.stringify(body) });

export const nearbyApi = {
  me: () => apiCall<NearbyProfile>("/api/profile/me"),
  saveProfile: (body: { gender: NearbyGender | null; status: NearbyStatus | null; province: string; birthYear: number | null; bio: string; job: string }) => apiCall<NearbyProfile>("/api/profile/save", json(body)),
  updateLocation: (lat: number, lng: number) => apiCall<{ updated: true }>("/api/location/update", json({ lat, lng })),
  toggle: (isDiscoverable: boolean, duration?: HideDuration) => apiCall<NearbyProfile>("/api/discovery/toggle", json({ is_discoverable: isDiscoverable, duration })),
  list: async (input: { lat: number; lng: number; radius: number; gender?: NearbyGender; province?: string; ageFrom?: number; ageTo?: number; status?: NearbyStatus; q?: string; sort?: "near" | "far"; page?: number }) => {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key === "ageFrom" ? "age_from" : key === "ageTo" ? "age_to" : key, String(value)); });
    return apiCall<{ users: NearbyUser[]; page: number; total: number; radius: number }>(`/api/users/nearby?${params.toString()}`);
  },
};
