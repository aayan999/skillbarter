// Shared domain types, named after the Figure B.2 class diagram.

export type User = {
  id: number;
  name: string;
  email: string;
  collegeId: string;
  credits: number;
  avgRating: number | null;
  warnings: number;
  isAdmin: boolean;
  createdAt: string;
};

export type SkillOffer = {
  id: number;
  providerId: number;
  providerName?: string;
  providerRating?: number | null;
  skillName: string;
  category: string;
  description: string;
  durationHours: number;
  status: "active" | "deactivated";
  createdAt: string;
};

export type SkillRequest = {
  id: number;
  seekerId: number;
  seekerName?: string;
  skillNeeded: string;
  category: string;
  description: string;
  status: "open" | "closed";
  createdAt: string;
};

export type SessionStatus =
  | "requested"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "completed";

export type Session = {
  id: number;
  offerId: number | null;
  requestId: number | null;
  seekerId: number;
  providerId: number;
  seekerName?: string;
  providerName?: string;
  skillLabel?: string;
  scheduledAt: string;
  status: SessionStatus;
  credits: number;
  createdAt: string;
};

export type CreditTransaction = {
  id: number;
  userId: number;
  sessionId: number | null;
  amount: number;
  type: "registration_bonus" | "reserve" | "release" | "earn" | "admin_reversal";
  balanceAfter: number;
  note: string;
  createdAt: string;
};

export type ChatMessage = {
  id: number;
  sessionId: number;
  senderId: number;
  senderName?: string;
  content: string;
  createdAt: string;
};

export type SessionResource = {
  id: number;
  sessionId: number;
  uploaderId: number;
  uploaderName?: string;
  fileType: "file" | "video";
  fileName: string;
  fileUrl: string;
  byteSize: number;
  createdAt: string;
};

export type Rating = {
  id: number;
  sessionId: number;
  raterId: number;
  rateeId: number;
  raterName?: string;
  score: number;
  review: string;
  createdAt: string;
};

export type Dispute = {
  id: number;
  sessionId: number;
  reporterId: number;
  reporterName?: string;
  reason: string;
  description: string;
  status: "open" | "resolved";
  resolution: string | null;
  adminNotes: string;
  createdAt: string;
  resolvedAt: string | null;
};

export type AppNotification = {
  id: number;
  userId: number;
  type: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
};

export const SKILL_CATEGORIES = [
  "Programming",
  "Design",
  "Academics",
  "Communication",
  "Productivity",
  "General",
] as const;
