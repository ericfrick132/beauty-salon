export enum TenantStatus {
  Trial = 'trial',
  Active = 'active',
  Suspended = 'suspended',
  Cancelled = 'cancelled',
}

export enum UserRole {
  SuperAdmin = 'super_admin',
  Admin = 'admin',
  User = 'user',
}

export enum BookingStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Completed = 'completed',
  Cancelled = 'cancelled',
  NoShow = 'no_show',
}

export enum PaymentStatus {
  Pending = 'pending',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Refunded = 'refunded',
}

export enum SubscriptionStatus {
  Pending = 'pending',
  Active = 'active',
  Paused = 'paused',
  Cancelled = 'cancelled',
  Expired = 'expired',
}

export enum InvitationStatus {
  Pending = 'pending',
  Used = 'used',
  Expired = 'expired',
  Cancelled = 'cancelled',
}

export enum PaymentTransactionStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
  Refunded = 'refunded',
}

export enum SubscriptionPaymentStatus {
  Approved = 'approved',
  Pending = 'pending',
  Rejected = 'rejected',
  Refunded = 'refunded',
}