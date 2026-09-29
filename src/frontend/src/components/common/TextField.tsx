import React, { useEffect, useRef, useState } from 'react';
import { TextField as MuiTextField, TextFieldProps } from '@mui/material';

// "03" -> "3", "00" -> "0", "-05" -> "-5"; deja intactos "0.5" y "".
const stripLeadingZeros = (raw: string) => raw.replace(/^(-?)0+(?=\d)/, '$1');

const toDraft = (value: unknown) => (value === null || value === undefined ? '' : String(value));

/**
 * Reemplazo directo de TextField de MUI. Para type="number" arregla el input controlado
 * con valor numérico: el 0 no se podía borrar (onChange volvía a poner 0) y al tipear
 * quedaba "03". Mientras tiene foco muestra lo que el usuario escribe; al salir se
 * alinea con el valor que guardó el componente padre.
 */
const TextField = React.forwardRef<HTMLDivElement, TextFieldProps>((props, ref) => {
  const { type, value, onChange, onFocus, onBlur } = props;
  // Solo inputs numéricos controlados; los no controlados (defaultValue, react-hook-form) no tienen el problema
  const isNumber = type === 'number' && value !== undefined;
  const [draft, setDraft] = useState(() => toDraft(value));
  const focused = useRef(false);

  useEffect(() => {
    if (isNumber && !focused.current) setDraft(toDraft(value));
  }, [isNumber, value]);

  if (!isNumber) return <MuiTextField ref={ref} {...props} />;

  return (
    <MuiTextField
      ref={ref}
      {...props}
      value={draft}
      onFocus={(e) => {
        focused.current = true;
        // Tipear reemplaza el valor actual en lugar de concatenarse al 0
        (e.target as HTMLInputElement).select?.();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.current = false;
        setDraft(toDraft(value));
        onBlur?.(e);
      }}
      onChange={(e) => {
        const clean = stripLeadingZeros(e.target.value);
        if (clean !== e.target.value) e.target.value = clean;
        setDraft(clean);
        onChange?.(e);
      }}
    />
  );
});

TextField.displayName = 'TextField';

export default TextField;
