import type { ConsultRequest, ConsultResult } from "@/lib/schemas";

export type HistoryEntry = {
  id: string;
  createdAt: number;
  request: ConsultRequest;
  result: ConsultResult;
};

const KEY = "law-consult:history";
const MAX_ENTRIES = 20;

export function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}
