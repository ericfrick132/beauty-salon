namespace BookingPro.API.Models.Common
{
    public static class MercadoPagoText
    {
        /// <summary>
        /// Mercado Pago rechaza el campo "reason" de /preapproval (y de los planes de
        /// suscripción) con 400 "reason has more than 60 characters" si supera los 60
        /// caracteres. Como ese texto se arma concatenando el nombre del plan y, en
        /// algunos casos, el nombre del negocio del tenant, cualquier combinación
        /// medianamente larga lo superaba y bloqueaba la suscripción entera. Recorta
        /// respetando ese límite sin partir un par surrogate (emoji) a la mitad.
        /// </summary>
        public static string TruncateForReason(string text, int maxLength = 60)
        {
            if (string.IsNullOrEmpty(text) || text.Length <= maxLength)
                return text;

            var cut = maxLength - 1; // deja lugar para el "…"
            if (cut > 0 && char.IsHighSurrogate(text[cut - 1]))
                cut--;

            return text.Substring(0, cut) + "…";
        }
    }
}
