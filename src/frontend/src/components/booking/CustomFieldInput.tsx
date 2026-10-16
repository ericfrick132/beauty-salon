import React from 'react';
import { Checkbox, FormControl, FormControlLabel, FormHelperText, MenuItem } from '@mui/material';
import TextField from '../common/TextField';
import { FormFieldType } from '../../services/bookingExtrasApi';

export interface CustomFieldLike {
  id: string;
  label: string;
  fieldType: FormFieldType;
  required: boolean;
  placeholder?: string | null;
  options: string[];
}

interface Props {
  field: CustomFieldLike;
  /** Siempre string; la casilla usa "true" / "false" (lo que espera el backend). */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Un campo personalizado del formulario de reserva. Lo usan la página pública y la vista previa del panel,
 * así el negocio ve exactamente lo que va a ver su cliente.
 */
const CustomFieldInput: React.FC<Props> = ({ field, value, onChange, onBlur, error, disabled }) => {
  const label = field.label || 'Campo sin nombre';

  if (field.fieldType === 'checkbox') {
    return (
      <FormControl error={!!error} disabled={disabled}>
        <FormControlLabel
          control={
            <Checkbox
              checked={value === 'true'}
              onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
              onBlur={onBlur}
            />
          }
          label={`${label}${field.required ? ' *' : ''}`}
        />
        {error && <FormHelperText>{error}</FormHelperText>}
      </FormControl>
    );
  }

  if (field.fieldType === 'select') {
    return (
      <TextField
        select
        fullWidth
        label={label}
        required={field.required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        error={!!error}
        helperText={error || field.placeholder || undefined}
        disabled={disabled}
      >
        {!field.required && (
          <MenuItem value="">
            <em>Sin elegir</em>
          </MenuItem>
        )}
        {field.options.map((opt) => (
          <MenuItem key={opt} value={opt}>
            {opt}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  return (
    <TextField
      fullWidth
      label={label}
      required={field.required}
      type={field.fieldType === 'number' ? 'number' : 'text'}
      multiline={field.fieldType === 'textarea'}
      rows={field.fieldType === 'textarea' ? 3 : undefined}
      inputProps={field.fieldType === 'number' ? { inputMode: 'decimal' } : { maxLength: 1000 }}
      placeholder={field.placeholder || undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      error={!!error}
      helperText={error}
      disabled={disabled}
    />
  );
};

export default CustomFieldInput;
