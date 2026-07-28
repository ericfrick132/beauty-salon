namespace BookingPro.API.Models.Common
{
    /// <summary>
    /// Motivos por los que se rechaza una reserva.
    ///
    /// El <c>Message</c> de la validación está escrito para el panel (el dueño del
    /// negocio): dice exactamente qué regla falló. Ese texto no siempre sirve para el
    /// cliente final, que no conoce la configuración del negocio y solo necesita saber
    /// qué hacer ahora. Por eso el sitio público traduce el motivo con
    /// <see cref="ToCustomerMessage"/> en vez de reenviar el mensaje interno.
    /// </summary>
    public static class BookingFailureReasons
    {
        public const string BusinessClosed = "business_closed";
        public const string OutsideBusinessHours = "outside_business_hours";
        public const string EmployeeDayOff = "employee_day_off";
        public const string EmployeeOutsideShift = "employee_outside_shift";
        public const string EmployeeBlocked = "employee_blocked";
        public const string SlotTaken = "slot_taken";
        public const string MinimumGap = "minimum_gap";

        /// <summary>
        /// Texto para el cliente final. Nunca expone configuración interna del negocio
        /// (bloqueos, régimen horario, otras reservas ni con quién son).
        /// </summary>
        public static string ToCustomerMessage(string? reason) => reason switch
        {
            BusinessClosed => "Ese día no atendemos. Elegí otra fecha.",
            OutsideBusinessHours => "Ese horario está fuera de nuestro horario de atención.",
            EmployeeDayOff => "El profesional no atiende ese día. Elegí otra fecha.",
            EmployeeOutsideShift => "El profesional no atiende en ese horario.",
            // Un bloqueo es agenda interna: para el cliente es, simplemente, ocupado.
            EmployeeBlocked => "Ese horario ya no está disponible.",
            SlotTaken => "Ese horario se acaba de ocupar.",
            MinimumGap => "Ese horario queda muy pegado a otro turno.",
            _ => "Ese horario no está disponible.",
        };
    }
}
