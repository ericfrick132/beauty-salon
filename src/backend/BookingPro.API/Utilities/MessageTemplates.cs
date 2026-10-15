namespace BookingPro.API.Utilities
{
    /// <summary>
    /// Plantillas de WhatsApp al cliente final por país. Los negocios guardan la plantilla en
    /// TenantMessagingSettings y el default de fábrica está en voseo: si un negocio de México o España nunca
    /// la cambió (sigue siendo uno de los textos de fábrica, o no tiene), se usa la versión en tú con "cita".
    /// Una plantilla editada por el negocio se respeta tal cual. Argentina y Uruguay no cambian.
    /// </summary>
    public static class MessageTemplates
    {
        public const string ReminderVoseo = "Hola {customer_name}! Te recordamos tu turno para {service_name} el {date} a las {time}.";
        public const string ReminderVoseoLong = "Hola {customer_name}! Te recordamos tu turno para {service_name} el {date} a las {time}. Si no podés asistir, avisanos respondiendo este mensaje.";
        public const string ReminderTu = "¡Hola {customer_name}! Te recordamos tu cita para {service_name} el {date} a las {time}. Si no puedes asistir, avísanos respondiendo a este mensaje.";

        public const string ConfirmationVoseo = "Hola {customer_name}! Te escribimos de {business_name} por tu turno de {service_name} el {date} a las {time}.";
        public const string ConfirmationTu = "¡Hola {customer_name}! Te escribimos de {business_name} por tu cita de {service_name} el {date} a las {time}.";

        /// <summary>Plantilla del recordatorio: la del negocio, o el default (el viejo corto si no hay ninguna).</summary>
        public static string Reminder(string? stored, Wording w)
        {
            if (w.UsesTu && (string.IsNullOrWhiteSpace(stored) || stored == ReminderVoseo || stored == ReminderVoseoLong))
                return ReminderTu;
            return stored ?? ReminderVoseo;
        }

        public static string ConfirmationRequest(string? stored, Wording w)
        {
            if (w.UsesTu && (string.IsNullOrWhiteSpace(stored) || stored == ConfirmationVoseo))
                return ConfirmationTu;
            return stored ?? ConfirmationVoseo;
        }

        /// <summary>Lo que se agrega al pedido de confirmación del bot.</summary>
        public static string ConfirmationInstructions(Wording w) => w.T(
            "\n\nRespondé *1* para confirmar tu turno ✅ o *2* para cancelarlo ❌",
            "\n\nResponde *1* para confirmar tu cita ✅ o *2* para cancelarla ❌");
    }
}
