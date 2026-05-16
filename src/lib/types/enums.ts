export enum RentalType {
  LongTerm = "LongTerm",
  ShortTerm = "ShortTerm",
}

export enum ListingStatus {
  Draft = "Draft",
  Active = "Active",
  Superseded = "Superseded",
  Archived = "Archived",
}

export enum UserRole {
  Admin = "Admin",
  Landlord = "Landlord",
  Tenant = "Tenant",
}

export enum TicketStatus {
  Draft = "Draft",
  Reported = "Reported",
  PendingApproval = "PendingApproval",
  InProgress = "InProgress",
  Blocked = "Blocked",
  Verified = "Verified",
  Closed = "Closed",
  Cancelled = "Cancelled",
  // Legacy aliases
  Pending = "Pending",
  Approved = "Approved",
  Rejected = "Rejected",
  Completed = "Completed",
  Canceled = "Canceled",
}

export enum TicketKind {
  Incident = "Incident",
  WorkOrder = "WorkOrder",
  Expense = "Expense",
  Checklist = "Checklist",
}

export enum TicketType {
  Maintenance = "Maintenance",
  Cleaning = "Cleaning",
  Utilities = "Utilities",
  Complaint = "Complaint",
  Request = "Request",
  Other = "Other",
}

export enum TicketPriority {
  Low = "Low",
  Normal = "Normal",
  High = "High",
  Urgent = "Urgent",
}

export enum TicketEventType {
  Created = "Created",
  StatusChanged = "StatusChanged",
  AssigneeChanged = "AssigneeChanged",
  PriorityChanged = "PriorityChanged",
  CostUpdated = "CostUpdated",
  MediaAdded = "MediaAdded",
  MessagePosted = "MessagePosted",
  Reopened = "Reopened",
  ChildSpawned = "ChildSpawned",
  ChecklistItemToggled = "ChecklistItemToggled",
  FieldUpdated = "FieldUpdated",
}

export enum MessageVisibility {
  Public = "Public",
  Internal = "Internal",
}

export enum BookingStatus {
  PendingPayment = "PendingPayment",
  Confirmed = "Confirmed",
  Active = "Active",
  Completed = "Completed",
  Cancelled = "Cancelled",
  Expired = "Expired",
}

export enum InvoiceStatus {
  Pending = "Pending",
  Paid = "Paid",
}

export enum InvoiceType {
  Rent = "Rent",
  Deposit = "Deposit",
  Utilities = "Utilities",
  Cleaning = "Cleaning",
  Damage = "Damage",
  Other = "Other",
}

export enum PaymentMethod {
  Cash = "Cash",
  PromptPay = "PromptPay",
  BankTransfer = "BankTransfer",
}

export enum InviteType {
  TenantInvite = "TenantInvite",
  OwnerInvite = "OwnerInvite",
  ManagerInvite = "ManagerInvite",
}

export enum VisaType {
  VisaExempt = "VisaExempt",
  Tourist = "Tourist",
  NonImmigrantB = "NonImmigrantB",
  NonImmigrantO = "NonImmigrantO",
  NonImmigrantOA = "NonImmigrantOA",
  Education = "Education",
  SpecialTourist = "SpecialTourist",
  Other = "Other",
}

export enum UtilityType {
  Electricity = "Electricity",
  Water = "Water",
  Internet = "Internet",
  CommonAreaFee = "CommonAreaFee",
  Other = "Other",
}

export enum AssetOccupancyStatus {
  Vacant = "Vacant",
  Occupied = "Occupied",
  ActionRequired = "ActionRequired",
}

export enum CalendarStatus {
  Available = "Available",
  Booked = "Booked",
  Blocked = "Blocked",
  Maintenance = "Maintenance",
}

export enum Tm30Status {
  Pending = "Pending",
  Filed = "Filed",
}
