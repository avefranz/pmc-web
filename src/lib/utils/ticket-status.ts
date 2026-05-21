import { TicketKind, TicketPriority } from "../types/enums";

export function ticketStatusColor(status: string): string {
  switch (status) {
    case "Draft":
      return "bg-gray-100 text-gray-600";
    case "Reported":
      return "bg-blue-100 text-blue-700";
    case "PendingApproval":
    case "Pending":
      return "bg-amber-100 text-amber-700";
    case "InProgress":
    case "Approved":
      return "bg-indigo-100 text-indigo-700";
    case "Blocked":
    case "Rejected":
      return "bg-red-100 text-red-700";
    case "Verified":
    case "Completed":
      return "bg-teal-100 text-teal-700";
    case "Closed":
    case "Cancelled":
    case "Canceled":
      return "bg-gray-100 text-gray-500";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export function ticketPriorityColor(priority: TicketPriority): string {
  switch (priority) {
    case TicketPriority.Urgent:
      return "bg-red-100 text-red-700";
    case TicketPriority.High:
      return "bg-orange-100 text-orange-700";
    case TicketPriority.Normal:
      return "bg-blue-100 text-blue-700";
    case TicketPriority.Low:
      return "bg-gray-100 text-gray-500";
  }
}

export function ticketKindIcon(kind: TicketKind): string {
  switch (kind) {
    case TicketKind.Incident:
      return "🔥";
    case TicketKind.WorkOrder:
      return "🔧";
    case TicketKind.Expense:
      return "💸";
    case TicketKind.Checklist:
      return "✅";
  }
}

export function ticketKindLabel(kind: TicketKind): string {
  switch (kind) {
    case TicketKind.Incident:
      return "Incident";
    case TicketKind.WorkOrder:
      return "Work Order";
    case TicketKind.Expense:
      return "Expense";
    case TicketKind.Checklist:
      return "Checklist";
  }
}

export function priorityLabel(p: TicketPriority): string {
  return p;
}

// Tenant-facing labels for raw backend ticket statuses. The host UI uses richer
// labels of its own — these are the subset that makes sense to a renter.
const TENANT_TICKET_STATUS_LABELS: Record<string, string> = {
  Draft: "Drafting",
  Reported: "Reported",
  Triaging: "Under review",
  Quoted: "Quote received",
  PendingApproval: "Pending approval",
  Approved: "Approved",
  InProgress: "In progress",
  Blocked: "Blocked",
  Verified: "Marked fixed",
  Closed: "Closed",
  Completed: "Closed",
  Reopened: "Re-opened",
  Cancelled: "Cancelled",
  Canceled: "Cancelled",
  Pending: "Pending",
  Rejected: "Rejected",
};

export function tenantTicketStatusLabel(status: string): string {
  return TENANT_TICKET_STATUS_LABELS[status] ?? status;
}
