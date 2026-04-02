import PropTypes from 'prop-types'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material'

/**
 * Render a generic form dialog for create and edit flows.
 *
 * @param {object} props
 * @returns {JSX.Element}
 */
function EntityDialog({
  open,
  title,
  fields,
  values,
  fieldErrors,
  error,
  busy,
  submitLabel,
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
      <DialogTitle sx={{ px: 3, pb: 1.25, pt: 3 }}>{title}</DialogTitle>
      <DialogContent sx={{ px: 3, pb: 1.5, pt: '24px !important' }}>
        <Stack spacing={2}>
          {error && (
            <FormHelperText error sx={{ m: 0 }}>
              {error}
            </FormHelperText>
          )}
          {fields.map((field, index) => {
            const value = field.type === 'multiselect' ? values[field.name] || [] : values[field.name] || ''
            const hasFieldError = Boolean(fieldErrors[field.name])
            const helperText = fieldErrors[field.name] || field.helperText
            const fieldId = `entity-dialog-${field.name}`
            const labelId = `${fieldId}-label`
            const fieldSpacingSx = index === 0 ? { mt: 0.5 } : undefined

            if (field.type === 'select' || field.type === 'multiselect') {
              return (
                <FormControl error={hasFieldError} fullWidth key={field.name} sx={fieldSpacingSx}>
                  <InputLabel id={labelId}>{field.label}</InputLabel>
                  <Select
                    id={fieldId}
                    labelId={labelId}
                    label={field.label}
                    multiple={field.type === 'multiselect'}
                    value={value}
                    onChange={(event) => onChange(field.name, event.target.value)}
                  >
                    {(field.options || []).map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {helperText && <FormHelperText>{helperText}</FormHelperText>}
                </FormControl>
              )
            }

            return (
              <TextField
                fullWidth
                key={field.name}
                type={field.type === 'email' ? 'email' : 'text'}
                multiline={field.type === 'textarea'}
                minRows={field.type === 'textarea' ? 3 : undefined}
                sx={fieldSpacingSx}
                label={field.label}
                value={value}
                onChange={(event) => onChange(field.name, event.target.value)}
                error={hasFieldError}
                helperText={helperText}
              />
            )
          })}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit} variant="contained">
          {busy ? 'Saving...' : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

EntityDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  fields: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      type: PropTypes.string,
      helperText: PropTypes.string,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.string.isRequired,
          label: PropTypes.string.isRequired,
        }),
      ),
    }),
  ).isRequired,
  values: PropTypes.object.isRequired,
  fieldErrors: PropTypes.object,
  error: PropTypes.string,
  busy: PropTypes.bool,
  submitLabel: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
}

EntityDialog.defaultProps = {
  fieldErrors: {},
  error: '',
  busy: false,
  submitLabel: 'Save',
}

export default EntityDialog
