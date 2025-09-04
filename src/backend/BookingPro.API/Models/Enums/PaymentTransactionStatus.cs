namespace BookingPro.API.Models.Enums
{
    public enum PaymentTransactionStatus
    {
        Pending,
        Processing,
        Approved,
        Completed,
        Paid,
        Rejected,
        Failed,
        Cancelled,
        Refunded
    }

    public static class PaymentTransactionStatusExtensions
    {
        public static bool IsSuccessful(this PaymentTransactionStatus status)
        {
            return status == PaymentTransactionStatus.Approved ||
                   status == PaymentTransactionStatus.Completed ||
                   status == PaymentTransactionStatus.Paid;
        }

        public static bool IsFinal(this PaymentTransactionStatus status)
        {
            return status == PaymentTransactionStatus.Approved ||
                   status == PaymentTransactionStatus.Completed ||
                   status == PaymentTransactionStatus.Paid ||
                   status == PaymentTransactionStatus.Rejected ||
                   status == PaymentTransactionStatus.Failed ||
                   status == PaymentTransactionStatus.Cancelled ||
                   status == PaymentTransactionStatus.Refunded;
        }
    }
}