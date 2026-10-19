import React from 'react';
import { Navigate } from 'react-router-dom';
import { checkoutPath, PlanGate, planForGate, usePlanGates } from '../../utils/planGates';

/**
 * Una pantalla de función paga que el plan no incluye: directo al checkout con el plan mínimo que la
 * desbloquea resaltado (?highlight=…&from=<gate>). Reemplaza al viejo paywall con vista previa borrosa: el
 * dueño pidió que todo lo bloqueado lleve a pagar, sin pantalla intermedia.
 */
const PlanCheckoutRedirect: React.FC<{ gate: PlanGate }> = ({ gate }) => {
  const { plans, currentCode } = usePlanGates();
  return <Navigate to={checkoutPath(gate, planForGate(gate, plans, currentCode)?.code)} replace />;
};

export default PlanCheckoutRedirect;
